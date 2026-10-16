import SwiftUI
import PhotosUI

struct AddExpenseSheet: View {
    var initialImage: UIImage? = nil
    var projects: [Project] = []
    var onSaved: ((Expense) -> Void)? = nil
    
    @Environment(\.dismiss) private var dismiss
    
    @State private var selectedProjectId: String = AppConfig.defaultProjectId
    @State private var vendor: String = ""
    @State private var category: ExpenseCategory = .materials
    @State private var amountString: String = ""
    @State private var expenseDate: Date = Date()
    @State private var notes: String = ""
    
    // Receipt Image & OCR State
    @State private var receiptImage: UIImage? = nil
    @State private var isScanningOCR: Bool = false
    @State private var scanConfidence: String? = nil
    @State private var ocrStatusMessage: String? = nil
    
    // Pickers
    @State private var showCamera: Bool = false
    @State private var showPhotoPicker: Bool = false
    @State private var selectedPhotosItem: PhotosPickerItem? = nil
    
    // Submission State
    @State private var isSaving: Bool = false
    @State private var errorMessage: String? = nil
    
    init(initialImage: UIImage? = nil, projects: [Project] = [], onSaved: ((Expense) -> Void)? = nil) {
        self.initialImage = initialImage
        self.projects = projects
        self.onSaved = onSaved
        _receiptImage = State(initialValue: initialImage)
    }
    
    var body: some View {
        NavigationStack {
            Form {
                // Receipt Image & Scan Section
                Section {
                    VStack(spacing: 12) {
                        if let img = receiptImage {
                            ZStack(alignment: .topTrailing) {
                                Image(uiImage: img)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 180)
                                    .clipped()
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                
                                Button {
                                    receiptImage = nil
                                    scanConfidence = nil
                                    ocrStatusMessage = nil
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 24))
                                        .foregroundColor(.white)
                                        .shadow(radius: 2)
                                        .padding(8)
                                }
                            }
                            
                            if isScanningOCR {
                                HStack(spacing: 8) {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                    Text("Analyzing receipt with Vision OCR...")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 4)
                            } else {
                                Button {
                                    performOCR(on: img)
                                } label: {
                                    HStack {
                                        Image(systemName: "sparkles")
                                        Text("Re-scan Receipt with AI")
                                    }
                                    .font(.system(size: 14, weight: .semibold))
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 8)
                                    .background(Color.accentColor.opacity(0.12))
                                    .foregroundColor(.accentColor)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                            }
                            
                            if let msg = ocrStatusMessage {
                                Text(msg)
                                    .font(.caption)
                                    .foregroundColor(.green)
                            }
                        } else {
                            HStack(spacing: 16) {
                                Button {
                                    showCamera = true
                                } label: {
                                    VStack(spacing: 8) {
                                        Image(systemName: "camera.fill")
                                            .font(.system(size: 26))
                                        Text("Take Photo")
                                            .font(.system(size: 13, weight: .semibold))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 90)
                                    .background(Color(.secondarySystemGroupedBackground))
                                    .foregroundColor(.accentColor)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                                    )
                                }
                                .buttonStyle(.plain)
                                
                                PhotosPicker(selection: $selectedPhotosItem, matching: .images) {
                                    VStack(spacing: 8) {
                                        Image(systemName: "photo.on.rectangle")
                                            .font(.system(size: 26))
                                        Text("Photo Library")
                                            .font(.system(size: 13, weight: .semibold))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 90)
                                    .background(Color(.secondarySystemGroupedBackground))
                                    .foregroundColor(.accentColor)
                                    .clipShape(RoundedRectangle(cornerRadius: 12))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12)
                                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.vertical, 6)
                        }
                    }
                } header: {
                    Text("Receipt Image")
                }
                
                // Expense Details
                Section {
                    // Project
                    Picker("Project", selection: $selectedProjectId) {
                        if projects.isEmpty {
                            Text("CONVIVA JOURDANTON").tag(AppConfig.defaultProjectId)
                        } else {
                            ForEach(projects) { p in
                                Text(p.name).tag(p.id)
                            }
                        }
                    }
                    
                    // Amount
                    HStack {
                        Text("Amount")
                            .foregroundColor(.primary)
                        Spacer()
                        Text("$")
                            .foregroundColor(.secondary)
                        TextField("0.00", text: $amountString)
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .font(.system(size: 18, weight: .semibold, design: .rounded))
                    }
                    
                    // Vendor
                    VStack(alignment: .leading, spacing: 8) {
                        TextField("Vendor Name (e.g. MHAC, Action Gypsum)", text: $vendor)
                        
                        // Quick Vendor Pills
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(AppConfig.knownVendors.prefix(5), id: \.self) { v in
                                    Button {
                                        vendor = v
                                        HapticsService.selection()
                                    } label: {
                                        Text(v)
                                            .font(.caption2.weight(.medium))
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(Color(.tertiarySystemGroupedBackground))
                                            .foregroundColor(.primary)
                                            .clipShape(Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    
                    // Category
                    Picker("Category", selection: $category) {
                        ForEach(ExpenseCategory.allCases) { cat in
                            Label(cat.rawValue, systemImage: cat.iconName)
                                .tag(cat)
                        }
                    }
                    
                    // Date
                    DatePicker("Expense Date", selection: $expenseDate, displayedComponents: .date)
                } header: {
                    Text("Expense Details")
                }
                
                // Notes & Description
                Section {
                    TextField("Invoice #, items, payroll details...", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                } header: {
                    Text("Invoice Notes")
                }
                
                if let err = errorMessage {
                    Section {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                    }
                }
            }
            .navigationTitle("New Expense")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .disabled(isSaving)
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        saveExpense()
                    } label: {
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Save")
                                .bold()
                        }
                    }
                    .disabled(isSaving || amountString.isEmpty || vendor.isEmpty)
                }
            }
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker(selectedImage: $receiptImage, sourceType: .camera)
                    .ignoresSafeArea()
            }
            .onChange(of: selectedPhotosItem) { newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let uiImg = UIImage(data: data) {
                        let normalized = uiImg.fixedOrientation()
                        receiptImage = normalized
                        performOCR(on: normalized)
                    }
                }
            }
            .onChange(of: receiptImage) { newImg in
                if let img = newImg, initialImage == nil {
                    performOCR(on: img)
                }
            }
            .onAppear {
                if let initial = initialImage {
                    performOCR(on: initial)
                }
            }
        }
    }
    
    private func performOCR(on image: UIImage) {
        isScanningOCR = true
        HapticsService.light()
        
        Task {
            do {
                let result = try await ReceiptOCRService.shared.scanReceipt(from: image)
                await MainActor.run {
                    isScanningOCR = false
                    scanConfidence = result.confidence
                    
                    if let v = result.detectedVendor, vendor.isEmpty {
                        vendor = v
                    }
                    if let a = result.detectedAmount, amountString.isEmpty {
                        amountString = String(format: "%.2f", a)
                    }
                    if let c = result.suggestedCategory {
                        category = c
                    }
                    if let d = result.detectedDate {
                        expenseDate = d
                    }
                    if !result.extractedNotes.isEmpty && notes.isEmpty {
                        notes = result.extractedNotes
                    }
                    
                    ocrStatusMessage = "Detected \(vendor) • $\(amountString)"
                    HapticsService.success()
                }
            } catch {
                await MainActor.run {
                    isScanningOCR = false
                    HapticsService.error()
                }
            }
        }
    }
    
    private func saveExpense() {
        guard let amountVal = Double(amountString.replacingOccurrences(of: ",", with: "")), amountVal > 0 else {
            errorMessage = "Please enter a valid amount."
            HapticsService.error()
            return
        }
        
        isSaving = true
        errorMessage = nil
        HapticsService.medium()
        
        Task {
            do {
                var uploadedURL: String? = nil
                
                // 1. Upload receipt if image attached
                if let img = receiptImage, let jpegData = img.jpegData(compressionQuality: 0.8) {
                    let filename = "\(vendor.replacingOccurrences(of: " ", with: "_"))_Receipt.jpg"
                    uploadedURL = try await SupabaseService.shared.uploadReceipt(
                        imageData: jpegData,
                        projectId: selectedProjectId,
                        filename: filename
                    )
                }
                
                // 2. Format Date YYYY-MM-DD
                let dateFmt = DateFormatter()
                dateFmt.dateFormat = "yyyy-MM-dd"
                let dateStr = dateFmt.string(from: expenseDate)
                
                let input = CreateExpenseInput(
                    projectId: selectedProjectId,
                    category: category.rawValue,
                    vendor: vendor.trimmingCharacters(in: .whitespacesAndNewlines),
                    expenseDate: dateStr,
                    amount: amountVal,
                    receiptUrl: uploadedURL,
                    scanConfidence: scanConfidence ?? (uploadedURL != nil ? "high" : nil),
                    notes: notes.isEmpty ? nil : notes
                )
                
                let created = try await SupabaseService.shared.createExpense(input)
                await MainActor.run {
                    isSaving = false
                    HapticsService.success()
                    onSaved?(created)
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    errorMessage = error.localizedDescription
                    HapticsService.error()
                }
            }
        }
    }
}
