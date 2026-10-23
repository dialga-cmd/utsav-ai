import type { ReactNode } from "react";

/**
 * Shared layout primitive: centers content on a 72rem (max-w-6xl) track with
 * consistent horizontal padding so every section lines up on the same edges.
 */
export function Container({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <div id={id} className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}
