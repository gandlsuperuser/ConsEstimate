import SwiftUI
import PhotosUI

struct EditExpenseSheet: View {
    let expense: Expense
    var projects: [Project] = []
    var onSaved: ((Expense) -> Void)? = nil
    
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedProjectId: String
    @State private var vendor: String
    @State private var category: ExpenseCategory
    @State private var amountString: String
    @State private var expenseDate: Date
    @State private var notes: String
    @State private var approvalStatus: ExpenseApprovalStatus
    @State private var statusComment: String = ""
    @State private var scanConfidence: String
    
    // Receipt Attachment State
    @State private var existingReceiptUrl: String?
    @State private var newReceiptImage: UIImage?
    @State private var isUploadingNewImage: Bool = false
    @State private var showCamera: Bool = false
    @State private var showPhotoPicker: Bool = false
    @State private var selectedPhotosItem: PhotosPickerItem? = nil
    
    // Save State
    @State private var isSaving: Bool = false
    @State private var errorMessage: String? = nil
    
    init(expense: Expense, projects: [Project] = [], onSaved: ((Expense) -> Void)? = nil) {
        self.expense = expense
        self.projects = projects
        self.onSaved = onSaved
        
        _selectedProjectId = State(initialValue: expense.projectId)
        _vendor = State(initialValue: expense.vendor)
        _category = State(initialValue: expense.categoryEnum)
        _amountString = State(initialValue: String(format: "%.2f", expense.amount))
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let parsedDate = formatter.date(from: expense.expenseDate) ?? Date()
        _expenseDate = State(initialValue: parsedDate)
        
        _notes = State(initialValue: expense.cleanNotes)
        _approvalStatus = State(initialValue: expense.approvalStatus)
        _scanConfidence = State(initialValue: expense.scanConfidence ?? "high")
        _existingReceiptUrl = State(initialValue: expense.receiptUrl)
    }
    
    var body: some View {
        NavigationStack {
            Form {
                // Section 1: Financial & Vendor Info
                Section("Expense Details") {
                    HStack {
                        Text("$")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        TextField("0.00", text: $amountString)
                            .font(.system(size: 24, weight: .bold, design: .rounded))
                            .keyboardType(.decimalPad)
                    }
                    
                    VStack(alignment: .leading, spacing: 6) {
                        TextField("Vendor name (e.g. MHAC, Home Depot)", text: $vendor)
                            .font(.body)
                        
                        // Suggestion chips
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(AppConfig.knownVendors, id: \.self) { v in
                                    Button {
                                        vendor = v
                                        HapticsService.selection()
                                    } label: {
                                        Text(v)
                                            .font(.caption2.weight(.medium))
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(vendor == v ? Color.accentColor.opacity(0.2) : Color(.systemGray6))
                                            .foregroundColor(vendor == v ? .accentColor : .secondary)
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.vertical, 2)
                        }
                    }
                    
                    Picker("Category", selection: $category) {
                        ForEach(ExpenseCategory.allCases) { cat in
                            Label(cat.rawValue, systemImage: cat.iconName)
                                .tag(cat)
                        }
                    }
                    
                    if !projects.isEmpty {
                        Picker("Project", selection: $selectedProjectId) {
                            ForEach(projects) { p in
                                Text(p.name).tag(p.id)
                            }
                        }
                    }
                    
                    DatePicker("Expense Date", selection: $expenseDate, displayedComponents: .date)
                }
                
                // Section 2: Audit & Approval Workflow
                Section {
                    Picker("Audit Status", selection: $approvalStatus) {
                        ForEach(ExpenseApprovalStatus.allCases) { status in
                            HStack {
                                Image(systemName: status.iconName)
                                Text(status.title)
                            }
                            .tag(status)
                        }
                    }
                    .pickerStyle(.menu)
                    
                    if approvalStatus != .pending {
                        TextField("Approval note or flag reason (optional)", text: $statusComment)
                            .font(.subheadline)
                    }
                    
                    Picker("Scan Confidence", selection: $scanConfidence) {
                        Text("High (Clean match)").tag("high")
                        Text("Medium (Manual check)").tag("medium")
                        Text("Low (Field draft)").tag("low")
                    }
                } header: {
                    Text("Field Audit & Approval")
                } footer: {
                    Text("Setting status stamps an audit marker into the expense record with current date and time.")
                }
                
                // Section 3: Receipt Image
                Section("Receipt Attachment") {
                    if let newImg = newReceiptImage {
                        ZStack(alignment: .topTrailing) {
                            Image(uiImage: newImg)
                                .resizable()
                                .scaledToFill()
                                .frame(height: 160)
                                .clipped()
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            
                            Button {
                                newReceiptImage = nil
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.title3)
                                    .foregroundColor(.white)
                                    .shadow(radius: 2)
                                    .padding(6)
                            }
                        }
                    } else if let existingUrl = existingReceiptUrl, let url = URL(string: existingUrl) {
                        VStack(alignment: .leading, spacing: 8) {
                            AsyncImage(url: url) { phase in
                                switch phase {
                                case .empty:
                                    HStack {
                                        ProgressView()
                                        Text("Loading attachment...")
                                            .font(.caption)
                                            .foregroundColor(.secondary)
                                    }
                                    .frame(height: 120)
                                case .success(let image):
                                    image
                                        .resizable()
                                        .scaledToFill()
                                        .frame(maxWidth: .infinity)
                                        .frame(height: 160)
                                        .clipped()
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                case .failure:
                                    Label("Receipt photo attached (Remote)", systemImage: "doc.text.image")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                @unknown default:
                                    EmptyView()
                                }
                            }
                        }
                    } else {
                        Text("No receipt photo currently attached")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    // Replace / Add photo buttons
                    HStack(spacing: 12) {
                        Button {
                            showCamera = true
                        } label: {
                            Label(newReceiptImage != nil || existingReceiptUrl != nil ? "Retake Photo" : "Take Photo", systemImage: "camera")
                                .font(.footnote.weight(.medium))
                        }
                        .buttonStyle(.bordered)
                        
                        Button {
                            showPhotoPicker = true
                        } label: {
                            Label("Choose Photo", systemImage: "photo")
                                .font(.footnote.weight(.medium))
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.vertical, 4)
                }
                
                // Section 4: Notes
                Section("Scope & Line Item Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }
                
                if let err = errorMessage {
                    Section {
                        Text(err)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Edit Expense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        Task { await saveChanges() }
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Save")
                                .bold()
                        }
                    }
                    .disabled(isSaving || vendor.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .sheet(isPresented: $showCamera) {
                CameraPicker(selectedImage: $newReceiptImage, sourceType: .camera)
            }
            .photosPicker(isPresented: $showPhotoPicker, selection: $selectedPhotosItem, matching: .images)
            .onChange(of: selectedPhotosItem) { _, newItem in
                guard let item = newItem else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self),
                       let img = UIImage(data: data) {
                        await MainActor.run {
                            self.newReceiptImage = img.fixedOrientation()
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - Save Logic
    private func saveChanges() async {
        isSaving = true
        errorMessage = nil
        
        let cleanedAmount = amountString.replacingOccurrences(of: "$", with: "").trimmingCharacters(in: .whitespaces)
        guard let amount = Double(cleanedAmount), amount >= 0 else {
            errorMessage = "Please enter a valid expense amount"
            isSaving = false
            return
        }
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let dateString = dateFormatter.string(from: expenseDate)
        
        do {
            var finalReceiptUrl = existingReceiptUrl
            
            // Upload new image if captured
            if let newImg = newReceiptImage,
               let jpegData = newImg.jpegData(compressionQuality: 0.8) {
                let filename = "expense_\(expense.id)_\(Int(Date().timeIntervalSince1970)).jpg"
                finalReceiptUrl = try await SupabaseService.shared.uploadReceipt(
                    imageData: jpegData,
                    projectId: selectedProjectId,
                    filename: filename
                )
            }
            
            // Generate updated notes including audit status
            let updatedNotes = generateFinalNotes()
            
            let input = UpdateExpenseInput(
                projectId: selectedProjectId,
                category: category.rawValue,
                vendor: vendor.trimmingCharacters(in: .whitespaces),
                expenseDate: dateString,
                amount: amount,
                receiptUrl: finalReceiptUrl,
                scanConfidence: scanConfidence,
                notes: updatedNotes
            )
            
            let updated = try await SupabaseService.shared.updateExpense(id: expense.id, input: input)
            HapticsService.notification(.success)
            onSaved?(updated)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            HapticsService.notification(.error)
            isSaving = false
        }
    }
    
    private func generateFinalNotes() -> String {
        let base = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd HH:mm"
        let timestamp = dateFormatter.string(from: Date())
        
        let statusTag: String
        switch approvalStatus {
        case .approved:
            let comment = statusComment.trimmingCharacters(in: .whitespaces)
            statusTag = comment.isEmpty ? "[STATUS: APPROVED - \(timestamp)]" : "[STATUS: APPROVED - \(timestamp) - \(comment)]"
        case .flagged:
            let comment = statusComment.trimmingCharacters(in: .whitespaces)
            statusTag = comment.isEmpty ? "[STATUS: FLAGGED - \(timestamp) - Review Required]" : "[STATUS: FLAGGED - \(timestamp) - \(comment)]"
        case .pending:
            return base
        }
        
        if base.isEmpty {
            return statusTag
        } else {
            return "\(statusTag) \(base)"
        }
    }
}
