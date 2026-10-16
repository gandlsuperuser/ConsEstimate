import Foundation

final class SupabaseService {
    static let shared = SupabaseService()
    
    private let baseURL = AppConfig.supabaseURL
    private let anonKey = AppConfig.supabaseAnonKey
    
    private init() {}
    
    // MARK: - Headers Helper
    private func makeHeaders(isJSON: Bool = true) -> [String: String] {
        var headers = [
            "apikey": anonKey,
            "Authorization": "Bearer \(anonKey)"
        ]
        if isJSON {
            headers["Content-Type"] = "application/json"
        }
        return headers
    }
    
    // MARK: - Projects
    func fetchProjects() async throws -> [Project] {
        let url = baseURL.appendingPathComponent("rest/v1/projects")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "created_at.desc")
        ]
        
        var request = URLRequest(url: components.url!)
        for (k, v) in makeHeaders() {
            request.setValue(v, forHTTPHeaderField: k)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "Unknown server error"
            throw NSError(domain: "SupabaseService", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
        }
        
        return try JSONDecoder().decode([Project].self, from: data)
    }
    
    // MARK: - Expenses
    func fetchExpenses(projectId: String? = nil) async throws -> [Expense] {
        let url = baseURL.appendingPathComponent("rest/v1/expenses")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        var items = [
            URLQueryItem(name: "select", value: "*"),
            URLQueryItem(name: "order", value: "expense_date.desc,created_at.desc")
        ]
        
        if let projectId = projectId, !projectId.isEmpty {
            items.append(URLQueryItem(name: "project_id", value: "eq.\(projectId)"))
        }
        components.queryItems = items
        
        var request = URLRequest(url: components.url!)
        for (k, v) in makeHeaders() {
            request.setValue(v, forHTTPHeaderField: k)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "Failed to fetch expenses"
            throw NSError(domain: "SupabaseService", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
        }
        
        return try JSONDecoder().decode([Expense].self, from: data)
    }
    
    // MARK: - Storage Receipt Upload
    func uploadReceipt(imageData: Data, projectId: String, filename: String) async throws -> String {
        let sanitizedProject = projectId.isEmpty ? AppConfig.defaultProjectId : projectId
        let timestamp = Int(Date().timeIntervalSince1970 * 1000)
        let cleanName = filename.replacingOccurrences(of: " ", with: "_")
        let storagePath = "\(sanitizedProject)/\(timestamp)-\(cleanName)"
        
        // Supabase storage upload endpoint: /storage/v1/object/receipts/<path>
        let uploadURL = baseURL
            .appendingPathComponent("storage/v1/object")
            .appendingPathComponent(AppConfig.receiptsBucket)
            .appendingPathComponent(storagePath)
        
        var request = URLRequest(url: uploadURL)
        request.httpMethod = "POST"
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        request.setValue("true", forHTTPHeaderField: "x-upsert")
        request.httpBody = imageData
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "Failed to upload image"
            throw NSError(domain: "SupabaseService", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
        }
        
        // Construct public URL
        let publicURL = "\(baseURL.absoluteString)/storage/v1/object/public/\(AppConfig.receiptsBucket)/\(storagePath)"
        return publicURL
    }
    
    // MARK: - Create Expense
    func createExpense(_ input: CreateExpenseInput) async throws -> Expense {
        let url = baseURL.appendingPathComponent("rest/v1/expenses")
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        for (k, v) in makeHeaders() {
            request.setValue(v, forHTTPHeaderField: k)
        }
        request.setValue("return=representation", forHTTPHeaderField: "Prefer")
        
        let encoder = JSONEncoder()
        request.httpBody = try encoder.encode(input)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "Failed to save expense"
            throw NSError(domain: "SupabaseService", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
        }
        
        let results = try JSONDecoder().decode([Expense].self, from: data)
        guard let created = results.first else {
            throw NSError(domain: "SupabaseService", code: -1, userInfo: [NSLocalizedDescriptionKey: "No expense returned from server"])
        }
        return created
    }
    
    // MARK: - Delete Expense
    func deleteExpense(id: String) async throws {
        let url = baseURL.appendingPathComponent("rest/v1/expenses")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [
            URLQueryItem(name: "id", value: "eq.\(id)")
        ]
        
        var request = URLRequest(url: components.url!)
        request.httpMethod = "DELETE"
        for (k, v) in makeHeaders(isJSON: false) {
            request.setValue(v, forHTTPHeaderField: k)
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let msg = String(data: data, encoding: .utf8) ?? "Failed to delete expense"
            throw NSError(domain: "SupabaseService", code: (response as? HTTPURLResponse)?.statusCode ?? -1, userInfo: [NSLocalizedDescriptionKey: msg])
        }
    }
}
