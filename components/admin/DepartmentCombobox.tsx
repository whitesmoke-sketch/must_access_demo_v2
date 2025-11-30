'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createClient } from '@/lib/supabase/client'

interface Department {
  id: number
  name: string
  code: string
  parent_department_id: number | null
}

interface DepartmentWithPath extends Department {
  path: string // 예: "SI사업 > AI팀 > A-1팀"
  level: number
}

interface DepartmentComboboxProps {
  value?: number
  onValueChange: (value: number) => void
  placeholder?: string
}

export function DepartmentCombobox({
  value,
  onValueChange,
  placeholder = '조직을 선택하세요',
}: DepartmentComboboxProps) {
  const [open, setOpen] = useState(false)
  const [departments, setDepartments] = useState<DepartmentWithPath[]>([])
  const [loading, setLoading] = useState(false)

  // Popover가 열릴 때만 departments를 fetch (중복 호출 방지)
  useEffect(() => {
    if (open && departments.length === 0) {
      loadDepartments()
    }
  }, [open])

  async function loadDepartments() {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('department')
      .select('*')
      .order('code')

    if (error) {
      console.error('Failed to load departments:', error)
      setLoading(false)
      return
    }

    // 트리 구조를 평면화하고 경로 생성
    const departmentsWithPath = buildDepartmentPaths(data || [])
    setDepartments(departmentsWithPath)
    setLoading(false)
  }

  // Department 트리를 순회하며 전체 경로 생성
  function buildDepartmentPaths(depts: Department[]): DepartmentWithPath[] {
    const deptMap = new Map<number, Department>()
    depts.forEach((d) => deptMap.set(d.id, d))

    const result: DepartmentWithPath[] = []

    depts.forEach((dept) => {
      const path = getFullPath(dept, deptMap)
      const level = getLevel(dept, deptMap)
      result.push({
        ...dept,
        path,
        level,
      })
    })

    // level과 code로 정렬 (계층적 순서)
    return result.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level
      return a.code.localeCompare(b.code)
    })
  }

  // 전체 경로 생성 (예: "SI사업 > AI팀 > A-1팀")
  function getFullPath(dept: Department, deptMap: Map<number, Department>): string {
    const parts: string[] = []
    let current: Department | undefined = dept

    while (current) {
      parts.unshift(current.name)
      if (current.parent_department_id) {
        current = deptMap.get(current.parent_department_id)
      } else {
        break
      }
    }

    return parts.join(' > ')
  }

  // 계층 레벨 계산
  function getLevel(dept: Department, deptMap: Map<number, Department>): number {
    let level = 0
    let current: Department | undefined = dept

    while (current && current.parent_department_id) {
      level++
      current = deptMap.get(current.parent_department_id)
    }

    return level
  }

  const selectedDepartment = departments.find((d) => d.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedDepartment ? selectedDepartment.path : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="조직 검색..." />
          <CommandList>
            <CommandEmpty>
              {loading ? '로딩 중...' : '조직을 찾을 수 없습니다.'}
            </CommandEmpty>
            <CommandGroup>
              {departments.map((department) => (
                <CommandItem
                  key={department.id}
                  value={department.path}
                  onSelect={() => {
                    onValueChange(department.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === department.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span
                    className="flex-1"
                    style={{ paddingLeft: `${department.level * 12}px` }}
                  >
                    {department.path}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
