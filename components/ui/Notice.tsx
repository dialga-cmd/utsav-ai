import type { ReactNode } from "react";

export type NoticeTone = "info" | "warning" | "success" | "danger";

interface NoticeProps {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
  live?: boolean;
  id?: string;
  className?: string;
}

export function Notice({
  tone = "info",
  title,
  children,
  live = false,
  id,
  className = "",
}: NoticeProps) {
  return (
    <div
      id={id}
      className={`notice notice-${tone} ${className}`.trim()}
      role={live ? "status" : undefined}
    >
      {title ? <strong>{title}</strong> : null}
      {children}
    </div>
  );
}
