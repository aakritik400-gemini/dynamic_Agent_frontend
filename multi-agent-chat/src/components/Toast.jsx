import { useEffect } from "react";

export default function Toast({ type = "success", message, onClose }) {
  useEffect(() => {
    const t = window.setTimeout(() => {
      onClose?.();
    }, 3200);
    return () => window.clearTimeout(t);
  }, [onClose]);

  return (
    <div className="toastWrap" role="status" aria-live="polite">
      <div className={`toast ${type === "error" ? "toastError" : "toastSuccess"}`}>
        <div className="toastTitle">
          {type === "error" ? "Error" : "Success"}
        </div>
        <div className="toastMessage">{message}</div>
        <button className="toastClose" type="button" onClick={() => onClose?.()}>
          ✕
        </button>
      </div>
    </div>
  );
}

