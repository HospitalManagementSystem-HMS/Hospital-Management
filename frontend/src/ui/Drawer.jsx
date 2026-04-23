import React from "react";
import { motion } from "framer-motion";
import { Card } from "./Card";

export function Drawer({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ x: 420, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 420, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className="absolute right-4 top-4 bottom-4 w-[420px] max-w-[calc(100vw-2rem)]"
      >
        <Card className="h-full overflow-hidden">
          <div className="px-5 py-4 border-b border-white/60 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <button className="text-sm text-slate-600 hover:text-slate-900" onClick={onClose}>
              Esc
            </button>
          </div>
          <div className="p-5 overflow-auto h-[calc(100%-3.25rem)]">{children}</div>
        </Card>
      </motion.div>
    </div>
  );
}

