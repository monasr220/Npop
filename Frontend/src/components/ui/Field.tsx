import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react"
import { cn } from "../../utils/cn"

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
}: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="grid gap-1.5 text-sm">
      {label && (
        <span className="font-medium text-app-text">
          {label}
          {required && <span className="ml-0.5 text-brand-social">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="text-xs text-brand-social" role="alert">
          {error}
        </span>
      ) : (
        hint && <span className="text-xs text-app-muted">{hint}</span>
      )}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("input-base", className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("input-base min-h-[96px] resize-y", className)}
      {...props}
    />
  )
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("input-base", className)} {...props}>
      {children}
    </select>
  )
}
