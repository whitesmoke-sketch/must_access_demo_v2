"use client";

import * as React from "react";
import { Trash2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  getApprovalTemplates,
  deleteApprovalTemplate,
} from "@/app/actions/approval";
import { toast } from "sonner";

interface ApprovalTemplate {
  id: string;
  name: string;
  is_default: boolean;
  approvers: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
  }>;
}

interface ApprovalTemplateLoadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestType: "leave" | "document";
  onSelectTemplate: (template: ApprovalTemplate) => void;
}

export function ApprovalTemplateLoadModal({
  open,
  onOpenChange,
  requestType,
  onSelectTemplate,
}: ApprovalTemplateLoadModalProps) {
  const [templates, setTemplates] = React.useState<ApprovalTemplate[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requestType]);

  const loadTemplates = async () => {
    setLoading(true);
    const result = await getApprovalTemplates(requestType);
    if (result.success && result.data) {
      setTemplates(result.data);
    }
    setLoading(false);
  };

  const handleDelete = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const result = await deleteApprovalTemplate(templateId);
    if (result.success) {
      toast.success("템플릿이 삭제되었습니다");
      loadTemplates();
      if (selectedId === templateId) {
        setSelectedId(null);
      }
    } else {
      toast.error(result.error || "템플릿 삭제에 실패했습니다");
    }
  };

  const handleSelect = () => {
    const template = templates.find((t) => t.id === selectedId);
    if (template) {
      onSelectTemplate(template);
      onOpenChange(false);
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>결재선 불러오기</DialogTitle>
          <DialogDescription>
            저장된 결재선 템플릿을 선택하세요
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              로딩 중...
            </div>
          ) : templates.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              저장된 템플릿이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent ${
                    selectedId === template.id
                      ? "border-primary bg-accent"
                      : ""
                  }`}
                  onClick={() => setSelectedId(template.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.name}</h4>
                        {template.is_default && (
                          <Badge variant="default" className="text-xs">
                            기본
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {template.approvers.map((approver, index) => (
                          <div
                            key={`${approver.id}-${index}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-xs">
                              {index + 1}
                            </span>
                            <span>
                              {approver.name} · {approver.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedId === template.id && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => handleDelete(template.id, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedId(null);
            }}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleSelect}
            disabled={!selectedId}
          >
            선택
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
