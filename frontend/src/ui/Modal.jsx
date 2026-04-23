import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "./Card";
import { Button } from "./Button";

export function Modal({ open, title, onClose, children, footer }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-xl">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/60">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
          <div className="p-5">{children}</div>
          {footer ? <div className="px-5 py-4 border-t border-white/60">{footer}</div> : null}
        </Card>
      </motion.div>
    </div>
  );
}

