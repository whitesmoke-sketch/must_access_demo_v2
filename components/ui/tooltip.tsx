"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  )
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipProvider>
      <TooltipPrimitive.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  )
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

type TooltipVariant = "default" | "secondary"

function TooltipContent({
  className,
  sideOffset = 0,
  children,
  arrowClassName,
  variant = "default",
  style,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content> & {
  arrowClassName?: string
  variant?: TooltipVariant
}) {
  // variant에 따른 기본 배경색 결정
  const defaultBgColor =
    variant === "secondary"
      ? "var(--tooltip-secondary-bg)"
      : "var(--tooltip-bg)"

  // style.backgroundColor가 있으면 그것을 사용, 없으면 variant 기본값 사용
  const actualBgColor =
    (style as any)?.backgroundColor || defaultBgColor

  const textColorClass =
    variant === "secondary"
      ? "text-[var(--tooltip-secondary-foreground)]"
      : "text-[var(--tooltip-foreground)]"

  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // 텍스트 색상
          textColorClass,
          // 애니메이션 및 공통 스타일
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          "z-50 w-fit origin-(--radix-tooltip-content-transform-origin)",
          "rounded-md px-3 py-1.5 text-xs text-balance",
          "bg-[var(--tooltip-bg-actual)]",
          className,
        )}
        style={{
          ...style,
          // CSS 변수에 실제 배경색 저장
          ['--tooltip-bg-actual' as any]: actualBgColor,
          // 배경색 직접 적용
          backgroundColor: actualBgColor,
        }}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow
          style={{
            fill: "var(--tooltip-bg-actual)",
            backgroundColor: "var(--tooltip-bg-actual)",
            stroke: "transparent",
          }}
          className={cn(
            // Arrow 위치 및 스타일
            "z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]",
            arrowClassName,
          )}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
