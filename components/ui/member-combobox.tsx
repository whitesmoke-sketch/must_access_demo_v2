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
}

export function MemberCombobox({
  members,
  value,
  onValueChange,
  placeholder = '구성원 선택'
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false)

  const selectedMember = members.find(m => m.id === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder="이름, 부서, 팀으로 검색..." />
          <CommandEmpty>구성원을 찾을 수 없습니다.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {members.map((member) => (
              <CommandItem
                key={member.id}
                value={`${member.name} ${member.position || ''} ${member.department_id || ''} ${member.team || ''}`}
                onSelect={() => {
                  onValueChange(member.id)
                  setOpen(false)
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
        </Command>
      </PopoverContent>
    </Popover>
  )
}
