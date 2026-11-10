import SwiftUI

enum ExpenseApprovalStatus: String, CaseIterable, Identifiable, Codable {
    case pending = "pending"
    case approved = "approved"
    case flagged = "flagged"
    
    var id: String { rawValue }
    
    var title: String {
        switch self {
        case .pending: return "Pending Review"
        case .approved: return "Approved"
        case .flagged: return "Flagged"
        }
    }
    
    var shortTitle: String {
        switch self {
        case .pending: return "Pending"
        case .approved: return "Approved"
        case .flagged: return "Flagged"
        }
    }
    
    var iconName: String {
        switch self {
        case .pending: return "clock.fill"
        case .approved: return "checkmark.seal.fill"
        case .flagged: return "exclamationmark.triangle.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .pending: return .orange
        case .approved: return .green
        case .flagged: return .red
        }
    }
}

struct Expense: Identifiable, Codable, Hashable {
    let id: String
    var projectId: String
    var category: String
    var vendor: String
    var expenseDate: String
    var amount: Double
    var receiptUrl: String?
    var scanConfidence: String?
    var notes: String?
    var createdAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case projectId = "project_id"
        case category
        case vendor
        case expenseDate = "expense_date"
        case amount
        case receiptUrl = "receipt_url"
        case scanConfidence = "scan_confidence"
        case notes
        case createdAt = "created_at"
    }
    
    var formattedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: amount)) ?? String(format: "$%.2f", amount)
    }
    
    var categoryEnum: ExpenseCategory {
        ExpenseCategory(rawValue: category) ?? .other
    }
    
    var approvalStatus: ExpenseApprovalStatus {
        guard let notes = notes else { return .pending }
        let upper = notes.uppercased()
        if upper.contains("[STATUS: APPROVED") || upper.contains("[APPROVED") {
            return .approved
        } else if upper.contains("[STATUS: FLAGGED") || upper.contains("[FLAGGED") {
            return .flagged
        }
        return .pending
    }
    
    var statusDetail: String? {
        guard let notes = notes else { return nil }
        if let match = notes.range(of: #"(?i)\[STATUS:\s*(APPROVED|FLAGGED|PENDING)[^\]]*\]"#, options: .regularExpression) {
            let tag = String(notes[match])
            return tag.trimmingCharacters(in: CharacterSet(charactersIn: "[]"))
        }
        return nil
    }
    
    var cleanNotes: String {
        guard let notes = notes else { return "" }
        let stripped = notes.replacingOccurrences(
            of: #"(?i)\[STATUS:\s*(APPROVED|FLAGGED|PENDING)[^\]]*\]\s*"#,
            with: "",
            options: .regularExpression
        )
        return stripped.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    
    func notesWithStatus(_ status: ExpenseApprovalStatus, comment: String? = nil) -> String {
        let baseNotes = cleanNotes
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm"
        let timestamp = dateFormatter.string(from: Date())
        
        let statusTag: String
        switch status {
        case .approved:
            if let comment = comment, !comment.isEmpty {
                statusTag = "[STATUS: APPROVED - \(timestamp) - \(comment)]"
            } else {
                statusTag = "[STATUS: APPROVED - \(timestamp)]"
            }
        case .flagged:
            if let comment = comment, !comment.isEmpty {
                statusTag = "[STATUS: FLAGGED - \(timestamp) - \(comment)]"
            } else {
                statusTag = "[STATUS: FLAGGED - \(timestamp) - Review Required]"
            }
        case .pending:
            if let comment = comment, !comment.isEmpty {
                statusTag = "[STATUS: PENDING - \(comment)]"
            } else {
                return baseNotes
            }
        }
        
        if baseNotes.isEmpty {
            return statusTag
        } else {
            return "\(statusTag) \(baseNotes)"
        }
    }
}

struct CreateExpenseInput: Codable {
    var projectId: String
    var category: String
    var vendor: String
    var expenseDate: String
    var amount: Double
    var receiptUrl: String?
    var scanConfidence: String?
    var notes: String?
    
    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case category
        case vendor
        case expenseDate = "expense_date"
        case amount
        case receiptUrl = "receipt_url"
        case scanConfidence = "scan_confidence"
        case notes
    }
}

struct UpdateExpenseInput: Codable {
    var projectId: String?
    var category: String?
    var vendor: String?
    var expenseDate: String?
    var amount: Double?
    var receiptUrl: String?
    var scanConfidence: String?
    var notes: String?
    
    enum CodingKeys: String, CodingKey {
        case projectId = "project_id"
        case category
        case vendor
        case expenseDate = "expense_date"
        case amount
        case receiptUrl = "receipt_url"
        case scanConfidence = "scan_confidence"
        case notes
    }
}
