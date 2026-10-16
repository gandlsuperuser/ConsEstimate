import UIKit
import Vision

struct OCRScanResult {
    var rawText: String
    var detectedVendor: String?
    var detectedAmount: Double?
    var detectedInvoiceNumber: String?
    var detectedDate: Date?
    var confidence: String // "high", "medium", "low"
    var suggestedCategory: ExpenseCategory?
    var extractedNotes: String
}

final class ReceiptOCRService {
    static let shared = ReceiptOCRService()
    
    private init() {}
    
    func scanReceipt(from image: UIImage) async throws -> OCRScanResult {
        guard let cgImage = image.cgImage else {
            throw NSError(domain: "ReceiptOCRService", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to read image buffer"])
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: OCRScanResult(
                        rawText: "",
                        detectedVendor: nil,
                        detectedAmount: nil,
                        detectedInvoiceNumber: nil,
                        detectedDate: nil,
                        confidence: "low",
                        suggestedCategory: nil,
                        extractedNotes: ""
                    ))
                    return
                }
                
                let lines: [String] = observations.compactMap { obs in
                    obs.topCandidates(1).first?.string
                }
                
                let result = self.parseExtractedLines(lines)
                continuation.resume(returning: result)
            }
            
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            
            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
    
    private func parseExtractedLines(_ lines: [String]) -> OCRScanResult {
        let fullText = lines.joined(separator: "\n")
        var vendor: String? = nil
        var amount: Double? = nil
        var invoiceNum: String? = nil
        var detectedDate: Date? = nil
        var suggestedCategory: ExpenseCategory? = nil
        
        // 1. Detect Vendor from known vendors or top lines
        let lowerText = fullText.lowercased()
        for known in AppConfig.knownVendors {
            if lowerText.contains(known.lowercased()) {
                vendor = known
                break
            }
        }
        
        // If not found in known list, take the first non-empty, prominent line that isn't "INVOICE" or "RECEIPT"
        if vendor == nil {
            for line in lines.prefix(5) {
                let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
                let upper = trimmed.uppercased()
                if !trimmed.isEmpty && upper != "INVOICE" && upper != "RECEIPT" && upper != "BILL" && upper != "CASH SALE" && trimmed.count > 2 {
                    vendor = trimmed
                    break
                }
            }
        }
        
        // 2. Detect Category hints
        if lowerText.contains("hvac") || lowerText.contains("duct") || lowerText.contains("air condition") || lowerText.contains("mhac") {
            suggestedCategory = .hvac
        } else if lowerText.contains("electric") || lowerText.contains("wire") || lowerText.contains("panel") || lowerText.contains("breaker") {
            suggestedCategory = .electrical
        } else if lowerText.contains("gypsum") || lowerText.contains("drywall") || lowerText.contains("stud") || lowerText.contains("framing") {
            suggestedCategory = .framing
        } else if lowerText.contains("plumb") || lowerText.contains("pipe") || lowerText.contains("drain") {
            suggestedCategory = .plumbing
        } else if lowerText.contains("potty") || lowerText.contains("toilet") || lowerText.contains("rental") || lowerText.contains("lift") {
            suggestedCategory = .equipment
        } else if lowerText.contains("demo") || lowerText.contains("trash") || lowerText.contains("dumpster") {
            suggestedCategory = .demo
        } else if lowerText.contains("payroll") || lowerText.contains("labor") {
            suggestedCategory = .labor
        }
        
        // 3. Detect Invoice Number (e.g. Invoice #: 10654, Inv # 3157832, etc.)
        let invoicePatterns = [
            #"(?i)invoice\s*#?\s*:?\s*([A-Za-z0-9\-]+)"#,
            #"(?i)inv\s*#?\s*:?\s*([A-Za-z0-9\-]+)"#,
            #"(?i)order\s*#?\s*:?\s*([A-Za-z0-9\-]+)"#
        ]
        
        for pattern in invoicePatterns {
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: fullText, range: NSRange(fullText.startIndex..., in: fullText)),
               let range = Range(match.range(at: 1), in: fullText) {
                let num = String(fullText[range]).trimmingCharacters(in: .whitespacesAndNewlines)
                if !num.isEmpty && num.lowercased() != "date" {
                    invoiceNum = num
                    break
                }
            }
        }
        
        // 4. Detect Amount (look for TOTAL, AMOUNT DUE, BALANCE, or highest currency amount)
        let totalPatterns = [
            #"(?i)total\s*:?\s*\$?\s*([0-9,]+\.[0-9]{2})"#,
            #"(?i)amount\s+due\s*:?\s*\$?\s*([0-9,]+\.[0-9]{2})"#,
            #"(?i)balance\s+due\s*:?\s*\$?\s*([0-9,]+\.[0-9]{2})"#,
            #"\$\s*([0-9,]+\.[0-9]{2})"#
        ]
        
        var candidateAmounts: [Double] = []
        for pattern in totalPatterns {
            if let regex = try? NSRegularExpression(pattern: pattern) {
                let matches = regex.matches(in: fullText, range: NSRange(fullText.startIndex..., in: fullText))
                for match in matches {
                    if let range = Range(match.range(at: 1), in: fullText) {
                        let str = String(fullText[range]).replacingOccurrences(of: ",", with: "")
                        if let val = Double(str), val > 0 {
                            candidateAmounts.append(val)
                        }
                    }
                }
            }
        }
        
        // If we found candidates, usually the total is the last or largest candidate
        if let total = candidateAmounts.last {
            amount = total
        }
        
        // 5. Detect Date (e.g. 10/16/26, 10/16/2026, 2026-10-16)
        let datePatterns = [
            #"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})"#,
            #"(\d{4})[/-](\d{1,2})[/-](\d{1,2})"#
        ]
        
        for pattern in datePatterns {
            if let regex = try? NSRegularExpression(pattern: pattern),
               let match = regex.firstMatch(in: fullText, range: NSRange(fullText.startIndex..., in: fullText)),
               let range = Range(match.range(at: 0), in: fullText) {
                let dateStr = String(fullText[range])
                let formatter = DateFormatter()
                formatter.locale = Locale(identifier: "en_US_POSIX")
                
                let formats = ["MM/dd/yy", "MM/dd/yyyy", "M/d/yy", "M/d/yyyy", "yyyy-MM-dd"]
                for f in formats {
                    formatter.dateFormat = f
                    if let parsed = formatter.date(from: dateStr) {
                        detectedDate = parsed
                        break
                    }
                }
                if detectedDate != nil { break }
            }
        }
        
        let confidence: String = (vendor != nil && amount != nil) ? "high" : (amount != nil ? "medium" : "low")
        
        var notesBuilder = [String]()
        if let inv = invoiceNum { notesBuilder.append("Inv #\(inv)") }
        if let ven = vendor { notesBuilder.append(ven) }
        let summaryLines = lines.prefix(8).joined(separator: " | ")
        if !summaryLines.isEmpty { notesBuilder.append(summaryLines) }
        
        return OCRScanResult(
            rawText: fullText,
            detectedVendor: vendor,
            detectedAmount: amount,
            detectedInvoiceNumber: invoiceNum,
            detectedDate: detectedDate,
            confidence: confidence,
            suggestedCategory: suggestedCategory,
            extractedNotes: notesBuilder.joined(separator: " • ")
        )
    }
}
