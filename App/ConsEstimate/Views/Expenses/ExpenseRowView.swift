import SwiftUI

struct ExpenseRowView: View {
    let expense: Expense
    
    var body: some View {
        HStack(alignment: .center, spacing: 14) {
            // Category Icon
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(expense.categoryEnum.badgeColor.opacity(0.15))
                    .frame(width: 44, height: 44)
                
                Image(systemName: expense.categoryEnum.iconName)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(expense.categoryEnum.badgeColor)
            }
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(expense.vendor)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    
                    if expense.receiptUrl != nil {
                        Image(systemName: "paperclip")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)
                    }
                }
                
                HStack(spacing: 6) {
                    CategoryBadge(category: expense.categoryEnum, showIcon: false)
                    
                    Text("•")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    Text(expense.expenseDate)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                if let notes = expense.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Amount & Confidence
            VStack(alignment: .trailing, spacing: 4) {
                Text(expense.formattedAmount)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                
                if let conf = expense.scanConfidence, !conf.isEmpty {
                    HStack(spacing: 2) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 9))
                        Text(conf.capitalized)
                            .font(.system(size: 10, weight: .medium))
                    }
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.secondary.opacity(0.12))
                    .foregroundColor(.secondary)
                    .clipShape(Capsule())
                }
            }
        }
        .padding(.vertical, 4)
    }
}
