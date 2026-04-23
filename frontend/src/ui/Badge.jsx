import React from "react";
import { cn } from "../lib/cn";

export function Badge({ className, tone = "info", ...props }) {
  const tones = {
    info: "bg-brand-50 text-brand-800 border-brand-200",
    ok: "bg-emerald-50 text-emerald-800 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-rose-50 text-rose-800 border-rose-200",
    neutral: "bg-slate-50 text-slate-700 border-slate-200"
  };
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", tones[tone], className)} {...props} />
  );
}

