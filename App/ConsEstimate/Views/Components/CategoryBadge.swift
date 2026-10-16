import SwiftUI

struct CategoryBadge: View {
    let category: ExpenseCategory
    var showIcon: Bool = true
    
    var body: some View {
        HStack(spacing: 4) {
            if showIcon {
                Image(systemName: category.iconName)
                    .font(.system(size: 11, weight: .semibold))
            }
            Text(category.rawValue)
                .font(.system(size: 12, weight: .medium))
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(category.badgeColor.opacity(0.15))
        .foregroundColor(category.badgeColor)
        .clipShape(Capsule())
    }
}
