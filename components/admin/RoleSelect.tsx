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

interface Role {
  id: number
  name: string
  code: string
  level: number
}

interface RoleSelectProps {
  value?: number | null
  onValueChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
}

export function RoleSelect({
  value,
  onValueChange,
  placeholder = '역할을 선택하세요',
  disabled = false,
}: RoleSelectProps) {
  const [open, setOpen] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(false)

  // Popover가 열릴 때만 roles를 fetch (중복 호출 방지)
  useEffect(() => {
    if (open && roles.length === 0) {
      loadRoles()
    }
  }, [open])

  async function loadRoles() {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('role')
      .select('*')
      .order('level', { ascending: true })

    if (error) {
      console.error('Failed to load roles:', error)
      setLoading(false)
      return
    }

    setRoles(data || [])
    setLoading(false)
  }

  const selectedRole = roles.find((r) => r.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedRole ? selectedRole.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="역할 검색..." />
          <CommandList>
            <CommandEmpty>
              {loading ? '로딩 중...' : '역할을 찾을 수 없습니다.'}
            </CommandEmpty>
            <CommandGroup>
              {roles.map((role) => (
                <CommandItem
                  key={role.id}
                  value={role.name}
                  onSelect={() => {
                    onValueChange(role.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === role.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="flex-1">{role.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    Lv.{role.level}
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
