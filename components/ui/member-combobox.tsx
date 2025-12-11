'use client'

import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
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

interface Member {
  id: string
  name: string
  email?: string
  position?: string
  department_id?: number
  team?: string
  role_id?: number
}

interface MemberComboboxProps {
  members: Member[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  autoCloseOnSelect?: boolean
}

export function MemberCombobox({
  members,
  value,
  onValueChange,
  placeholder = '구성원 선택',
  autoCloseOnSelect = true
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedMember = members.find(m => m.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedMember
            ? `${selectedMember.name} (${selectedMember.position || '직원'})`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[100]">
        <Command
          filter={(value, search) => {
            if (value.toLowerCase().includes(search.toLowerCase())) return 1
            return 0
          }}
        >
          <CommandInput placeholder="이름으로 검색..." />
          <CommandList className="max-h-64">
            <CommandEmpty>구성원을 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.name}
                  onSelect={() => {
                    onValueChange(member.id)
                    if (autoCloseOnSelect) {
                      setOpen(false)
                    }
                  }}
                >
                  <Check
                    className={`mr-2 h-4 w-4 ${
                      value === member.id ? 'opacity-100' : 'opacity-0'
                    }`}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{member.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {member.position || '직원'} · {member.team || '팀 정보 없음'}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
