import React from "react";
import { cn } from "../lib/cn";

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-white/70 bg-white/70 px-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:ring-2 focus:ring-brand-400/40",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }) {
  return <label className={cn("text-sm font-medium text-slate-700", className)} {...props} />;
}

