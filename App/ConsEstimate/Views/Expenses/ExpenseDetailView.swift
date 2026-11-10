import SwiftUI

struct ExpenseDetailView: View {
    let initialExpense: Expense
    var projects: [Project] = []
    var onDelete: (() -> Void)? = nil
    var onUpdate: ((Expense) -> Void)? = nil
    
    @Environment(\.dismiss) private var dismiss
    @State private var currentExpense: Expense
    @State private var showingEditSheet = false
    @State private var showingImageViewer = false
    @State private var showingDeleteAlert = false
    @State private var showingFlagDialog = false
    @State private var flagComment = ""
    @State private var isDeleting = false
    @State private var isUpdatingStatus = false
    @State private var errorMessage: String?
    
    init(
        expense: Expense,
        projects: [Project] = [],
        onDelete: (() -> Void)? = nil,
        onUpdate: ((Expense) -> Void)? = nil
    ) {
        self.initialExpense = expense
        self.projects = projects
        self.onDelete = onDelete
        self.onUpdate = onUpdate
        _currentExpense = State(initialValue: expense)
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Top Amount Card
                VStack(spacing: 8) {
                    HStack {
                        CategoryBadge(category: currentExpense.categoryEnum)
                        Spacer()
                        if let conf = currentExpense.scanConfidence {
                            HStack(spacing: 4) {
                                Image(systemName: "sparkles")
                                Text("\(conf.capitalized) Confidence")
                            }
                            .font(.caption2.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.accentColor.opacity(0.12))
                            .foregroundColor(.accentColor)
                            .clipShape(Capsule())
                        }
                    }
                    
                    Text(currentExpense.formattedAmount)
                        .font(.system(size: 40, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                        .padding(.top, 4)
                    
                    Text(currentExpense.vendor)
                        .font(.title3.weight(.medium))
                        .foregroundColor(.secondary)
                }
                .padding(20)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                
                // Field Audit & Approval Bar
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Label("Field Audit Status", systemImage: "checkmark.shield.fill")
                            .font(.headline)
                        Spacer()
                        
                        // Status Pill
                        HStack(spacing: 4) {
                            Image(systemName: currentExpense.approvalStatus.iconName)
                            Text(currentExpense.approvalStatus.title)
                        }
                        .font(.caption.bold())
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(currentExpense.approvalStatus.color.opacity(0.15))
                        .foregroundColor(currentExpense.approvalStatus.color)
                        .clipShape(Capsule())
                    }
                    
                    if let detail = currentExpense.statusDetail {
                        Text(detail)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 4)
                    }
                    
                    Divider()
                    
                    // Quick Action Buttons
                    if isUpdatingStatus {
                        HStack {
                            Spacer()
                            ProgressView("Updating status...")
                                .font(.caption)
                            Spacer()
                        }
                        .padding(.vertical, 4)
                    } else {
                        HStack(spacing: 8) {
                            // Approve Button
                            Button {
                                updateStatus(to: .approved)
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("Approve")
                                }
                                .font(.subheadline.weight(.semibold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 38)
                                .background(currentExpense.approvalStatus == .approved ? Color.green : Color.green.opacity(0.12))
                                .foregroundColor(currentExpense.approvalStatus == .approved ? .white : .green)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            }
                            
                            // Flag Button
                            Button {
                                showingFlagDialog = true
                            } label: {
                                HStack(spacing: 4) {
                                    Image(systemName: "exclamationmark.triangle.fill")
                                    Text("Flag")
                                }
                                .font(.subheadline.weight(.semibold))
                                .frame(maxWidth: .infinity)
                                .frame(height: 38)
                                .background(currentExpense.approvalStatus == .flagged ? Color.red : Color.red.opacity(0.12))
                                .foregroundColor(currentExpense.approvalStatus == .flagged ? .white : .red)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                            }
                            
                            // Reset to Pending
                            if currentExpense.approvalStatus != .pending {
                                Button {
                                    updateStatus(to: .pending)
                                } label: {
                                    Image(systemName: "arrow.counterclockwise")
                                        .font(.subheadline.weight(.semibold))
                                        .frame(width: 38, height: 38)
                                        .background(Color(.systemGray5))
                                        .foregroundColor(.secondary)
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                }
                            }
                        }
                    }
                }
                .padding(16)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                
                // Receipt Preview Card
                if let receiptUrl = currentExpense.receiptUrl, let url = URL(string: receiptUrl) {
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
                    
                    DetailRow(title: "Expense Date", value: currentExpense.expenseDate, icon: "calendar")
                    DetailRow(title: "Category", value: currentExpense.category, icon: currentExpense.categoryEnum.iconName)
                    DetailRow(title: "Project ID", value: currentExpense.projectId, icon: "building.2")
                    if let created = currentExpense.createdAt {
                        DetailRow(title: "Logged At", value: String(created.prefix(10)), icon: "clock")
                    }
                }
                .padding(16)
                .background(Color(.secondarySystemGroupedBackground))
                .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                
                // Notes & Scope
                if !currentExpense.cleanNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Invoice Notes & Scope", systemImage: "note.text")
                            .font(.headline)
                        
                        Text(currentExpense.cleanNotes)
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
            ToolbarItem(placement: .primaryAction) {
                HStack(spacing: 12) {
                    Button("Edit") {
                        showingEditSheet = true
                    }
                    .font(.body.weight(.semibold))
                    
                    if let receiptUrl = currentExpense.receiptUrl, let url = URL(string: receiptUrl) {
                        ShareLink(item: url) {
                            Image(systemName: "square.and.arrow.up")
                        }
                    }
                }
            }
        }
        .sheet(isPresented: $showingEditSheet) {
            EditExpenseSheet(expense: currentExpense, projects: projects) { updated in
                self.currentExpense = updated
                self.onUpdate?(updated)
            }
        }
        .fullScreenCover(isPresented: $showingImageViewer) {
            if let receiptUrl = currentExpense.receiptUrl {
                ReceiptImageViewer(imageURLString: receiptUrl, title: "\(currentExpense.vendor) Receipt")
            }
        }
        .alert("Flag Expense for Review", isPresented: $showingFlagDialog) {
            TextField("Reason (e.g. Needs revised invoice, missing waiver)", text: $flagComment)
            Button("Cancel", role: .cancel) { flagComment = "" }
            Button("Flag Expense", role: .destructive) {
                updateStatus(to: .flagged, comment: flagComment)
                flagComment = ""
            }
        } message: {
            Text("Provide a reason why this $\(currentExpense.formattedAmount) invoice from \(currentExpense.vendor) is flagged.")
        }
        .alert("Delete Expense?", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                deleteRecord()
            }
        } message: {
            Text("Are you sure you want to delete this $\(String(format: "%.2f", currentExpense.amount)) expense from \(currentExpense.vendor)? This action cannot be undone.")
        }
    }
    
    private func updateStatus(to newStatus: ExpenseApprovalStatus, comment: String? = nil) {
        isUpdatingStatus = true
        let updatedNotes = currentExpense.notesWithStatus(newStatus, comment: comment)
        
        let input = UpdateExpenseInput(
            notes: updatedNotes
        )
        
        Task {
            do {
                let updated = try await SupabaseService.shared.updateExpense(id: currentExpense.id, input: input)
                await MainActor.run {
                    self.currentExpense = updated
                    self.isUpdatingStatus = false
                    HapticsService.notification(newStatus == .approved ? .success : .warning)
                    self.onUpdate?(updated)
                }
            } catch {
                await MainActor.run {
                    self.isUpdatingStatus = false
                    self.errorMessage = error.localizedDescription
                    HapticsService.notification(.error)
                }
            }
        }
    }
    
    private func deleteRecord() {
        isDeleting = true
        HapticsService.impact(.medium)
        Task {
            do {
                try await SupabaseService.shared.deleteExpense(id: currentExpense.id)
                HapticsService.notification(.success)
                onDelete?()
                dismiss()
            } catch {
                isDeleting = false
                errorMessage = error.localizedDescription
                HapticsService.notification(.error)
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
