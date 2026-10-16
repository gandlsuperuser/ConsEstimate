import SwiftUI

struct MainTabView: View {
    @State private var selectedTab: Int = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            ExpensesView()
                .tabItem {
                    Label("Expenses", systemImage: "receipt.fill")
                }
                .tag(0)
            
            QuickScannerView()
                .tabItem {
                    Label("Quick Scan", systemImage: "camera.viewfinder")
                }
                .tag(1)
            
            ProjectsView()
                .tabItem {
                    Label("Projects", systemImage: "building.2.fill")
                }
                .tag(2)
        }
        .tint(Color.accentColor)
    }
}
