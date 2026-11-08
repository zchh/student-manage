import { ReactNode } from "react";

export function Modal({ label, wide = false, onClose, children }: { label: string; wide?: boolean; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-mask" onClick={onClose}>
      <div className={wide ? "modal wide" : "modal"} role="dialog" aria-label={label} onClick={(event) => event.stopPropagation()}>
        <p>{label}</p>
        {children}
      </div>
    </div>
  );
}
