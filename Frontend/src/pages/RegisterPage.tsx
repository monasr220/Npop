import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { Eye, EyeOff, UserPlus } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { Button } from "../components/ui/Button"
import { Field, Input, Textarea } from "../components/ui/Field"

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function RegisterPage() {
  const { register, isAuthenticated, isLoading } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [bio, setBio] = useState("")
  const [accepted, setAccepted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoading && isAuthenticated) return <Navigate to="/" replace />

  function validate(): string | null {
    if (username.trim().length < 3) return "Username must be at least 3 characters."
    if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email address."
    if (password.length < 8) return "Password must be at least 8 characters."
    if (password !== confirm) return "Passwords do not match."
    if (!accepted) return "Accept the Terms of Service and Privacy Policy to continue."
    return null
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const message = validate()
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await register(username.trim(), email.trim(), password, bio.trim() || undefined)
      notify("Account created. Welcome to Npop.", "success")
      navigate("/", { replace: true })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration failed.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-primary">
        Join Npop
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-app-text">
        Create your listener account
      </h1>
      <p className="mt-2 text-sm leading-6 text-app-muted">
        Every account starts as a listener. You can create an artist profile later
        from Settings when you are ready to publish music.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 grid gap-4" noValidate>
        <Field
          label="Username"
          htmlFor="register-username"
          hint="At least 3 characters. This is your public name."
          required
        >
          <Input
            id="register-username"
            autoComplete="username"
            value={username}
            minLength={3}
            maxLength={255}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="listener_name"
          />
        </Field>

        <Field label="Email" htmlFor="register-email" required>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        <Field
          label="Password"
          htmlFor="register-password"
          hint="Use at least 8 characters. Passwords are stored only as secure hashes."
          required
        >
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
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

        <Field label="Confirm password" htmlFor="register-confirm" required>
          <Input
            id="register-confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="Repeat your password"
          />
        </Field>

        <Field
          label="Bio"
          htmlFor="register-bio"
          hint="Optional. Tell people what you listen to."
        >
          <Textarea
            id="register-bio"
            value={bio}
            maxLength={1024}
            onChange={(event) => setBio(event.target.value)}
            placeholder="A short introduction…"
            className="min-h-[72px]"
          />
        </Field>

        <label className="flex items-start gap-2.5 rounded-xl border border-app-strong bg-app-raised/50 p-3 text-sm text-app-muted">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-primary"
          />
          <span>
            I agree to the{" "}
            <Link to="/terms-of-service" className="font-medium text-brand-primary underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and have read the{" "}
            <Link to="/privacy-policy" className="font-medium text-brand-primary underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-brand-social/40 bg-brand-social/5 px-3 py-2 text-sm text-brand-social"
          >
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          loading={submitting}
          icon={<UserPlus size={17} />}
        >
          Create account
        </Button>
      </form>

      <p className="mt-5 text-sm text-app-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
