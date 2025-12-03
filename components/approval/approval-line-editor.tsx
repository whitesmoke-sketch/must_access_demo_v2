"use client";

import * as React from "react";
import { useRef } from "react";
import { Plus, User, Edit2, Trash2, GripVertical } from "lucide-react";
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
  showAddDialogExternal?: boolean; // 외부에서 다이얼로그 표시 제어
  onAddDialogChange?: (open: boolean) => void; // 외부에서 다이얼로그 상태 변경 알림
  hideAddButton?: boolean; // 하단 추가 버튼 숨김 (헤더에서 처리 시)
}

interface DraggableApprovalGroupProps {
  order: number;
  stepsInOrder: ApprovalStep[];
  allApprovers: ApprovalStep[];
  onEdit: (approverId: string) => void;
  onRemove: (approverId: string) => void;
  moveOrderGroup: (dragOrder: number, hoverOrder: number) => void;
}

const DraggableApprovalGroup: React.FC<DraggableApprovalGroupProps> = ({
  order,
  stepsInOrder,
  allApprovers,
  onEdit,
  onRemove,
  moveOrderGroup,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'APPROVAL_GROUP',
    item: { order },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'APPROVAL_GROUP',
    hover: (item: { order: number }) => {
      if (item.order !== order) {
        moveOrderGroup(item.order, order);
        item.order = order;
      }
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className="rounded-lg p-3"
      style={{
        backgroundColor: 'var(--muted)',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <div className="flex items-center gap-3">
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
            backgroundColor: 'rgba(99, 91, 255, 0.2)',
            fontSize: 'var(--font-size-caption)',
            fontWeight: 600,
            color: 'var(--primary)'
          }}
        >
          {order}
        </div>

        {/* Group Container */}
        <div className="flex-1 space-y-3">
          {stepsInOrder.map((step) => {
            // Role-based styling
            const roleStyle = step.approverRole === 'reviewer'
              ? { iconBg: 'rgba(248, 198, 83, 0.2)', iconColor: '#F8C653' }
              : { iconBg: 'rgba(99, 91, 255, 0.1)', iconColor: 'var(--primary)' };

            return (
              <div
                key={step.id}
                className="flex items-center gap-3"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: roleStyle.iconBg }}
                  >
                    <User className="w-5 h-5" style={{ color: roleStyle.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{
                      fontSize: 'var(--font-size-body)',
                      fontWeight: 600,
                      color: 'var(--foreground)',
                      lineHeight: 1.5
                    }}>
                      {step.isDelegated && step.delegateName
                        ? `${step.delegateName} (대결)`
                        : step.name}
                    </p>
                    <p style={{
                      fontSize: 'var(--font-size-caption)',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.4
                    }}>
                      {step.approverRole === 'reviewer' ? '합의자' : '결재자'} · {step.role}
                      {step.isDelegated && ` (원 결재자: ${step.name})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(step.id)}
                    className="h-8 w-9 p-0"
                    title="수정"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(step.id)}
                    className="h-8 w-9 p-0"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" style={{ color: 'var(--destructive)' }} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
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
  showAddDialogExternal,
  onAddDialogChange,
  hideAddButton = false,
}: ApprovalLineEditorProps) {
  const [showAddDialogInternal, setShowAddDialogInternal] = React.useState(false);

  // 외부 제어 또는 내부 상태 사용
  const showAddDialog = showAddDialogExternal !== undefined ? showAddDialogExternal : showAddDialogInternal;
  const setShowAddDialog = (open: boolean) => {
    if (onAddDialogChange) {
      onAddDialogChange(open);
    } else {
      setShowAddDialogInternal(open);
    }
  };
  const [showDelegateDialog, setShowDelegateDialog] = React.useState(false);
  const [editingApproverId, setEditingApproverId] = React.useState<string | null>(null);
  const [isDelegating, setIsDelegating] = React.useState(false);
  const [selectedApproverRole, setSelectedApproverRole] = React.useState<'approver' | 'reviewer'>('approver');
  const [selectedOrder, setSelectedOrder] = React.useState<number>(1);

  const handleAddApprover = (approver: Approver) => {
    const newApprover: ApprovalStep = {
      id: approver.id,
      name: approver.name,
      email: approver.email,
      role: approver.role,
      department: approver.department,
      approverRole: selectedApproverRole,
      order: selectedOrder,
    };
    onApproversChange([...approvers, newApprover]);
    setShowAddDialog(false);

    const roleLabel = selectedApproverRole === 'reviewer' ? '합의자' : '결재자';
    toast.success(`${roleLabel} 추가 완료`, {
      description: `${approver.name}님이 ${selectedOrder}순위로 추가되었습니다.`,
    });
  };

  const handleRemoveApprover = (approverId: string) => {
    const updated = approvers.filter((a) => a.id !== approverId);
    onApproversChange(updated);
    toast.success('제거되었습니다');
  };

  // 순번 그룹 이동 (드래그 앤 드롭용)
  const moveOrderGroup = (dragOrder: number, hoverOrder: number) => {
    if (dragOrder === hoverOrder) return;

    const newApprovers = approvers.map(approver => {
      if (approver.order === dragOrder) {
        return { ...approver, order: hoverOrder };
      } else if (approver.order === hoverOrder) {
        return { ...approver, order: dragOrder };
      }
      return approver;
    });

    onApproversChange(newApprovers);
  };

  const handleOpenEditDialog = (approverId: string, delegating: boolean = false) => {
    setEditingApproverId(approverId);
    setIsDelegating(delegating);
    setShowDelegateDialog(true);
  };

  const handleApproverChange = (approver: Approver) => {
    if (editingApproverId === null) return;

    const updated = approvers.map(a => {
      if (a.id !== editingApproverId) return a;

      if (isDelegating) {
        // 대결자 지정
        return {
          ...a,
          isDelegated: true,
          delegateId: approver.id,
          delegateName: approver.name,
        };
      } else {
        // 결재자 교체
        return {
          id: approver.id,
          name: approver.name,
          email: approver.email,
          role: approver.role,
          department: approver.department,
          isDelegated: false,
          approverRole: a.approverRole,
          order: a.order,
        };
      }
    });

    if (isDelegating) {
      toast.success('대결자 지정 완료', {
        description: `${approver.name}님을 대결자로 지정했습니다.`,
      });
    } else {
      toast.success('결재자 변경 완료', {
        description: `${approver.name}님으로 변경했습니다.`,
      });
    }

    onApproversChange(updated);
    setShowDelegateDialog(false);
    setEditingApproverId(null);
  };

  // 이미 선택된 승인자 ID 목록
  const excludeIds = approvers.map((a) => a.id);

  // 순번별로 그룹화
  const groupedApprovers: { [key: number]: ApprovalStep[] } = {};
  approvers.forEach(approver => {
    const order = approver.order || 1;
    if (!groupedApprovers[order]) {
      groupedApprovers[order] = [];
    }
    groupedApprovers[order].push(approver);
  });

  const orders = Object.keys(groupedApprovers).map(Number).sort((a, b) => a - b);

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
              color: 'var(--foreground)',
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

      {/* 결재자 목록 - 순번별 그룹화 */}
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
            {orders.map((order) => {
              const stepsInOrder = groupedApprovers[order];

              return (
                <DraggableApprovalGroup
                  key={order}
                  order={order}
                  stepsInOrder={stepsInOrder}
                  allApprovers={approvers}
                  onEdit={(approverId) => handleOpenEditDialog(approverId, false)}
                  onRemove={handleRemoveApprover}
                  moveOrderGroup={moveOrderGroup}
                />
              );
            })}
          </div>
        </DndProvider>
      )}

      {/* 결재자 추가 및 템플릿 버튼 */}
      <div className="flex items-center justify-between">
        {!hideAddButton ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // 다이얼로그 열 때 다음 순번으로 기본 설정
              const maxOrder = approvers.length > 0 ? Math.max(...approvers.map(a => a.order || 1)) : 0;
              setSelectedOrder(maxOrder + 1);
              setSelectedApproverRole('approver');
              setShowAddDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            결재선 추가
          </Button>
        ) : (
          <div /> // 빈 공간 (헤더에서 버튼 처리)
        )}

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
        <DialogContent
          className="!p-4 !border-0"
          style={{ backgroundColor: 'var(--background)' }}
        >
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
              역할과 순번을 선택하고 구성원을 추가하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--foreground)',
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
                color: 'var(--foreground)',
                lineHeight: 1.5
              }}>
                결재 순번
              </Label>
              <Select
                value={selectedOrder.toString()}
                onValueChange={(value) => setSelectedOrder(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const maxOrder = approvers.length > 0 ? Math.max(...approvers.map(a => a.order || 1)) : 0;
                    const existingOrders = [...new Set(approvers.map(a => a.order || 1))].sort((a, b) => a - b);
                    const newOrder = maxOrder + 1;
                    const options = approvers.length > 0 ? [...existingOrders, newOrder] : [1];
                    return options.map(order => (
                      <SelectItem key={order} value={order.toString()}>
                        {order}순위{existingOrders.includes(order) ? ' (기존 순번에 추가)' : ' (새 순번)'}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--foreground)',
                lineHeight: 1.5
              }}>
                구성원
              </Label>
              <ApproverSelector
                onSelectApprover={handleAddApprover}
                excludeIds={excludeIds}
                placeholder="구성원 검색 및 선택"
                autoCloseOnSelect={false}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowAddDialog(false)}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 결재자 변경/대결자 지정 다이얼로그 */}
      <Dialog open={showDelegateDialog} onOpenChange={setShowDelegateDialog}>
        <DialogContent
          className="!p-4 !border-0"
          style={{ backgroundColor: 'var(--background)' }}
        >
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

          <div className="space-y-4">
            <div className="space-y-2">
              <Label style={{
                fontSize: 'var(--font-size-body)',
                color: 'var(--foreground)',
                lineHeight: 1.5
              }}>
                구성원
              </Label>
              <ApproverSelector
                onSelectApprover={handleApproverChange}
                excludeIds={excludeIds}
                placeholder="구성원 검색 및 선택"
                autoCloseOnSelect={false}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => setShowDelegateDialog(false)}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
              }}
            >
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
