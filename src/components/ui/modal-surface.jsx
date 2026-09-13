"use client";

import { cn } from "@/lib/utils";
import { useModalFocus } from "@/hooks/useModalFocus";

export function ModalSurface({ children, onClose, labelledBy, describedBy, className }) {
  const modalRef = useModalFocus(onClose);
  return (
    <div className="form-overlay" onMouseDown={event => event.target === event.currentTarget && onClose?.()}>
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={cn("form-modal", className)}
      >
        {children}
      </div>
    </div>
  );
}
