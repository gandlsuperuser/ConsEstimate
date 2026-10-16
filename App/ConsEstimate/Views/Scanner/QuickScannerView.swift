import SwiftUI
import PhotosUI

struct QuickScannerView: View {
    @State private var selectedImage: UIImage? = nil
    @State private var isProcessing: Bool = false
    @State private var scanResult: OCRScanResult? = nil
    @State private var isUploading: Bool = false
    @State private var uploadSuccess: Bool = false
    @State private var showCamera: Bool = false
    @State private var photoItem: PhotosPickerItem? = nil
    @State private var errorMessage: String? = nil
    
    // Editable fields for review before 1-tap save
    @State private var vendor: String = ""
    @State private var amountString: String = ""
    @State private var category: ExpenseCategory = .materials
    @State private var notes: String = ""
    @State private var selectedProjectId: String = AppConfig.defaultProjectId
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let image = selectedImage {
                        // Image Preview Card
                        ZStack(alignment: .topTrailing) {
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFit()
                                .frame(maxHeight: 260)
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                                )
                            
                            Button {
                                resetScan()
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 28))
                                    .foregroundColor(.white)
                                    .shadow(radius: 3)
                                    .padding(10)
                            }
                        }
                        .padding(.horizontal, 16)
                        
                        if isProcessing {
                            VStack(spacing: 10) {
                                ProgressView()
                                    .scaleEffect(1.2)
                                Text("Analyzing receipt with Vision OCR...")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 120)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 16))
                            .padding(.horizontal, 16)
                        } else {
                            // Detected Fields Card
                            VStack(alignment: .leading, spacing: 16) {
                                HStack {
                                    Label("Detected Invoice Data", systemImage: "sparkles")
                                        .font(.headline)
                                        .foregroundColor(.accentColor)
                                    Spacer()
                                    if let res = scanResult {
                                        Text("\(res.confidence.capitalized) Confidence")
                                            .font(.caption2.bold())
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 4)
                                            .background(Color.green.opacity(0.15))
                                            .foregroundColor(.green)
                                            .clipShape(Capsule())
                                    }
                                }
                                
                                Divider()
                                
                                // Editable Vendor
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Vendor").font(.caption).foregroundColor(.secondary)
                                    TextField("Vendor Name", text: $vendor)
                                        .font(.system(size: 16, weight: .semibold))
                                        .textFieldStyle(.roundedBorder)
                                }
                                
                                // Editable Amount
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Total Amount").font(.caption).foregroundColor(.secondary)
                                    HStack {
                                        Text("$").font(.headline).foregroundColor(.secondary)
                                        TextField("0.00", text: $amountString)
                                            .font(.system(size: 20, weight: .bold, design: .rounded))
                                            .keyboardType(.decimalPad)
                                    }
                                    .padding(8)
                                    .background(Color(.tertiarySystemGroupedBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                                
                                // Category Picker
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Category").font(.caption).foregroundColor(.secondary)
                                    Picker("Category", selection: $category) {
                                        ForEach(ExpenseCategory.allCases) { cat in
                                            Label(cat.rawValue, systemImage: cat.iconName).tag(cat)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                }
                                
                                // Notes
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("Notes / Line Items").font(.caption).foregroundColor(.secondary)
                                    TextField("Notes", text: $notes, axis: .vertical)
                                        .lineLimit(2...4)
                                        .font(.system(size: 13))
                                        .textFieldStyle(.roundedBorder)
                                }
                            }
                            .padding(16)
                            .background(Color(.secondarySystemGroupedBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .padding(.horizontal, 16)
                            
                            // Save Button
                            if uploadSuccess {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                    Text("Expense Saved to Supabase!")
                                }
                                .font(.headline)
                                .foregroundColor(.white)
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(Color.green)
                                .clipShape(RoundedRectangle(cornerRadius: 14))
                                .padding(.horizontal, 16)
                            } else {
                                Button {
                                    uploadAndSave()
                                } label: {
                                    HStack {
                                        if isUploading {
                                            ProgressView()
                                                .tint(.white)
                                        } else {
                                            Image(systemName: "arrow.up.circle.fill")
                                            Text("Upload to Conviva Project")
                                        }
                                    }
                                    .font(.headline)
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 52)
                                    .background(Color.accentColor)
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                }
                                .disabled(isUploading || amountString.isEmpty || vendor.isEmpty)
                                .padding(.horizontal, 16)
                            }
                        }
                    } else {
                        // Empty Capture Landing
                        VStack(spacing: 24) {
                            ZStack {
                                Circle()
                                    .fill(Color.accentColor.opacity(0.12))
                                    .frame(width: 90, height: 90)
                                
                                Image(systemName: "doc.text.viewfinder")
                                    .font(.system(size: 44, weight: .medium))
                                    .foregroundColor(.accentColor)
                            }
                            .padding(.top, 40)
                            
                            VStack(spacing: 8) {
                                Text("Receipt & Invoice Scanner")
                                    .font(.system(size: 22, weight: .bold))
                                
                                Text("Instantly scan paper receipts, subcontractor invoices, and material slips in the field. Text, vendor, amounts, and dates are recognized automatically.")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                                    .multilineTextAlignment(.center)
                                    .padding(.horizontal, 24)
                            }
                            
                            VStack(spacing: 12) {
                                Button {
                                    showCamera = true
                                } label: {
                                    HStack(spacing: 10) {
                                        Image(systemName: "camera.fill")
                                        Text("Open Camera")
                                    }
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.white)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 52)
                                    .background(Color.accentColor)
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                }
                                
                                PhotosPicker(selection: $photoItem, matching: .images) {
                                    HStack(spacing: 10) {
                                        Image(systemName: "photo.on.rectangle")
                                        Text("Choose from Photo Library")
                                    }
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(.accentColor)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 52)
                                    .background(Color(.secondarySystemGroupedBackground))
                                    .clipShape(RoundedRectangle(cornerRadius: 14))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14)
                                            .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                                    )
                                }
                            }
                            .padding(.horizontal, 24)
                            .padding(.top, 16)
                        }
                    }
                    
                    if let err = errorMessage {
                        Text(err)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 16)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Quick Scanner")
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker(selectedImage: $selectedImage, sourceType: .camera)
                    .ignoresSafeArea()
            }
            .onChange(of: photoItem) { newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let img = UIImage(data: data) {
                        let normalized = img.fixedOrientation()
                        selectedImage = normalized
                        processImage(normalized)
                    }
                }
            }
            .onChange(of: selectedImage) { newImg in
                if let img = newImg {
                    processImage(img)
                }
            }
        }
    }
    
    private func processImage(_ img: UIImage) {
        isProcessing = true
        uploadSuccess = false
        errorMessage = nil
        HapticsService.light()
        
        Task {
            do {
                let res = try await ReceiptOCRService.shared.scanReceipt(from: img)
                await MainActor.run {
                    self.scanResult = res
                    self.isProcessing = false
                    if let v = res.detectedVendor { self.vendor = v }
                    if let a = res.detectedAmount { self.amountString = String(format: "%.2f", a) }
                    if let c = res.suggestedCategory { self.category = c }
                    if !res.extractedNotes.isEmpty { self.notes = res.extractedNotes }
                    HapticsService.success()
                }
            } catch {
                await MainActor.run {
                    self.isProcessing = false
                    self.errorMessage = error.localizedDescription
                    HapticsService.error()
                }
            }
        }
    }
    
    private func uploadAndSave() {
        guard let amountVal = Double(amountString.replacingOccurrences(of: ",", with: "")), amountVal > 0 else {
            errorMessage = "Please verify the amount."
            HapticsService.error()
            return
        }
        
        guard let img = selectedImage, let jpegData = img.jpegData(compressionQuality: 0.8) else {
            errorMessage = "No valid image buffer."
            return
        }
        
        isUploading = true
        errorMessage = nil
        HapticsService.medium()
        
        Task {
            do {
                let filename = "\(vendor.replacingOccurrences(of: " ", with: "_"))_QuickScan.jpg"
                let publicUrl = try await SupabaseService.shared.uploadReceipt(
                    imageData: jpegData,
                    projectId: selectedProjectId,
                    filename: filename
                )
                
                let dateFmt = DateFormatter()
                dateFmt.dateFormat = "yyyy-MM-dd"
                let dateStr = dateFmt.string(from: Date())
                
                let input = CreateExpenseInput(
                    projectId: selectedProjectId,
                    category: category.rawValue,
                    vendor: vendor.trimmingCharacters(in: .whitespacesAndNewlines),
                    expenseDate: dateStr,
                    amount: amountVal,
                    receiptUrl: publicUrl,
                    scanConfidence: scanResult?.confidence ?? "high",
                    notes: notes.isEmpty ? nil : notes
                )
                
                _ = try await SupabaseService.shared.createExpense(input)
                
                await MainActor.run {
                    self.isUploading = false
                    self.uploadSuccess = true
                    HapticsService.success()
                    
                    // Auto-reset after 2 seconds
                    DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                        self.resetScan()
                    }
                }
            } catch {
                await MainActor.run {
                    self.isUploading = false
                    self.errorMessage = error.localizedDescription
                    HapticsService.error()
                }
            }
        }
    }
    
    private func resetScan() {
        selectedImage = nil
        scanResult = nil
        vendor = ""
        amountString = ""
        notes = ""
        uploadSuccess = false
        errorMessage = nil
    }
}
