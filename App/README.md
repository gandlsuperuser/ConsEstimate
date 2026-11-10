# ConsEstimate iOS App 📱

A native iOS application built with **SwiftUI** and grounded in **Apple Human Interface Guidelines (HIG)**. It seamlessly integrates with the ConsEstimate platform backend (Supabase database & receipt storage) for real-time field operations, expense tracking, and on-device receipt/invoice scanning.

---

## 🚀 Key Features

1. **Receipt & Invoice OCR Scanner**
   - High-performance on-device text recognition using Apple's **Vision framework** (`VNRecognizeTextRequest`).
   - Automatically extracts **Vendor name**, **Total amount ($)**, **Invoice number**, **Date**, and **Scope notes**.
   - Auto-suggests construction categories (e.g. *HVAC*, *Framing*, *Electrical*, *Equipment*, *Demo*, *Materials*, *Labor*).

2. **Supabase Direct Integration**
   - Direct image upload to Supabase Storage (`receipts/<project_id>/<timestamp>-<filename>.jpg`).
   - Creates and updates rows in the `expenses` database table in real-time.
   - Synchronized with web application records (e.g., MHAC, Action Gypsum Supply, Reyes Electrical).

3. **Field Expense Tracking & Dashboard**
   - Live metrics: Total spend, number of invoices, highest spend category.
   - Project filter (e.g., **CONVIVA JOURDANTON**, **Marbach Project**) & category chips.
   - Interactive search by vendor, invoice number, notes, or amount.
   - Full-screen pinch-to-zoom receipt viewer with native sharing (`ShareLink`).
   - Swipe to delete with deletion confirmations and tactile haptics (`UIImpactFeedbackGenerator`).

4. **Expense Edit & Field Approval Workflow (Phase 2)**
   - Edit any scanned expense in-place via `EditExpenseSheet` (vendor name autocomplete, category picker, amount, date, notes, and receipt photo replacement).
   - 1-Tap Field Audit: Instantly **Approve**, **Flag for Review**, or reset status with audit timestamps embedded in the record.
   - Filter feed by approval status chips: *All*, *Approved*, *Pending Review*, *Flagged*.

5. **Professional PDF & CSV Report Generator**
   - Direct on-device vector PDF generation (`ExpenseReportService`) formatted to US Letter with header branding, KPI summary cards, and itemized ledger table.
   - Excel-compatible CSV export for seamless accounting or GC distribution.
   - Native iOS share sheet integration (`ShareActivityView`) for AirDrop, Files, Printing, or Messaging.

---

## 🛠 Project Structure

```
App/
├── project.yml                     # XcodeGen project specification
├── ConsEstimate.xcodeproj          # Generated Xcode project
├── ConsEstimate/
│   ├── Info.plist                  # Camera & Photo Library permissions
│   ├── ConsEstimateApp.swift       # App entry point
│   ├── Config/
│   │   └── AppConfig.swift         # Supabase endpoints & known constants
│   ├── Models/
│   │   ├── Project.swift           # Project data model
│   │   ├── Expense.swift           # Expense, ExpenseApprovalStatus, & Update inputs
│   │   └── ExpenseCategory.swift   # Categories with SF Symbols & theme colors
│   ├── Services/
│   │   ├── SupabaseService.swift   # REST API & Storage client (fetch, create, update, delete)
│   │   ├── ReceiptOCRService.swift # Apple Vision on-device OCR engine
│   │   ├── ExpenseReportService.swift # High-resolution PDF & CSV report generator
│   │   └── HapticsService.swift    # iOS tactile feedback
│   ├── Views/
│   │   ├── MainTabView.swift       # Root tab navigation
│   │   ├── Expenses/
│   │   │   ├── ExpensesView.swift      # Main dashboard with status filters & export
│   │   │   ├── ExpenseRowView.swift    # HIG-compliant table row with status badge
│   │   │   ├── ExpenseDetailView.swift # Detailed view with 1-tap approval & edit
│   │   │   ├── AddExpenseSheet.swift   # New expense modal with OCR
│   │   │   └── EditExpenseSheet.swift  # Edit existing expense & audit notes
│   │   ├── Scanner/
│   │   │   ├── QuickScannerView.swift   # 1-tap rapid field scan screen
│   │   │   ├── CameraPicker.swift       # Camera / photo picker wrapper
│   │   │   └── ReceiptImageViewer.swift # Pinch-to-zoom interactive viewer
│   │   ├── Projects/
│   │   │   └── ProjectsView.swift      # Projects rollup & status cards
│   │   └── Components/
│   │       ├── CategoryBadge.swift     # Styled category pill
│   │       ├── StatMetricCard.swift    # Top summary metrics card
│   │       └── ShareActivityView.swift # Native iOS share sheet wrapper
│   └── Assets.xcassets/            # App icons and dynamic accent colors
```

---

## 🏃‍♂️ How to Run in Xcode

1. Open the project in Xcode:
   ```bash
   cd App
   open ConsEstimate.xcodeproj
   ```
2. Select any **iOS Simulator** (e.g. iPhone 16 Pro) or your connected physical iPhone.
3. Press **Cmd + R** to build and run.

### Regenerating the Project File
If you add or rename files, you can regenerate the Xcode project at any time:
```bash
cd App
xcodegen generate
```
