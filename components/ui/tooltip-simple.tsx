import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

interface TooltipSimpleProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function TooltipSimple({ content, children }: TooltipSimpleProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent
          variant="default"
          className="p-3 max-w-[300px]"
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
