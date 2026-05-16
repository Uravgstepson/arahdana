"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";

type ChartSize = {
  width: number;
  height: number;
};

export function MeasuredChartFrame({
  className,
  children,
}: {
  className: string;
  children: (size: ChartSize) => ReactNode;
}) {
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);
  const frameRef = useRef<number | null>(null);

  const chartRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (!node) return;

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextSize = {
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      };

      setSize((current) =>
        current.width === nextSize.width && current.height === nextSize.height
          ? current
          : nextSize,
      );
    };

    const scheduleUpdate = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = window.requestAnimationFrame(updateSize);
    };

    scheduleUpdate();
    observerRef.current = new ResizeObserver(scheduleUpdate);
    observerRef.current.observe(node);
  }, []);

  return (
    <div ref={chartRef} className={`${className} touch-pan-y`}>
      {size.width > 0 && size.height > 0 ? children(size) : <ChartSkeleton />}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-full w-full rounded-lg bg-stone-100 motion-safe:animate-pulse" />;
}
