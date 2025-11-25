"use client";

import * as React from "react";
import { X, ChevronUp, ChevronDown, Plus, User, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApproverSelector, type Approver } from "./approver-selector";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ApprovalStep {
  id: string; // approver_id
  name: string;
  email: string;
  role: string;
  department: string;
  isDelegated?: boolean;
  delegateId?: string;
  delegateName?: string;
}

interface CurrentUser {
  id: string;
  name: string;
  position?: string;
}

interface ApprovalLineEditorProps {
  approvers: ApprovalStep[];
  onApproversChange: (approvers: ApprovalStep[]) => void;
  onLoadTemplate?: () => void;
  onSaveTemplate?: () => void;
  showTemplateButtons?: boolean;
  currentUser?: CurrentUser;
}

export function ApprovalLineEditor({
  approvers,
  onApproversChange,
  onLoadTemplate,
  onSaveTemplate,
  showTemplateButtons = true,
  currentUser,
}: ApprovalLineEditorProps) {
  const [showSelector, setShowSelector] = React.useState(false);
  const [showDelegateDialog, setShowDelegateDialog] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [isDelegating, setIsDelegating] = React.useState(false);

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
    toast.success('결재자 추가 완료', {
      description: `${approver.name}님이 추가되었습니다.`,
    });
  };

  const handleRemoveApprover = (index: number) => {
    const updated = approvers.filter((_, i) => i !== index);
    onApproversChange(updated);
    toast.success('결재자가 제거되었습니다');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...approvers];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onApproversChange(updated);
    toast.success('결재 순서가 변경되었습니다');
  };

  const handleMoveDown = (index: number) => {
    if (index === approvers.length - 1) return;
    const updated = [...approvers];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onApproversChange(updated);
    toast.success('결재 순서가 변경되었습니다');
  };

  const handleOpenEditDialog = (index: number, delegating: boolean = false) => {
    setEditingIndex(index);
    setIsDelegating(delegating);
    setShowDelegateDialog(true);
  };

  const handleApproverChange = (approver: Approver) => {
    if (editingIndex === null) return;

    const updated = [...approvers];
    if (isDelegating) {
      // 대결자 지정
      updated[editingIndex] = {
        ...updated[editingIndex],
        isDelegated: true,
        delegateId: approver.id,
        delegateName: approver.name,
      };
      toast.success('대결자 지정 완료', {
        description: `${approver.name}님을 대결자로 지정했습니다.`,
      });
    } else {
      // 결재자 교체
      updated[editingIndex] = {
        id: approver.id,
        name: approver.name,
        email: approver.email,
        role: approver.role,
        department: approver.department,
        isDelegated: false,
      };
      toast.success('결재자 변경 완료', {
        description: `${approver.name}님으로 변경했습니다.`,
      });
    }
    onApproversChange(updated);
    setShowDelegateDialog(false);
    setEditingIndex(null);
  };

  // 이미 선택된 승인자 ID 목록
  const excludeIds = approvers.map((a) => a.id);

  return (
    <div className="space-y-6">
      {/* 신청자 */}
      {currentUser && (
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--muted)' }}
          >
            <User className="w-5 h-5" style={{ color: 'var(--muted-foreground)' }} />
          </div>
          <div className="flex-1">
            <p style={{
              fontSize: 'var(--font-size-body)',
              fontWeight: 600,
              color: 'var(--card-foreground)',
              lineHeight: 1.5
            }}>
              {currentUser.name}
            </p>
            <p style={{
              fontSize: 'var(--font-size-caption)',
              color: 'var(--muted-foreground)',
              lineHeight: 1.4
            }}>
              신청자{currentUser.position ? ` · ${currentUser.position}` : ''}
            </p>
          </div>
          <Badge style={{
            backgroundColor: 'rgba(22, 205, 199, 0.1)',
            color: 'var(--secondary)',
            fontSize: 'var(--font-size-caption)',
          }}>
            작성 중
          </Badge>
        </div>
      )}

      {/* 결재자 목록 */}
      {approvers.length === 0 ? (
        <div className="text-center py-8">
          <p style={{
            fontSize: 'var(--font-size-body)',
            color: 'var(--muted-foreground)',
            lineHeight: 1.5
          }}>
            결재선이 설정되지 않았습니다
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvers.map((approver, index) => (
            <div
              key={`${approver.id}-${index}`}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 rounded-lg"
              style={{ backgroundColor: '#F6F8F9' }}
            >
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: 'rgba(99, 91, 255, 0.2)',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--primary)'
                    }}
                  >
                    {index + 1}
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(99, 91, 255, 0.1)' }}
                  >
                    <User className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                  </div>
                </div>
                <div className="flex-1">
                  <p style={{
                    fontSize: 'var(--font-size-body)',
                    fontWeight: 600,
                    color: 'var(--card-foreground)',
                    lineHeight: 1.5
                  }}>
                    {approver.isDelegated && approver.delegateName
                      ? `${approver.delegateName} (대결)`
                      : approver.name}
                  </p>
                  <p style={{
                    fontSize: 'var(--font-size-caption)',
                    color: 'var(--muted-foreground)',
                    lineHeight: 1.4
                  }}>
                    결재자 · {approver.role}
                    {approver.isDelegated && ` (원 결재자: ${approver.name})`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 w-full md:w-auto md:ml-auto justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  style={{ opacity: index === 0 ? 0.3 : 1 }}
                  className="h-8 w-8 p-0"
                  title="위로 이동"
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === approvers.length - 1}
                  style={{ opacity: index === approvers.length - 1 ? 0.3 : 1 }}
                  className="h-8 w-8 p-0"
                  title="아래로 이동"
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditDialog(index, false)}
                  className="h-8 w-8 p-0"
                  title="결재자 변경"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveApprover(index)}
                  className="h-8 w-8 p-0"
                  title="제거"
                >
                  <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 결재자 추가 */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowSelector(!showSelector)}
        >
          <Plus className="w-4 h-4 mr-2" />
          결재자 추가
        </Button>

        {showTemplateButtons && (
          <div className="flex gap-2">
            {onLoadTemplate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onLoadTemplate}
              >
                템플릿 불러오기
              </Button>
            )}
            {onSaveTemplate && approvers.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSaveTemplate}
              >
                템플릿 저장
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 결재자 선택기 */}
      {showSelector && (
        <div className="space-y-2">
          <ApproverSelector
            onSelectApprover={handleAddApprover}
            excludeIds={excludeIds}
            placeholder="결재자를 검색하거나 선택하세요"
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
      )}

      {/* 결재자 변경/대결자 지정 다이얼로그 */}
      <Dialog open={showDelegateDialog} onOpenChange={setShowDelegateDialog}>
        <DialogContent style={{ backgroundColor: '#F8FAFC' }}>
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h2)',
              fontWeight: 'var(--font-weight-h2)',
              lineHeight: 1.3
            }}>
              {isDelegating ? '대결자 지정' : '결재자 변경'}
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-body)',
              lineHeight: 1.5
            }}>
              {isDelegating
                ? '결재를 대신 처리할 대결자를 선택하세요'
                : '새로운 결재자를 선택하세요'}
            </DialogDescription>
          </DialogHeader>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0px 2px 4px -1px rgba(175, 182, 201, 0.2)'
          }}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}>
                  {isDelegating ? '대결자 선택 *' : '결재자 선택 *'}
                </Label>
                <ApproverSelector
                  onSelectApprover={handleApproverChange}
                  excludeIds={excludeIds}
                  placeholder="구성원 검색 및 선택"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDelegateDialog(false);
                setEditingIndex(null);
              }}
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
