import SwiftUI

struct ExpensesView: View {
    @State private var expenses: [Expense] = []
    @State private var projects: [Project] = []
    @State private var selectedProjectId: String? = nil
    @State private var selectedCategory: ExpenseCategory? = nil
    @State private var selectedStatus: ExpenseApprovalStatus? = nil
    @State private var searchText: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil
    @State private var showingAddSheet: Bool = false
    
    // Export State
    @State private var reportShareURL: URL? = nil
    @State private var isExportingReport: Bool = false
    
    // Summary Calculations
    private var filteredExpenses: [Expense] {
        expenses.filter { exp in
            let matchesProject = (selectedProjectId == nil || exp.projectId == selectedProjectId)
            let matchesCategory = (selectedCategory == nil || exp.category == selectedCategory?.rawValue)
            let matchesStatus = (selectedStatus == nil || exp.approvalStatus == selectedStatus)
            let matchesSearch = searchText.isEmpty ||
                exp.vendor.localizedCaseInsensitiveContains(searchText) ||
                exp.cleanNotes.localizedCaseInsensitiveContains(searchText) ||
                exp.category.localizedCaseInsensitiveContains(searchText) ||
                exp.formattedAmount.contains(searchText)
            
            return matchesProject && matchesCategory && matchesStatus && matchesSearch
        }
    }
    
    private var totalSpend: Double {
        filteredExpenses.reduce(0) { $0 + $1.amount }
    }
    
    private var formattedTotalSpend: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: totalSpend)) ?? String(format: "$%.2f", totalSpend)
    }
    
    private var approvedCount: Int {
        filteredExpenses.filter { $0.approvalStatus == .approved }.count
    }
    
    private var pendingCount: Int {
        filteredExpenses.filter { $0.approvalStatus == .pending }.count
    }
    
    private var flaggedCount: Int {
        filteredExpenses.filter { $0.approvalStatus == .flagged }.count
    }
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Top Metrics Bar
                VStack(spacing: 10) {
                    HStack(spacing: 10) {
                        StatMetricCard(
                            title: "Total Logged",
                            value: formattedTotalSpend,
                            icon: "dollarsign.circle.fill",
                            color: .green,
                            subtitle: "\(filteredExpenses.count) Invoices"
                        )
                        
                        StatMetricCard(
                            title: "Audit Status",
                            value: "\(approvedCount) Approved",
                            icon: "checkmark.seal.fill",
                            color: approvedCount >= flaggedCount ? .accentColor : .orange,
                            subtitle: "\(pendingCount) Pending • \(flaggedCount) Flagged"
                        )
                    }
                    .padding(.horizontal, 16)
                    
                    // Filter Bar: Categories
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            FilterChip(title: "All Categories", isSelected: selectedCategory == nil) {
                                selectedCategory = nil
                                HapticsService.selection()
                            }
                            
                            ForEach(ExpenseCategory.allCases) { cat in
                                FilterChip(
                                    title: cat.rawValue,
                                    icon: cat.iconName,
                                    color: cat.badgeColor,
                                    isSelected: selectedCategory == cat
                                ) {
                                    selectedCategory = (selectedCategory == cat) ? nil : cat
                                    HapticsService.selection()
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    
                    // Filter Bar: Approval Status
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            FilterChip(
                                title: "All Status",
                                isSelected: selectedStatus == nil
                            ) {
                                selectedStatus = nil
                                HapticsService.selection()
                            }
                            
                            ForEach(ExpenseApprovalStatus.allCases) { st in
                                FilterChip(
                                    title: st.title,
                                    icon: st.iconName,
                                    color: st.color,
                                    isSelected: selectedStatus == st
                                ) {
                                    selectedStatus = (selectedStatus == st) ? nil : st
                                    HapticsService.selection()
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 8)
                .background(Color(.systemGroupedBackground))
                
                // Expense List
                if isLoading && expenses.isEmpty {
                    Spacer()
                    ProgressView("Loading expenses...")
                    Spacer()
                } else if filteredExpenses.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "tray.fill")
                            .font(.system(size: 44))
                            .foregroundColor(.secondary)
                        Text("No matching expenses")
                            .font(.headline)
                        Text("Try resetting filters or tap + above to record a new invoice.")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                        
                        if selectedCategory != nil || selectedStatus != nil || selectedProjectId != nil {
                            Button("Reset Filters") {
                                selectedCategory = nil
                                selectedStatus = nil
                                selectedProjectId = nil
                                HapticsService.impact(.light)
                            }
                            .buttonStyle(.borderedProminent)
                            .padding(.top, 4)
                        }
                    }
                    Spacer()
                } else {
                    List {
                        ForEach(filteredExpenses) { expense in
                            NavigationLink {
                                ExpenseDetailView(
                                    expense: expense,
                                    projects: projects,
                                    onDelete: {
                                        expenses.removeAll { $0.id == expense.id }
                                    },
                                    onUpdate: { updated in
                                        if let idx = expenses.firstIndex(where: { $0.id == updated.id }) {
                                            expenses[idx] = updated
                                        }
                                    }
                                )
                            } label: {
                                ExpenseRowView(expense: expense)
                            }
                        }
                        .onDelete(perform: deleteRows)
                    }
                    .listStyle(.insetGrouped)
                    .refreshable {
                        await refreshData()
                    }
                }
            }
            .background(Color(.systemGroupedBackground))
            .searchable(text: $searchText, prompt: "Search vendor, notes, amount...")
            .navigationTitle("Expenses")
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Menu {
                        Button {
                            selectedProjectId = nil
                            HapticsService.selection()
                        } label: {
                            HStack {
                                Text("All Projects")
                                if selectedProjectId == nil { Image(systemName: "checkmark") }
                            }
                        }
                        
                        Divider()
                        
                        ForEach(projects) { p in
                            Button {
                                selectedProjectId = p.id
                                HapticsService.selection()
                            } label: {
                                HStack {
                                    Text(p.name)
                                    if selectedProjectId == p.id { Image(systemName: "checkmark") }
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "building.2")
                            Text(currentProjectName)
                                .font(.system(size: 14, weight: .semibold))
                            Image(systemName: "chevron.down")
                                .font(.system(size: 10, weight: .bold))
                        }
                        .foregroundColor(.primary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color(.secondarySystemGroupedBackground))
                        .clipShape(Capsule())
                    }
                }
                
                ToolbarItem(placement: .primaryAction) {
                    HStack(spacing: 14) {
                        // Export Report Menu
                        Menu {
                            Button {
                                exportPDFReport()
                            } label: {
                                Label("Export Summary PDF", systemImage: "doc.richtext")
                            }
                            
                            Button {
                                exportCSVReport()
                            } label: {
                                Label("Export Detail CSV (Excel)", systemImage: "tablecells")
                            }
                        } label: {
                            if isExportingReport {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.system(size: 15, weight: .semibold))
                            }
                        }
                        .disabled(filteredExpenses.isEmpty || isExportingReport)
                        
                        // Add Button
                        Button {
                            showingAddSheet = true
                            HapticsService.impact(.light)
                        } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 16, weight: .bold))
                        }
                    }
                }
            }
            .sheet(isPresented: $showingAddSheet) {
                AddExpenseSheet(projects: projects) { _ in
                    loadData()
                }
            }
            .sheet(isPresented: Binding(
                get: { reportShareURL != nil },
                set: { if !$0 { reportShareURL = nil } }
            )) {
                if let url = reportShareURL {
                    ShareActivityView(activityItems: [url])
                }
            }
            .task {
                loadData()
            }
        }
    }
    
    // MARK: - Export Logic
    private func exportPDFReport() {
        isExportingReport = true
        HapticsService.impact(.light)
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let projectName = currentProjectName == "All Projects" ? nil : currentProjectName
                let url = try ExpenseReportService.shared.generatePDF(
                    expenses: self.filteredExpenses,
                    projects: self.projects,
                    title: "Expense & Audit Report",
                    projectFilterName: projectName
                )
                DispatchQueue.main.async {
                    self.reportShareURL = url
                    self.isExportingReport = false
                    HapticsService.notification(.success)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isExportingReport = false
                    self.errorMessage = error.localizedDescription
                    HapticsService.notification(.error)
                }
            }
        }
    }
    
    private func exportCSVReport() {
        isExportingReport = true
        HapticsService.impact(.light)
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                let url = try ExpenseReportService.shared.generateCSV(
                    expenses: self.filteredExpenses,
                    projects: self.projects
                )
                DispatchQueue.main.async {
                    self.reportShareURL = url
                    self.isExportingReport = false
                    HapticsService.notification(.success)
                }
            } catch {
                DispatchQueue.main.async {
                    self.isExportingReport = false
                    self.errorMessage = error.localizedDescription
                    HapticsService.notification(.error)
                }
            }
        }
    }
    
    private var currentProjectName: String {
        if let id = selectedProjectId, let match = projects.first(where: { $0.id == id }) {
            return match.name
        }
        return "All Projects"
    }
    
    private func loadData() {
        isLoading = true
        Task {
            do {
                async let fetchedProjects = SupabaseService.shared.fetchProjects()
                async let fetchedExpenses = SupabaseService.shared.fetchExpenses()
                
                let (p, e) = try await (fetchedProjects, fetchedExpenses)
                await MainActor.run {
                    self.projects = p
                    self.expenses = e
                    self.isLoading = false
                }
            } catch {
                await MainActor.run {
                    self.errorMessage = error.localizedDescription
                    self.isLoading = false
                }
            }
        }
    }
    
    private func refreshData() async {
        do {
            async let fetchedProjects = SupabaseService.shared.fetchProjects()
            async let fetchedExpenses = SupabaseService.shared.fetchExpenses()
            let (p, e) = try await (fetchedProjects, fetchedExpenses)
            self.projects = p
            self.expenses = e
            HapticsService.impact(.light)
        } catch {
            self.errorMessage = error.localizedDescription
        }
    }
    
    private func deleteRows(at offsets: IndexSet) {
        let toDelete = offsets.map { filteredExpenses[$0] }
        for exp in toDelete {
            Task {
                try? await SupabaseService.shared.deleteExpense(id: exp.id)
            }
        }
        expenses.removeAll { exp in toDelete.contains(where: { $0.id == exp.id }) }
        HapticsService.impact(.medium)
    }
}

private struct FilterChip: View {
    let title: String
    var icon: String? = nil
    var color: Color? = nil
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.system(size: 11))
                }
                Text(title)
                    .font(.system(size: 13, weight: isSelected ? .bold : .medium))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(isSelected ? (color ?? Color.accentColor) : Color(.secondarySystemGroupedBackground))
            .foregroundColor(isSelected ? .white : .primary)
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.clear : Color.secondary.opacity(0.2), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}
