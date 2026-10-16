import SwiftUI

struct ExpenseDetailView: View {
    let expense: Expense
    var onDelete: (() -> Void)? = nil
    
    @Environment(\.dismiss) private var dismiss
    @State private var showingImageViewer = false
    @State private var showingDeleteAlert = false
    @State private var isDeleting = false
    @State private var errorMessage: String?
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Top Amount Card
                VStack(spacing: 8) {
                    HStack {
                        CategoryBadge(category: expense.categoryEnum)
                        Spacer()
                        if let conf = expense.scanConfidence {
                            HStack(spacing: 4) {
                                Image(systemName: "sparkles")
                                Text("\(conf.capitalized) Confidence")
                            }
                            .font(.caption2.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.green.opacity(0.15))
                            .foregroundColor(.green)
                            .clipShape(Capsule())
                        }
                    }
                    
                    Text(expense.formattedAmount)
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                        .padding(.top, 4)
                    
                    Text(expense.vendor)
                        .font(.title3.weight(.medium))
                        .foregroundColor(.secondary)
                }
                .padding(20)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                
                // Receipt Preview Card
                if let receiptUrl = expense.receiptUrl, let url = URL(string: receiptUrl) {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Label("Attached Receipt", systemImage: "doc.text.image")
                                .font(.headline)
                            Spacer()
                            Button("Full View") {
                                showingImageViewer = true
                            }
                            .font(.subheadline.bold())
                        }
                        
                        Button {
                            showingImageViewer = true
                        } label: {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .empty:
                                    HStack {
                                        Spacer()
                                        ProgressView()
                                        Spacer()
                                    }
                                    .frame(height: 180)
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 220)
                                        .clipped()
                                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                                .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                                        )
                                case .failure:
                                    HStack {
                                        Image(systemName: "photo")
                                        Text("Receipt image available online")
                                    }
                                    .foregroundColor(.secondary)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 100)
                                    .background(Color(.tertiarySystemGroupedBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                @unknown default:
                                    EmptyView()
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(16)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                
                // Expense Details
                VStack(alignment: .leading, spacing: 16) {
                    Text("Details")
                        .font(.headline)
                    
                    Divider()
                    
                    DetailRow(title: "Expense Date", value: expense.expenseDate, icon: "calendar")
                    DetailRow(title: "Category", value: expense.category, icon: expense.categoryEnum.iconName)
                    DetailRow(title: "Project ID", value: expense.projectId, icon: "building.2")
                    if let created = expense.createdAt {
                        DetailRow(title: "Logged At", value: String(created.prefix(10)), icon: "clock")
                    }
                }
                .padding(16)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                
                // Notes
                if let notes = expense.notes, !notes.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Invoice Notes & Scope", systemImage: "note.text")
                            .font(.headline)
                        
                        Text(notes)
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                            .lineSpacing(4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .background(Color(.secondarySystemGroupedBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                
                // Delete Action
                Button(role: .destructive) {
                    showingDeleteAlert = true
                } label: {
                    HStack {
                        if isDeleting {
                            ProgressView()
                                .tint(.red)
                        } else {
                            Image(systemName: "trash")
                            Text("Delete Expense")
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.red.opacity(0.12))
                    .foregroundColor(.red)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .disabled(isDeleting)
                .padding(.top, 8)
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Expense")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let receiptUrl = expense.receiptUrl, let url = URL(string: receiptUrl) {
                ToolbarItem(placement: .primaryAction) {
                    ShareLink(item: url) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
        .fullScreenCover(isPresented: $showingImageViewer) {
            if let receiptUrl = expense.receiptUrl {
                ReceiptImageViewer(imageURLString: receiptUrl, title: "\(expense.vendor) Receipt")
            }
        }
        .alert("Delete Expense?", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                deleteRecord()
            }
        } message: {
            Text("Are you sure you want to delete this $\(String(format: "%.2f", expense.amount)) expense from \(expense.vendor)? This action cannot be undone.")
        }
    }
    
    private func deleteRecord() {
        isDeleting = true
        HapticsService.medium()
        Task {
            do {
                try await SupabaseService.shared.deleteExpense(id: expense.id)
                HapticsService.success()
                onDelete?()
                dismiss()
            } catch {
                isDeleting = false
                errorMessage = error.localizedDescription
                HapticsService.error()
            }
        }
    }
}

private struct DetailRow: View {
    let title: String
    let value: String
    let icon: String
    
    var body: some View {
        HStack {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundColor(.secondary)
                .frame(width: 20)
            Text(title)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(.primary)
                .lineLimit(1)
        }
        .font(.subheadline)
    }
}
