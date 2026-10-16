import Foundation

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
