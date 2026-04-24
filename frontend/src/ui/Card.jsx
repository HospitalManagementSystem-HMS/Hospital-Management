import { cn } from "../lib/cn";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/60 bg-white/60 backdrop-blur-xl shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return <div className={cn("px-5 pt-5 pb-3", className)} {...props} />;
}

export function CardTitle({ className, ...props }) {
  return <div className={cn("text-base font-semibold text-slate-900", className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

