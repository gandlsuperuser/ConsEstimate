import Foundation

struct Project: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var type: String?
    var clientName: String?
    var address: String?
    var startDate: String?
    var status: String?
    var overheadPct: Double?
    var profitPct: Double?
    var createdAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id
        case name
        case type
        case clientName = "client_name"
        case address
        case startDate = "start_date"
        case status
        case overheadPct = "overhead_pct"
        case profitPct = "profit_pct"
        case createdAt = "created_at"
    }
}
