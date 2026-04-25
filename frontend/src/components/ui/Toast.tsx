import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = "info", duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  const typeClasses = {
    success: "toast--success",
    error: "toast--error",
    info: "toast--info",
    warning: "toast--warning",
  };

  return (
    <div className={`toast ${typeClasses[type]}`}>
      <div className="toast__content">
        <p>{message}</p>
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => {
          setIsVisible(false);
          onClose?.();
        }}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
}
