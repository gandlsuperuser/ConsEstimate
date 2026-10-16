import Foundation

enum AppConfig {
    static let supabaseURL = URL(string: "https://sqqlrbfjhluxpypajjcu.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxcWxyYmZqaGx1eHB5cGFqamN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzEzMTEsImV4cCI6MjA5NTUwNzMxMX0.3OaGn90XCo0EQuhCx02SzfCA5RyZ_LMSUGMn7ss2Xls"
    static let receiptsBucket = "receipts"
    
    // Default project ID for Conviva Jourdanton
    static let defaultProjectId = "1f2af6f8-7486-486c-b03e-334f6c88ec57"
    
    static let knownVendors = [
        "MHAC",
        "Action Gypsum Supply",
        "Reyes Electrical Contractors",
        "Max's Svc llc",
        "Golden West Oil Company",
        "Atascosa Brush Clearing, LLC",
        "Associated Glass, Ltd.",
        "Home Depot",
        "Lowe's",
        "Rental Services of Texas",
        "Scale Plans Service"
    ]
}
