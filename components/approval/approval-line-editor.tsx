"use client";

import * as React from "react";
import { X, ArrowUp, ArrowDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ApproverSelector, type Approver } from "./approver-selector";
import { cn } from "@/lib/utils";

export interface ApprovalStep {
  id: string; // approver_id
  name: string;
  email: string;
  role: string;
  department: string;
}

interface ApprovalLineEditorProps {
  approvers: ApprovalStep[];
  onApproversChange: (approvers: ApprovalStep[]) => void;
  onLoadTemplate?: () => void;
  onSaveTemplate?: () => void;
  showTemplateButtons?: boolean;
}

export function ApprovalLineEditor({
  approvers,
  onApproversChange,
  onLoadTemplate,
  onSaveTemplate,
  showTemplateButtons = true,
}: ApprovalLineEditorProps) {
  const [showSelector, setShowSelector] = React.useState(false);

  const handleAddApprover = (approver: Approver) => {
    const newApprover: ApprovalStep = {
      id: approver.id,
      name: approver.name,
      email: approver.email,
      role: approver.role,
      department: approver.department,
    };
    onApproversChange([...approvers, newApprover]);
    setShowSelector(false);
  };

  const handleRemoveApprover = (index: number) => {
    // 최소 1명은 유지
    if (approvers.length <= 1) {
      return;
    }
    const updated = approvers.filter((_, i) => i !== index);
    onApproversChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...approvers];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onApproversChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === approvers.length - 1) return;
    const updated = [...approvers];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onApproversChange(updated);
  };

  // 이미 선택된 승인자 ID 목록
  const excludeIds = approvers.map((a) => a.id);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">결재선 지정</h3>
            <span className="text-sm text-muted-foreground">
              ({approvers.length}명)
            </span>
          </div>
          {showTemplateButtons && (
            <div className="flex gap-2">
              {onLoadTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onLoadTemplate}
                >
                  불러오기
                </Button>
              )}
              {onSaveTemplate && approvers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onSaveTemplate}
                >
                  저장하기
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Approval Steps */}
        <div className="space-y-2">
          {approvers.map((approver, index) => (
            <div
              key={`${approver.id}-${index}`}
              className="flex items-center gap-2"
            >
              {/* Step Number */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </div>

              {/* Approver Info */}
              <div className="flex-1 rounded-md border bg-card p-3">
                <div className="flex items-center justify-between">
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

                  {/* Controls */}
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === approvers.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0",
                        approvers.length <= 1 &&
                          "cursor-not-allowed opacity-50"
                      )}
                      onClick={() => handleRemoveApprover(index)}
                      disabled={approvers.length <= 1}
                      title={
                        approvers.length <= 1
                          ? "최소 1명의 승인자가 필요합니다"
                          : "제거"
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Approver */}
        {showSelector ? (
          <div className="space-y-2">
            <ApproverSelector
              onSelectApprover={handleAddApprover}
              excludeIds={excludeIds}
              placeholder="승인자를 검색하거나 선택하세요"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowSelector(false)}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShowSelector(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            승인자 추가
          </Button>
        )}
      </div>
    </Card>
  );
}
