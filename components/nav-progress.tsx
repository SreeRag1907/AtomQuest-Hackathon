"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Lightweight top progress bar that animates on every client navigation.
 * No external dependency. Drives perceived performance during route transitions.
 */
export function NavProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const timersRef = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setVisible(true);
    setProgress(8);

    const t1 = setTimeout(() => setProgress(40), 80);
    const t2 = setTimeout(() => setProgress(70), 220);
    const t3 = setTimeout(() => setProgress(92), 600);
    const t4 = setTimeout(() => setProgress(100), 900);
    const t5 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 1100);
    timersRef.current = [t1, t2, t3, t4, t5];

    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5"
    >
      <div
        className="h-full bg-primary shadow-[0_0_8px_rgba(99,102,241,0.6)] transition-[width,opacity] duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
