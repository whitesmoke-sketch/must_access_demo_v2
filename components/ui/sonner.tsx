"use client";

import { Toaster as Sonner } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Figma 디자인 색상
const toastColors = {
  default: {
    iconBg: "rgba(122, 112, 255, 0.1)",
    iconColor: "#7a70ff",
  },
  info: {
    iconBg: "rgba(61, 170, 255, 0.1)",
    iconColor: "#3daaff",
  },
  success: {
    iconBg: "rgba(92, 226, 131, 0.1)",
    iconColor: "#5ce283",
  },
  error: {
    iconBg: "rgba(255, 123, 123, 0.1)",
    iconColor: "#ff7b7b",
  },
  warning: {
    iconBg: "rgba(255, 214, 92, 0.1)",
    iconColor: "#ffd65c",
  },
};

// 커스텀 아이콘 컴포넌트
const ToastIcon = ({
  type,
  children,
}: {
  type: keyof typeof toastColors;
  children: React.ReactNode;
}) => (
  <div
    style={{
      width: "28px",
      height: "28px",
      borderRadius: "50px",
      backgroundColor: toastColors[type].iconBg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <div style={{ color: toastColors[type].iconColor }}>{children}</div>
  </div>
);

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="top-center"
      closeButton
      duration={2000}
      icons={{
        success: (
          <ToastIcon type="success">
            <CheckCircle2 className="w-5 h-5" />
          </ToastIcon>
        ),
        info: (
          <ToastIcon type="info">
            <Info className="w-5 h-5" />
          </ToastIcon>
        ),
        warning: (
          <ToastIcon type="warning">
            <AlertTriangle className="w-5 h-5" />
          </ToastIcon>
        ),
        error: (
          <ToastIcon type="error">
            <XCircle className="w-5 h-5" />
          </ToastIcon>
        ),
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: "toast-figma",
          title: "toast-figma-title",
          description: "toast-figma-description",
          actionButton: "toast-figma-action",
          cancelButton: "toast-figma-cancel",
          closeButton: "toast-figma-close",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toastColors };
