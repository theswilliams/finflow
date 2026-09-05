"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/primitives";

const ChartSkeleton = ({ height = 260 }: { height?: number }) => (
  <Skeleton className="w-full" style={{ height }} />
);

// Recharts is ~140 KiB — load it after hydration so it never blocks first paint.
export const SpendingAreaChart = dynamic(
  () => import("./spending-area").then((m) => m.SpendingAreaChart),
  { ssr: false, loading: () => <ChartSkeleton /> },
);

export const CategoryDonut = dynamic(() => import("./category-donut").then((m) => m.CategoryDonut), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
});

export const MonthlyBars = dynamic(() => import("./trend-lines").then((m) => m.MonthlyBars), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

export const CategoryTrendLines = dynamic(
  () => import("./trend-lines").then((m) => m.CategoryTrendLines),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> },
);

export type { SpendingPoint } from "./spending-area";
export type { DonutSlice } from "./category-donut";
