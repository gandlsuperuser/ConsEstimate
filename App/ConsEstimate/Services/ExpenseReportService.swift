import Foundation
import UIKit

final class ExpenseReportService {
    static let shared = ExpenseReportService()
    
    private init() {}
    
    // MARK: - CSV Generation
    func generateCSV(expenses: [Expense], projects: [Project]) throws -> URL {
        let projectDict = Dictionary(uniqueKeysWithValues: projects.map { ($0.id, $0.name) })
        
        var csvRows: [String] = []
        // Header
        csvRows.append("Date,Vendor,Category,Amount,Project,Status,Confidence,Receipt URL,Notes")
        
        let currencyFormatter = NumberFormatter()
        currencyFormatter.numberStyle = .currency
        currencyFormatter.locale = Locale(identifier: "en_US")
        
        for exp in expenses {
            let date = exp.expenseDate
            let vendor = escapeCSV(exp.vendor)
            let category = escapeCSV(exp.category)
            let amount = String(format: "%.2f", exp.amount)
            let projectName = escapeCSV(projectDict[exp.projectId] ?? "Conviva Jourdanton")
            let status = escapeCSV(exp.approvalStatus.title)
            let confidence = escapeCSV(exp.scanConfidence ?? "standard")
            let receipt = escapeCSV(exp.receiptUrl ?? "")
            let notes = escapeCSV(exp.cleanNotes)
            
            let row = "\(date),\"\(vendor)\",\"\(category)\",\(amount),\"\(projectName)\",\"\(status)\",\"\(confidence)\",\"\(receipt)\",\"\(notes)\""
            csvRows.append(row)
        }
        
        let csvContent = csvRows.joined(separator: "\r\n")
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyyMMdd_HHmmss"
        let timestamp = dateFormatter.string(from: Date())
        let filename = "ConsEstimate_Expenses_\(timestamp).csv"
        
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try csvContent.write(to: fileURL, atomically: true, encoding: .utf8)
        return fileURL
    }
    
    private func escapeCSV(_ text: String) -> String {
        return text.replacingOccurrences(of: "\"", with: "\"\"")
    }
    
    // MARK: - PDF Generation
    func generatePDF(
        expenses: [Expense],
        projects: [Project],
        title: String = "Expense & Audit Summary Report",
        projectFilterName: String? = nil
    ) throws -> URL {
        let projectDict = Dictionary(uniqueKeysWithValues: projects.map { ($0.id, $0.name) })
        
        // Standard US Letter: 612 x 792 points (72 dpi)
        let pageWidth: CGFloat = 612
        let pageHeight: CGFloat = 792
        let margin: CGFloat = 36
        let contentWidth = pageWidth - (margin * 2)
        
        let pdfMetaData = [
            kCGPDFContextCreator: "ConsEstimate iOS App",
            kCGPDFContextAuthor: "ConsEstimate Construction Platform",
            kCGPDFContextTitle: title
        ]
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = pdfMetaData as [String: Any]
        
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(x: 0, y: 0, width: pageWidth, height: pageHeight), format: format)
        
        let totalSpend = expenses.reduce(0) { $0 + $1.amount }
        let currencyFormatter = NumberFormatter()
        currencyFormatter.numberStyle = .currency
        currencyFormatter.locale = Locale(identifier: "en_US")
        let formattedTotal = currencyFormatter.string(from: NSNumber(value: totalSpend)) ?? "$\(totalSpend)"
        
        let approvedCount = expenses.filter { $0.approvalStatus == .approved }.count
        let flaggedCount = expenses.filter { $0.approvalStatus == .flagged }.count
        let pendingCount = expenses.filter { $0.approvalStatus == .pending }.count
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .medium
        dateFormatter.timeStyle = .short
        let generatedDateString = dateFormatter.string(from: Date())
        
        let data = renderer.pdfData { context in
            // Table row height & capacity calculation
            let rowHeight: CGFloat = 28
            let startTableY: CGFloat = 210
            let footerHeight: CGFloat = 30
            let availableTableHeight = pageHeight - startTableY - footerHeight
            let rowsPerPage = Int(availableTableHeight / rowHeight)
            let totalPages = max(1, Int(ceil(Double(expenses.count) / Double(rowsPerPage))))
            
            for pageIndex in 0..<totalPages {
                context.beginPage()
                let cgContext = context.cgContext
                
                // Page Header Bar
                let headerRect = CGRect(x: 0, y: 0, width: pageWidth, height: 70)
                cgContext.setFillColor(UIColor(red: 0.10, green: 0.15, blue: 0.24, alpha: 1.0).cgColor)
                cgContext.fill(headerRect)
                
                // Title & Subtitle in header
                let titleAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 18, weight: .bold),
                    .foregroundColor: UIColor.white
                ]
                "CONSESTIMATE • \(title.uppercased())".draw(at: CGPoint(x: margin, y: 18), withAttributes: titleAttributes)
                
                let subheaderAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 10, weight: .regular),
                    .foregroundColor: UIColor(white: 0.85, alpha: 1.0)
                ]
                let scopeText = projectFilterName != nil ? "Project: \(projectFilterName!)  |  Generated: \(generatedDateString)" : "All Projects  |  Generated: \(generatedDateString)"
                scopeText.draw(at: CGPoint(x: margin, y: 44), withAttributes: subheaderAttributes)
                
                // Summary KPI Cards (Only on Page 1)
                var currentY: CGFloat = 85
                if pageIndex == 0 {
                    let cardWidth = (contentWidth - 24) / 3
                    let cardHeight: CGFloat = 80
                    
                    // Card 1: Total Spend
                    drawSummaryCard(
                        in: CGRect(x: margin, y: currentY, width: cardWidth, height: cardHeight),
                        title: "TOTAL LOGGED SPEND",
                        value: formattedTotal,
                        subtitle: "\(expenses.count) total invoices",
                        accentColor: UIColor.systemGreen,
                        context: cgContext
                    )
                    
                    // Card 2: Approval Status Rollup
                    drawSummaryCard(
                        in: CGRect(x: margin + cardWidth + 12, y: currentY, width: cardWidth, height: cardHeight),
                        title: "AUDIT STATUS",
                        value: "\(approvedCount) Approved",
                        subtitle: "\(pendingCount) Pending  •  \(flaggedCount) Flagged",
                        accentColor: approvedCount >= flaggedCount ? UIColor.systemBlue : UIColor.systemOrange,
                        context: cgContext
                    )
                    
                    // Card 3: Top Category
                    var catTotals: [String: Double] = [:]
                    for exp in expenses { catTotals[exp.category, default: 0] += exp.amount }
                    let topCat = catTotals.max(by: { $0.value < $1.value })?.key ?? "—"
                    let topCatAmt = catTotals[topCat] ?? 0
                    let topCatFormatted = currencyFormatter.string(from: NSNumber(value: topCatAmt)) ?? "$0"
                    
                    drawSummaryCard(
                        in: CGRect(x: margin + (cardWidth + 12) * 2, y: currentY, width: cardWidth, height: cardHeight),
                        title: "HIGHEST CATEGORY",
                        value: topCat,
                        subtitle: "\(topCatFormatted) spent",
                        accentColor: UIColor.systemIndigo,
                        context: cgContext
                    )
                    
                    currentY += cardHeight + 20
                } else {
                    currentY = 85
                }
                
                // Table Header
                let tableHeaderRect = CGRect(x: margin, y: currentY, width: contentWidth, height: 24)
                cgContext.setFillColor(UIColor(red: 0.94, green: 0.96, blue: 0.98, alpha: 1.0).cgColor)
                cgContext.fill(tableHeaderRect)
                
                let thAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 9, weight: .bold),
                    .foregroundColor: UIColor(red: 0.25, green: 0.30, blue: 0.38, alpha: 1.0)
                ]
                
                // Columns: Date (65pt), Vendor (130pt), Category (90pt), Status (75pt), Amount (75pt), Notes (remainder)
                let colXDate = margin + 6
                let colXVendor = colXDate + 65
                let colXCat = colXVendor + 130
                let colXStatus = colXCat + 90
                let colXAmount = colXStatus + 75
                let colXNotes = colXAmount + 75
                
                "DATE".draw(at: CGPoint(x: colXDate, y: currentY + 6), withAttributes: thAttributes)
                "VENDOR".draw(at: CGPoint(x: colXVendor, y: currentY + 6), withAttributes: thAttributes)
                "CATEGORY".draw(at: CGPoint(x: colXCat, y: currentY + 6), withAttributes: thAttributes)
                "AUDIT STATUS".draw(at: CGPoint(x: colXStatus, y: currentY + 6), withAttributes: thAttributes)
                "AMOUNT".draw(at: CGPoint(x: colXAmount, y: currentY + 6), withAttributes: thAttributes)
                "NOTES / SCOPE".draw(at: CGPoint(x: colXNotes, y: currentY + 6), withAttributes: thAttributes)
                
                currentY += 24
                
                // Table Body Rows
                let startIndex = pageIndex * rowsPerPage
                let endIndex = min(startIndex + rowsPerPage, expenses.count)
                
                let cellFont = UIFont.systemFont(ofSize: 8.5, weight: .regular)
                let boldCellFont = UIFont.systemFont(ofSize: 8.5, weight: .semibold)
                let textDark = UIColor(red: 0.15, green: 0.18, blue: 0.22, alpha: 1.0)
                
                for rowIdx in startIndex..<endIndex {
                    let exp = expenses[rowIdx]
                    let rowRect = CGRect(x: margin, y: currentY, width: contentWidth, height: rowHeight)
                    
                    // Alternating row background
                    if (rowIdx - startIndex) % 2 == 1 {
                        cgContext.setFillColor(UIColor(red: 0.98, green: 0.985, blue: 0.99, alpha: 1.0).cgColor)
                        cgContext.fill(rowRect)
                    }
                    
                    // Bottom border
                    cgContext.setStrokeColor(UIColor(red: 0.90, green: 0.92, blue: 0.94, alpha: 1.0).cgColor)
                    cgContext.setLineWidth(0.5)
                    cgContext.strokeLineSegments(between: [
                        CGPoint(x: margin, y: currentY + rowHeight),
                        CGPoint(x: margin + contentWidth, y: currentY + rowHeight)
                    ])
                    
                    // Cell text drawing
                    let dateAttr: [NSAttributedString.Key: Any] = [.font: cellFont, .foregroundColor: textDark]
                    exp.expenseDate.draw(at: CGPoint(x: colXDate, y: currentY + 7), withAttributes: dateAttr)
                    
                    let vendorAttr: [NSAttributedString.Key: Any] = [.font: boldCellFont, .foregroundColor: textDark]
                    let vendorTruncated = truncateString(exp.vendor, maxLen: 22)
                    vendorTruncated.draw(at: CGPoint(x: colXVendor, y: currentY + 7), withAttributes: vendorAttr)
                    
                    let catAttr: [NSAttributedString.Key: Any] = [.font: cellFont, .foregroundColor: textDark]
                    exp.category.draw(at: CGPoint(x: colXCat, y: currentY + 7), withAttributes: catAttr)
                    
                    // Status badge indicator
                    let statusColor: UIColor
                    switch exp.approvalStatus {
                    case .approved: statusColor = UIColor.systemGreen
                    case .flagged: statusColor = UIColor.systemRed
                    case .pending: statusColor = UIColor.systemOrange
                    }
                    
                    let statusDotRect = CGRect(x: colXStatus, y: currentY + 10, width: 6, height: 6)
                    cgContext.setFillColor(statusColor.cgColor)
                    cgContext.fillEllipse(in: statusDotRect)
                    
                    let statusAttr: [NSAttributedString.Key: Any] = [.font: boldCellFont, .foregroundColor: statusColor]
                    exp.approvalStatus.shortTitle.draw(at: CGPoint(x: colXStatus + 10, y: currentY + 7), withAttributes: statusAttr)
                    
                    let amtAttr: [NSAttributedString.Key: Any] = [.font: boldCellFont, .foregroundColor: textDark]
                    exp.formattedAmount.draw(at: CGPoint(x: colXAmount, y: currentY + 7), withAttributes: amtAttr)
                    
                    let notesAttr: [NSAttributedString.Key: Any] = [.font: cellFont, .foregroundColor: UIColor.secondaryLabel]
                    let notesSnippet = truncateString(exp.cleanNotes.isEmpty ? (exp.scanConfidence.map { "\($0.capitalized) OCR" } ?? "—") : exp.cleanNotes, maxLen: 30)
                    notesSnippet.draw(at: CGPoint(x: colXNotes, y: currentY + 7), withAttributes: notesAttr)
                    
                    currentY += rowHeight
                }
                
                // Footer
                let footerRect = CGRect(x: margin, y: pageHeight - 30, width: contentWidth, height: 20)
                let footerAttr: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 8, weight: .regular),
                    .foregroundColor: UIColor.tertiaryLabel
                ]
                "ConsEstimate Construction Management  •  Page \(pageIndex + 1) of \(totalPages)".draw(in: footerRect, withAttributes: footerAttr)
            }
        }
        
        let dateFormatterFile = DateFormatter()
        dateFormatterFile.dateFormat = "yyyyMMdd_HHmmss"
        let timestamp = dateFormatterFile.string(from: Date())
        let filename = "ConsEstimate_Report_\(timestamp).pdf"
        
        let fileURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        try data.write(to: fileURL)
        return fileURL
    }
    
    private func drawSummaryCard(
        in rect: CGRect,
        title: String,
        value: String,
        subtitle: String,
        accentColor: UIColor,
        context: CGContext
    ) {
        // Background rounded box
        let path = UIBezierPath(roundedRect: rect, cornerRadius: 8)
        context.setFillColor(UIColor(red: 0.96, green: 0.97, blue: 0.99, alpha: 1.0).cgColor)
        context.addPath(path.cgPath)
        context.fillPath()
        
        // Border
        context.setStrokeColor(UIColor(red: 0.88, green: 0.90, blue: 0.94, alpha: 1.0).cgColor)
        context.setLineWidth(1)
        context.addPath(path.cgPath)
        context.strokePath()
        
        // Accent indicator left strip
        let stripRect = CGRect(x: rect.minX, y: rect.minY, width: 4, height: rect.height)
        let stripPath = UIBezierPath(roundedRect: stripRect, byRoundingCorners: [.topLeft, .bottomLeft], cornerRadii: CGSize(width: 8, height: 8))
        context.setFillColor(accentColor.cgColor)
        context.addPath(stripPath.cgPath)
        context.fillPath()
        
        // Card Text
        let titleAttr: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 8, weight: .bold),
            .foregroundColor: UIColor.secondaryLabel
        ]
        title.draw(at: CGPoint(x: rect.minX + 12, y: rect.minY + 10), withAttributes: titleAttr)
        
        let valueAttr: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 14, weight: .bold),
            .foregroundColor: UIColor(red: 0.12, green: 0.15, blue: 0.20, alpha: 1.0)
        ]
        value.draw(at: CGPoint(x: rect.minX + 12, y: rect.minY + 26), withAttributes: valueAttr)
        
        let subAttr: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 8, weight: .medium),
            .foregroundColor: accentColor
        ]
        subtitle.draw(at: CGPoint(x: rect.minX + 12, y: rect.minY + 48), withAttributes: subAttr)
    }
    
    private func truncateString(_ str: String, maxLen: Int) -> String {
        if str.count <= maxLen { return str }
        let index = str.index(str.startIndex, offsetBy: maxLen - 1)
        return String(str[..<index]) + "…"
    }
}
