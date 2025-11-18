// Database Types for Phase 0
// This will be replaced by auto-generated types from Supabase CLI

export interface Database {
  public: {
    Tables: {
      employee: {
        Row: {
          id: string
          name: string
          email: string
          department_id: string
          team: string | null
          position: string | null
          role_id: string
          join_date: string | null
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
      }
      role: {
        Row: {
          id: string
          code: 'employee' | 'admin' | 'super_admin'
          name: string
          created_at: string
        }
      }
      department: {
        Row: {
          id: string
          name: string
          created_at: string
        }
      }
    }
  }
}

// Helper types for queries with joins
export type EmployeeWithRole = {
  id: string
  name: string
  email: string
  role: {
    code: string
    name: string
  }
}
