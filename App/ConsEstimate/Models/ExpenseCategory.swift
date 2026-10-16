import SwiftUI

enum ExpenseCategory: String, CaseIterable, Identifiable, Codable {
    case hvac = "HVAC"
    case electrical = "Electrical"
    case framing = "Framing"
    case demo = "Demo"
    case equipment = "Equipment"
    case materials = "Materials"
    case labor = "Labor"
    case permits = "Permits"
    case overhead = "Overhead"
    case openings = "Openings"
    case plumbing = "Plumbing"
    case concrete = "Concrete"
    case other = "Other"
    
    var id: String { rawValue }
    
    var iconName: String {
        switch self {
        case .hvac: return "air.conditioner.horizontal"
        case .electrical: return "bolt.fill"
        case .framing: return "square.split.diagonal.2x2"
        case .demo: return "hammer.fill"
        case .equipment: return "truck.box.fill"
        case .materials: return "shippingbox.fill"
        case .labor: return "person.3.fill"
        case .permits: return "doc.text.fill"
        case .overhead: return "chart.bar.doc.horizontal.fill"
        case .openings: return "door.left.hand.open"
        case .plumbing: return "drop.fill"
        case .concrete: return "square.stack.3d.down.right.fill"
        case .other: return "tag.fill"
        }
    }
    
    var badgeColor: Color {
        switch self {
        case .hvac: return Color.cyan
        case .electrical: return Color.amber
        case .framing: return Color.indigo
        case .demo: return Color.red
        case .equipment: return Color.orange
        case .materials: return Color.purple
        case .labor: return Color.blue
        case .permits: return Color.teal
        case .overhead: return Color.gray
        case .openings: return Color.brown
        case .plumbing: return Color.mint
        case .concrete: return Color.secondary
        case .other: return Color.primary
        }
    }
}

extension Color {
    static let amber = Color(red: 0.96, green: 0.62, blue: 0.04)
}
