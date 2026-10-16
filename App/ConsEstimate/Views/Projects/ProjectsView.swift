import SwiftUI

struct ProjectsView: View {
    @State private var projects: [Project] = []
    @State private var expenses: [Expense] = []
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil
    
    var body: some View {
        NavigationStack {
            Group {
                if isLoading && projects.isEmpty {
                    ProgressView("Loading projects...")
                } else if projects.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "building.2")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No projects available")
                            .font(.headline)
                    }
                } else {
                    List {
                        ForEach(projects) { project in
                            ProjectCard(project: project, expenses: expenses.filter { $0.projectId == project.id })
                        }
                    }
                    .listStyle(.insetGrouped)
                    .refreshable {
                        await loadData()
                    }
                }
            }
            .navigationTitle("Projects")
            .task {
                await loadData()
            }
        }
    }
    
    private func loadData() async {
        isLoading = true
        do {
            async let fetchedProjects = SupabaseService.shared.fetchProjects()
            async let fetchedExpenses = SupabaseService.shared.fetchExpenses()
            let (p, e) = try await (fetchedProjects, fetchedExpenses)
            self.projects = p
            self.expenses = e
            self.isLoading = false
        } catch {
            self.errorMessage = error.localizedDescription
            self.isLoading = false
        }
    }
}

private struct ProjectCard: View {
    let project: Project
    let expenses: [Expense]
    
    private var totalSpent: Double {
        expenses.reduce(0) { $0 + $1.amount }
    }
    
    private var formattedTotal: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: "en_US")
        return formatter.string(from: NSNumber(value: totalSpent)) ?? "$\(totalSpent)"
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(project.name)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.primary)
                Spacer()
                Text((project.status ?? "active").uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Color.green.opacity(0.15))
                    .foregroundColor(.green)
                    .clipShape(Capsule())
            }
            
            if let address = project.address {
                HStack(spacing: 6) {
                    Image(systemName: "mappin.and.ellipse")
                        .font(.caption)
                    Text(address)
                        .font(.caption)
                }
                .foregroundColor(.secondary)
            }
            
            Divider()
            
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Total Expenses")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(formattedTotal)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Logged Invoices")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("\(expenses.count)")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(.accentColor)
                }
            }
        }
        .padding(.vertical, 6)
    }
}
