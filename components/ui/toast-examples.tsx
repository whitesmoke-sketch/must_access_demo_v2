"use client";

import { toast } from "sonner";
import { Button } from "./button";

/**
 * Figma 디자인과 동일한 토스트 사용 예시
 *
 * 각 토스트 타입별로 아이콘, 색상, 버튼이 자동으로 적용됩니다.
 */

export function ToastExamples() {
  return (
    <div className="flex flex-col gap-4 p-8">
      <h2 className="text-2xl font-semibold mb-4">Toast Examples - Figma Design</h2>

      <div className="grid grid-cols-2 gap-4">
        {/* Success Toast */}
        <Button
          onClick={() =>
            toast.success("Toast message", {
              description: "작업이 성공적으로 완료되었습니다",
              action: {
                label: "BUTTON",
                onClick: () => console.log("Success action clicked"),
              },
            })
          }
          className="bg-green-500 hover:bg-green-600"
        >
          Success Toast
        </Button>

        {/* Error Toast */}
        <Button
          onClick={() =>
            toast.error("Toast message", {
              description: "오류가 발생했습니다",
              action: {
                label: "BUTTON",
                onClick: () => console.log("Error action clicked"),
              },
            })
          }
          className="bg-red-500 hover:bg-red-600"
        >
          Error Toast
        </Button>

        {/* Warning Toast */}
        <Button
          onClick={() =>
            toast.warning("Toast message", {
              description: "주의가 필요합니다",
              action: {
                label: "BUTTON",
                onClick: () => console.log("Warning action clicked"),
              },
            })
          }
          className="bg-yellow-500 hover:bg-yellow-600"
        >
          Warning Toast
        </Button>

        {/* Info Toast */}
        <Button
          onClick={() =>
            toast.info("Toast message", {
              description: "정보를 확인하세요",
              action: {
                label: "BUTTON",
                onClick: () => console.log("Info action clicked"),
              },
            })
          }
          className="bg-blue-500 hover:bg-blue-600"
        >
          Info Toast
        </Button>

        {/* Simple Success (no description) */}
        <Button
          onClick={() =>
            toast.success("작업이 완료되었습니다", {
              action: {
                label: "확인",
                onClick: () => console.log("Confirmed"),
              },
            })
          }
          variant="outline"
        >
          Simple Success
        </Button>

        {/* Simple Error (no description) */}
        <Button
          onClick={() =>
            toast.error("작업을 완료할 수 없습니다", {
              action: {
                label: "재시도",
                onClick: () => console.log("Retry"),
              },
            })
          }
          variant="outline"
        >
          Simple Error
        </Button>

        {/* With Custom Duration */}
        <Button
          onClick={() =>
            toast.success("이 메시지는 10초 후 사라집니다", {
              duration: 10000,
              action: {
                label: "닫기",
                onClick: () => console.log("Closed"),
              },
            })
          }
          variant="outline"
        >
          Custom Duration (10s)
        </Button>

        {/* Promise Toast */}
        <Button
          onClick={() => {
            const promise = () =>
              new Promise((resolve) => setTimeout(() => resolve({ name: "John" }), 2000));

            toast.promise(promise, {
              loading: "로딩 중...",
              success: (data: any) => `${data.name}님 환영합니다`,
              error: "오류가 발생했습니다",
            });
          }}
          variant="outline"
        >
          Promise Toast
        </Button>
      </div>

      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h3 className="font-semibold mb-2">사용 방법:</h3>
        <pre className="text-sm bg-card p-4 rounded overflow-x-auto">
{`import { toast } from "sonner";

// Success
toast.success("메시지", {
  description: "상세 설명",
  action: {
    label: "버튼",
    onClick: () => console.log("클릭"),
  },
});

// Error
toast.error("메시지", {
  description: "상세 설명",
  action: {
    label: "버튼",
    onClick: () => console.log("클릭"),
  },
});

// Warning
toast.warning("메시지", {
  description: "상세 설명",
  action: {
    label: "버튼",
    onClick: () => console.log("클릭"),
  },
});

// Info
toast.info("메시지", {
  description: "상세 설명",
  action: {
    label: "버튼",
    onClick: () => console.log("클릭"),
  },
});`}
        </pre>
      </div>
    </div>
  );
}
