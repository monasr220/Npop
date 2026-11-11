import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { Button } from "../components/ui/Button"
import { Field, Input } from "../components/ui/Field"

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? "/"

  if (!isLoading && isAuthenticated) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError("Enter your email and password.")
      return
    }
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      notify("Welcome back to Npop", "success")
      navigate(from, { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign in failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-primary">
        Welcome back
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-app-text">
        Sign in to Npop
      </h1>
      <p className="mt-2 text-sm leading-6 text-app-muted">
        Pick up your queue, check your feed and keep building your library.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 grid gap-4" noValidate>
        <Field label="Email" htmlFor="login-email" required>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-invalid={Boolean(error)}
          />
        </Field>

        <Field label="Password" htmlFor="login-password" required>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-app-muted hover:text-app-text"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-brand-social/40 bg-brand-social/5 px-3 py-2 text-sm text-brand-social"
          >
            {error}
          </p>
        )}

        <Button type="submit" size="lg" loading={submitting} icon={<LogIn size={17} />}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-sm text-app-muted">
        New to Npop?{" "}
        <Link to="/register" className="font-semibold text-brand-primary hover:underline">
          Create an account
        </Link>
      </p>

      <p className="mt-6 text-xs leading-5 text-app-muted">
        By signing in you agree to the{" "}
        <Link to="/terms-of-service" className="text-app-text underline underline-offset-2">
          Terms of Service
        </Link>{" "}
        and acknowledge the{" "}
        <Link to="/privacy-policy" className="text-app-text underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  )
}
