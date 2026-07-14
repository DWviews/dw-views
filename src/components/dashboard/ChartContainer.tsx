"use client";

import { useEffect, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

/** Avoid Recharts crashing when the container is not yet sized (common on Vercel/SSR). */
export default function ChartContainer({
  children,
  height,
  className,
}: {
  children: ReactElement;
  height: number | string;
  className?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!ready) {
    return (
      <div
        className={className}
        style={{
          height: typeof height === "number" ? height : undefined,
          minHeight: typeof height === "number" ? height : 200,
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height: typeof height === "number" ? height : height,
        minHeight: typeof height === "number" ? height : 200,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
