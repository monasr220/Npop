import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

type ToastVariant = "success" | "error" | "info"

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  notify: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counter = useRef(0)

  const notify = useCallback((message: string, variant: ToastVariant = "info") => {
    counter.current += 1
    const id = counter.current
    setToasts((current) => [...current, { id, message, variant }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3800)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  const styles: Record<ToastVariant, string> = {
    success: "border-brand-success/50 text-brand-success",
    error: "border-brand-social/60 text-brand-social",
    info: "border-app-border text-app-text",
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-28 right-5 z-[60] flex w-[min(380px,calc(100vw-2.5rem))] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`animate-fade-in rounded-xl border bg-app-surface px-4 py-3 text-sm shadow-lift ${styles[toast.variant]}`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error("useToast must be used inside ToastProvider")
  return context
}
