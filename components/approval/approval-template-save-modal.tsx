"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createApprovalTemplate } from "@/app/actions/approval";
import { toast } from "sonner";

interface ApprovalTemplateSaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestType: "leave" | "document";
  approverIds: string[];
  onSuccess?: () => void;
}

export function ApprovalTemplateSaveModal({
  open,
  onOpenChange,
  requestType,
  approverIds,
  onSuccess,
}: ApprovalTemplateSaveModalProps) {
  const [name, setName] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("템플릿 이름을 입력하세요");
      return;
    }

    if (approverIds.length === 0) {
      toast.error("최소 1명의 승인자가 필요합니다");
      return;
    }

    setSaving(true);
    const result = await createApprovalTemplate(
      name.trim(),
      requestType,
      approverIds,
      isDefault
    );

    if (result.success) {
      toast.success("결재선 템플릿이 저장되었습니다");
      setName("");
      setIsDefault(false);
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error || "템플릿 저장에 실패했습니다");
    }
    setSaving(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !saving) {
      setName("");
      setIsDefault(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>결재선 저장</DialogTitle>
          <DialogDescription>
            현재 결재선을 템플릿으로 저장합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">템플릿 이름</Label>
            <Input
              id="template-name"
              placeholder="예: 일반 연차 신청"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="default-template"
              checked={isDefault}
              onCheckedChange={(checked: boolean) => setIsDefault(checked === true)}
              disabled={saving}
            />
            <Label
              htmlFor="default-template"
              className="cursor-pointer text-sm font-normal"
            >
              기본 템플릿으로 설정
            </Label>
          </div>

          <div className="rounded-md bg-muted p-3">
            <p className="text-xs text-muted-foreground">
              기본 템플릿으로 설정하면 다음 신청 시 자동으로 이 결재선이
              적용됩니다. 기본 템플릿은 신청서 타입별로 1개만 설정할 수
              있습니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
