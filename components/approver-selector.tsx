"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getEligibleApprovers, type Approver as ServerApprover } from "@/app/actions/approval";

// UI용 간소화된 Approver 타입
export interface Approver {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
}

interface ApproverSelectorProps {
  value?: string;
  onValueChange?: (value: string) => void;
  onSelectApprover?: (approver: Approver) => void; // 전체 객체 반환
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[]; // 이미 선택된 승인자 제외
}

export function ApproverSelector({
  value,
  onValueChange,
  onSelectApprover,
  placeholder = "승인자를 선택하세요",
  disabled = false,
  excludeIds = [],
}: ApproverSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [approvers, setApprovers] = React.useState<Approver[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadApprovers = async () => {
      setLoading(true);
      const result = await getEligibleApprovers();
      if (result.success && result.data) {
        // excludeIds에 포함된 승인자 제외하고 UI에 맞게 타입 변환
        const filtered: Approver[] = result.data
          .filter((approver: ServerApprover) => !excludeIds.includes(approver.id))
          .map((a: ServerApprover) => ({
            id: a.id,
            name: a.name,
            email: a.email,
            role: a.role?.name || '',
            department: a.department?.name || '',
          }));
        setApprovers(filtered);
      } else {
        console.error('Failed to load approvers:', result.error);
      }
      setLoading(false);
    };

    loadApprovers();
  }, [excludeIds]);

  const selectedApprover = approvers.find((approver) => approver.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || loading}
        >
          {loading ? (
            "로딩 중..."
          ) : selectedApprover ? (
            <span className="flex items-center gap-2 truncate">
              <span className="font-medium">{selectedApprover.name}</span>
              <span className="text-xs text-muted-foreground">
                {selectedApprover.role} · {selectedApprover.department}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="이름, 이메일, 부서로 검색..." />
          <CommandList>
            <CommandEmpty>승인자를 찾을 수 없습니다.</CommandEmpty>
            <CommandGroup>
              {approvers.map((approver) => (
                <CommandItem
                  key={approver.id}
                  value={`${approver.name} ${approver.email} ${approver.department}`}
                  onSelect={() => {
                    onValueChange?.(approver.id);
                    onSelectApprover?.(approver);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === approver.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{approver.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {approver.email}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {approver.role} · {approver.department}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
