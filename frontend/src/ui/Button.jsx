import { cn } from "../lib/cn";

export function Button({ className, variant = "primary", size = "md", ...props }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-400/40 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm",
    ghost: "bg-transparent hover:bg-white/60 text-slate-800",
    subtle: "bg-white/70 hover:bg-white text-slate-900 border border-white/70 shadow-sm",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
  };
  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base"
  };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

