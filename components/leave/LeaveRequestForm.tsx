"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ApprovalLineEditor, type ApprovalStep } from "@/components/approval-line-editor";
import { ApprovalTemplateLoadModal } from "@/components/approval-template-modal";
import { ApprovalTemplateSaveModal } from "@/components/approval-template-save-modal";

import { generateDefaultApprovers, createApprovalSteps } from "@/app/actions/approval";
import { createLeaveRequest } from "@/app/actions/leave";

const leaveTypes = [
  { value: "annual", label: "연차" },
  { value: "sick", label: "병가" },
  { value: "half_am", label: "오전 반차" },
  { value: "half_pm", label: "오후 반차" },
] as const;

const formSchema = z.object({
  leave_type: z.string().min(1, "휴가 유형을 선택하세요"),
  start_date: z.date({ required_error: "시작일을 선택하세요" }),
  end_date: z.date({ required_error: "종료일을 선택하세요" }),
  reason: z.string().min(1, "사유를 입력하세요").max(500, "사유는 500자 이하로 입력하세요"),
}).refine((data) => data.end_date >= data.start_date, {
  message: "종료일은 시작일보다 빠를 수 없습니다",
  path: ["end_date"],
});

type FormValues = z.infer<typeof formSchema>;

interface LeaveRequestFormProps {
  employeeId: string;
}

export function LeaveRequestForm({ employeeId }: LeaveRequestFormProps) {
  const router = useRouter();
  const [approvers, setApprovers] = React.useState<ApprovalStep[]>([]);
  const [loadingDefaultApprovers, setLoadingDefaultApprovers] = React.useState(true);
  const [showLoadModal, setShowLoadModal] = React.useState(false);
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leave_type: "",
      reason: "",
    },
  });

  // 자동 결재선 생성
  React.useEffect(() => {
    const loadDefaultApprovers = async () => {
      setLoadingDefaultApprovers(true);
      const result = await generateDefaultApprovers("leave");
      if (result.success && result.data) {
        setApprovers(result.data.map((a) => ({
          id: a.id,
          name: a.name,
          email: a.email,
          role: a.role.name,
          department: a.department.name,
        })));
      } else if (result.error) {
        toast.error(result.error);
      }
      setLoadingDefaultApprovers(false);
    };

    loadDefaultApprovers();
  }, []);

  const handleLoadTemplate = (template: {
    approvers: ApprovalStep[];
  }) => {
    setApprovers(template.approvers);
    toast.success("결재선 템플릿을 불러왔습니다");
  };

  const onSubmit = async (values: FormValues) => {
    if (approvers.length === 0) {
      toast.error("최소 1명의 승인자를 지정해야 합니다");
      return;
    }

    setSubmitting(true);

    try {
      // 1. 연차 신청 생성
      const leaveResult = await createLeaveRequest({
        employee_id: employeeId,
        leave_type: values.leave_type,
        start_date: format(values.start_date, "yyyy-MM-dd"),
        end_date: format(values.end_date, "yyyy-MM-dd"),
        reason: values.reason,
      });

      if (!leaveResult.success || !leaveResult.data) {
        throw new Error(leaveResult.error || "연차 신청에 실패했습니다");
      }

      const requestId = leaveResult.data.id;

      // 2. 승인 단계 생성
      const approvalResult = await createApprovalSteps(
        "leave",
        requestId,
        approvers.map((a) => a.id)
      );

      if (!approvalResult.success) {
        throw new Error(approvalResult.error || "결재선 설정에 실패했습니다");
      }

      toast.success("연차 신청이 완료되었습니다");
      router.push("/leave/my-leave");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 휴가 유형 */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="leave_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>휴가 유형</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="휴가 유형을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* 기간 */}
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold">기간</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>시작일</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ko })
                              ) : (
                                <span>날짜를 선택하세요</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                            locale={ko}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>종료일</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ko })
                              ) : (
                                <span>날짜를 선택하세요</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date < new Date(new Date().setHours(0, 0, 0, 0))
                            }
                            initialFocus
                            locale={ko}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          {/* 사유 */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사유</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="휴가 사유를 입력하세요"
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* 결재선 */}
          {loadingDefaultApprovers ? (
            <Card className="p-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  결재선을 불러오는 중...
                </span>
              </div>
            </Card>
          ) : (
            <ApprovalLineEditor
              approvers={approvers}
              onApproversChange={setApprovers}
              onLoadTemplate={() => setShowLoadModal(true)}
              onSaveTemplate={() => setShowSaveModal(true)}
            />
          )}

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting || approvers.length === 0}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  제출 중...
                </>
              ) : (
                "제출"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Template Modals */}
      <ApprovalTemplateLoadModal
        open={showLoadModal}
        onOpenChange={setShowLoadModal}
        requestType="leave"
        onSelectTemplate={handleLoadTemplate}
      />

      <ApprovalTemplateSaveModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        requestType="leave"
        approverIds={approvers.map((a) => a.id)}
      />
    </>
  );
}
