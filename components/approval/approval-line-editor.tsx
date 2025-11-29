"use client";

import * as React from "react";
import { useRef } from "react";
import { ChevronUp, ChevronDown, Plus, User, Edit2, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ApproverSelector, type Approver } from "./approver-selector";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export interface ApprovalStep {
  id: string; // approver_id
  name: string;
  email: string;
  role: string;
  department: string;
  isDelegated?: boolean;
  delegateId?: string;
  delegateName?: string;
  approverRole?: 'approver' | 'reviewer'; // 결재자 vs 합의자
  order?: number; // 순번
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

interface DraggableApprovalItemProps {
  approver: ApprovalStep;
  index: number;
  moveApprover: (dragIndex: number, hoverIndex: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  isFirst: boolean;
  isLast: boolean;
}

const DraggableApprovalItem: React.FC<DraggableApprovalItemProps> = ({
  approver,
  index,
  moveApprover,
  onEdit,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'APPROVAL_ITEM',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'APPROVAL_ITEM',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveApprover(item.index, index);
        item.index = index;
      }
    },
  });

  drag(drop(ref));

  // Role-based styling
  const isReviewer = approver.approverRole === 'reviewer';
  const roleStyle = isReviewer
    ? { iconBg: 'rgba(248, 198, 83, 0.2)', iconColor: '#F8C653' }
    : { iconBg: 'rgba(99, 91, 255, 0.1)', iconColor: 'var(--primary)' };

  return (
    <div
      ref={ref}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 rounded-lg"
      style={{
        backgroundColor: 'var(--muted)',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {/* Drag Handle */}
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: '16px',
            height: '16px',
            cursor: 'grab'
          }}
        >
          <GripVertical className="w-4 h-4" style={{ color: 'var(--muted-foreground)' }} />
        </div>

        {/* Order Badge */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            backgroundColor: isReviewer ? 'rgba(248, 198, 83, 0.2)' : 'rgba(99, 91, 255, 0.2)',
            fontSize: '14px',
            fontWeight: 600,
            color: isReviewer ? '#F8C653' : 'var(--primary)'
          }}
        >
          {index + 1}
        </div>

        {/* User Icon */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: roleStyle.iconBg }}
        >
          <User className="w-5 h-5" style={{ color: roleStyle.iconColor }} />
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
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
            {isReviewer ? '합의자' : '결재자'} · {approver.role}
            {approver.isDelegated && ` (원 결재자: ${approver.name})`}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 w-full md:w-auto md:ml-auto justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onMoveUp(index)}
          disabled={isFirst}
          style={{ opacity: isFirst ? 0.3 : 1 }}
          className="h-8 w-8 p-0"
          title="위로 이동"
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onMoveDown(index)}
          disabled={isLast}
          style={{ opacity: isLast ? 0.3 : 1 }}
          className="h-8 w-8 p-0"
          title="아래로 이동"
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(index)}
          className="h-8 w-8 p-0"
          title="결재자 변경"
        >
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="h-8 w-8 p-0"
          title="제거"
        >
          <Trash2 className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
        </Button>
      </div>
    </div>
  );
};

export function ApprovalLineEditor({
  approvers,
  onApproversChange,
  onLoadTemplate,
  onSaveTemplate,
  showTemplateButtons = true,
  currentUser,
}: ApprovalLineEditorProps) {
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [showDelegateDialog, setShowDelegateDialog] = React.useState(false);
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null);
  const [isDelegating, setIsDelegating] = React.useState(false);
  const [selectedApproverRole, setSelectedApproverRole] = React.useState<'approver' | 'reviewer'>('approver');

  const handleAddApprover = (approver: Approver) => {
    const newApprover: ApprovalStep = {
      id: approver.id,
      name: approver.name,
      email: approver.email,
      role: approver.role,
      department: approver.department,
      approverRole: selectedApproverRole,
      order: approvers.length + 1,
    };
    onApproversChange([...approvers, newApprover]);
    setShowAddDialog(false);

    const roleLabel = selectedApproverRole === 'reviewer' ? '합의자' : '결재자';
    toast.success(`${roleLabel} 추가 완료`, {
      description: `${approver.name}님이 추가되었습니다.`,
    });
  };

  const handleRemoveApprover = (index: number) => {
    const updated = approvers.filter((_, i) => i !== index);
    onApproversChange(updated);
    toast.success('제거되었습니다');
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...approvers];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    onApproversChange(updated);
    toast.success('순서가 변경되었습니다');
  };

  const handleMoveDown = (index: number) => {
    if (index === approvers.length - 1) return;
    const updated = [...approvers];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    onApproversChange(updated);
    toast.success('순서가 변경되었습니다');
  };

  const moveApprover = (dragIndex: number, hoverIndex: number) => {
    const updated = [...approvers];
    const [dragged] = updated.splice(dragIndex, 1);
    updated.splice(hoverIndex, 0, dragged);
    onApproversChange(updated);
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
        approverRole: updated[editingIndex].approverRole,
        order: updated[editingIndex].order,
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
        <DndProvider backend={HTML5Backend}>
          <div className="space-y-3">
            {approvers.map((approver, index) => (
              <DraggableApprovalItem
                key={`${approver.id}-${index}`}
                approver={approver}
                index={index}
                moveApprover={moveApprover}
                onEdit={(i) => handleOpenEditDialog(i, false)}
                onRemove={handleRemoveApprover}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isFirst={index === 0}
                isLast={index === approvers.length - 1}
              />
            ))}
          </div>
        </DndProvider>
      )}

      {/* 결재자 추가 */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          결재선 추가
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

      {/* 결재선 추가 다이얼로그 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent style={{ backgroundColor: 'var(--background)' }}>
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h4)',
              fontWeight: 'var(--font-weight-h4)',
              lineHeight: 1.3,
              color: 'var(--foreground)',
            }}>
              결재선 추가
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              color: 'var(--muted-foreground)',
            }}>
              역할을 선택하고 구성원을 추가하세요
            </DialogDescription>
          </DialogHeader>

          <div style={{
            backgroundColor: 'var(--card)',
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
                  역할
                </Label>
                <Select
                  value={selectedApproverRole}
                  onValueChange={(value: 'approver' | 'reviewer') => setSelectedApproverRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approver">결재자</SelectItem>
                    <SelectItem value="reviewer">합의자</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label style={{
                  fontSize: 'var(--font-size-body)',
                  fontWeight: 500,
                  lineHeight: 1.5
                }}>
                  구성원 선택 *
                </Label>
                <ApproverSelector
                  onSelectApprover={handleAddApprover}
                  excludeIds={excludeIds}
                  placeholder="구성원 검색 및 선택"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 결재자 변경/대결자 지정 다이얼로그 */}
      <Dialog open={showDelegateDialog} onOpenChange={setShowDelegateDialog}>
        <DialogContent style={{ backgroundColor: 'var(--background)' }}>
          <DialogHeader>
            <DialogTitle style={{
              fontSize: 'var(--font-size-h4)',
              fontWeight: 'var(--font-weight-h4)',
              lineHeight: 1.3,
              color: 'var(--foreground)',
            }}>
              {isDelegating ? '대결자 지정' : '결재자 변경'}
            </DialogTitle>
            <DialogDescription style={{
              fontSize: 'var(--font-size-caption)',
              lineHeight: 1.4,
              color: 'var(--muted-foreground)',
            }}>
              {isDelegating
                ? '결재를 대신 처리할 대결자를 선택하세요'
                : '새로운 결재자를 선택하세요'}
            </DialogDescription>
          </DialogHeader>

          <div style={{
            backgroundColor: 'var(--card)',
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
