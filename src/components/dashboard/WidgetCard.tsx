"use client";

import { ReactNode } from "react";
import { MoreVertical } from "lucide-react";

interface WidgetCardProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  headerRight?: ReactNode;
  className?: string;
}

export default function WidgetCard({
  title,
  icon,
  children,
  footer,
  headerRight,
  className = "",
}: WidgetCardProps) {
  return (
    <div
      className={`bg-white border border-[#dadce0] rounded-lg overflow-hidden ${className}`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#f1f3f4]">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#5f6368]">{icon}</span>}
          <h3 className="text-sm font-medium text-[#202124]">{title}</h3>
        </div>
        <div className="flex items-center gap-1">
          {headerRight}
          <button className="p-1 hover:bg-[#f1f3f4] rounded-full">
            <MoreVertical size={16} className="text-[#5f6368]" />
          </button>
        </div>
      </div>
      <div className="p-4">{children}</div>
      {footer && (
        <div className="px-4 py-2 border-t border-[#f1f3f4] flex items-center justify-between text-xs">
          {footer}
        </div>
      )}
    </div>
  );
}
