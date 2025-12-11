// Database Types for Phase 0
// This will be replaced by auto-generated types from Supabase CLI

/**
 * employee.status 값 정의:
 * - 'active': 재직 중 (연차/포상휴가 사용 중 포함)
 * - 'leave': 휴직 중 (육아휴직, 병가휴직 등)
 * - 퇴사: deleted_at IS NOT NULL로 판단 (status 무관)
 */
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
          status: 'active' | 'leave'  // 'inactive' → 'leave'로 변경
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

// User Status Types
export type UserStatus = 'online' | 'in_meeting' | 'lunch' | 'away' | 'offline' | 'vacation'

// Notification Type
export interface Notification {
  id: string
  message: string
  timestamp: string
  read: boolean
}
