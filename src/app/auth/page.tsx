"use client";

import { useState, Suspense, lazy } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Play,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

const NetworkMesh = lazy(() => import("@/components/NetworkMesh"));

// ─── OAuth Provider Icons ────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GitLabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
    </svg>
  );
}

// ─── Alert Banner ────────────────────────────────────────────────────────────

function AlertBanner({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm mb-4 ${
        type === "error"
          ? "bg-destructive/10 border border-destructive/30 text-destructive"
          : "bg-secondary/10 border border-secondary/30 text-secondary"
      }`}
    >
      {type === "error" ? (
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      )}
      <span>{message}</span>
    </motion.div>
  );
}

// ─── OAuth Button ────────────────────────────────────────────────────────────

interface OAuthButtonProps {
  icon: React.ReactNode;
  label: string;
  provider: string;
  colorClass?: string;
  callbackUrl: string;
}

function OAuthButton({
  icon,
  label,
  provider,
  colorClass = "",
  callbackUrl,
}: OAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await signIn(provider, { callbackUrl });
    // signIn redirects, so setLoading(false) may never be reached — that's fine
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`
        group relative flex items-center justify-center gap-2.5 w-full h-11
        rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm
        text-sm font-medium text-foreground/80
        hover:bg-card/60 hover:border-border hover:text-foreground
        transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
        ${colorClass}
      `}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      <span>{loading ? "Redirecting…" : label}</span>
    </button>
  );
}

// ─── Field wrapper with icon ─────────────────────────────────────────────────

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  extra?: React.ReactNode;
  disabled?: boolean;
}

function Field({
  id,
  label,
  type = "text",
  placeholder,
  icon,
  value,
  onChange,
  extra,
  disabled,
}: FieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium text-foreground/80">
          {label}
        </Label>
        {extra}
      </div>
      <div className="relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 group-focus-within:text-primary transition-colors pointer-events-none">
          {icon}
        </span>
        <Input
          id={id}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="
            pl-10 h-11 bg-card/30 border-border/50 text-foreground
            placeholder:text-muted-foreground/40
            focus-visible:ring-primary/50 focus-visible:border-primary/60
            hover:border-border transition-all
          "
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password. Please try again.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AnimatePresence>
        {error && <AlertBanner type="error" message={error} />}
      </AnimatePresence>

      <Field
        id="login-email"
        label="Email address"
        type="email"
        placeholder="dev@triage.ai"
        icon={<Mail className="w-4 h-4" />}
        value={email}
        onChange={setEmail}
        disabled={loading}
      />
      <Field
        id="login-password"
        label="Password"
        type="password"
        placeholder="Enter your password"
        icon={<Lock className="w-4 h-4" />}
        value={password}
        onChange={setPassword}
        disabled={loading}
        extra={
          <button
            type="button"
            className="text-xs text-primary/80 hover:text-primary transition-colors"
          >
            Forgot password?
          </button>
        }
      />

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="w-full h-11 skeuo-btn text-white font-semibold gap-2 mt-2 rounded-xl"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" />
            Sign In
          </>
        )}
      </Button>
    </form>
  );
}

// ─── Signup Form ─────────────────────────────────────────────────────────────

function SignupForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!name || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    // Register via our API endpoint
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Registration failed. Please try again.");
      return;
    }

    // Auto-sign-in after successful registration
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);

    if (signInResult?.error) {
      setSuccess("Account created! Please sign in.");
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AnimatePresence>
        {error && <AlertBanner type="error" message={error} />}
        {success && <AlertBanner type="success" message={success} />}
      </AnimatePresence>

      <Field
        id="signup-name"
        label="Full name"
        type="text"
        placeholder="Your name"
        icon={<User className="w-4 h-4" />}
        value={name}
        onChange={setName}
        disabled={loading}
      />
      <Field
        id="signup-email"
        label="Email address"
        type="email"
        placeholder="agent@sentinel.qa"
        icon={<Mail className="w-4 h-4" />}
        value={email}
        onChange={setEmail}
        disabled={loading}
      />
      <Field
        id="signup-password"
        label="Password"
        type="password"
        placeholder="Min. 8 characters"
        icon={<Lock className="w-4 h-4" />}
        value={password}
        onChange={setPassword}
        disabled={loading}
      />

      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        By creating an account, you agree to our{" "}
        <span className="text-primary/80 cursor-pointer hover:text-primary">
          Terms of Service
        </span>{" "}
        and{" "}
        <span className="text-primary/80 cursor-pointer hover:text-primary">
          Privacy Policy
        </span>
        .
      </p>

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="w-full h-11 skeuo-btn text-white font-semibold gap-2 mt-1 rounded-xl"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}

// ─── Auth Page Shell (reads searchParams) ────────────────────────────────────

function AuthPageContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const urlError = searchParams.get("error");

  const [tab, setTab] = useState<"login" | "signup">("login");

  // Map NextAuth error codes to human-readable messages
  const oauthErrorMessage =
    urlError === "OAuthAccountNotLinked"
      ? "This email is already registered with a different provider."
      : urlError === "OAuthSignin" || urlError === "OAuthCallback"
        ? "OAuth sign-in failed. Please try again."
        : urlError
          ? "Authentication error. Please try again."
          : null;

  const oauthProviders = [
    {
      icon: <GoogleIcon />,
      label: "Continue with Google",
      provider: "google",
      colorClass: "hover:border-[#4285F4]/40",
    },
    {
      icon: <GitHubIcon />,
      label: "Continue with GitHub",
      provider: "github",
      colorClass: "hover:border-foreground/30",
    },
    {
      icon: <GitLabIcon />,
      label: "Continue with GitLab",
      provider: "gitlab",
      colorClass: "hover:border-[#FC6D26]/40 [&>svg]:text-[#FC6D26]",
    },
  ];

  return (
    <div className="relative min-h-screen bg-background overflow-hidden flex items-center justify-center px-4">
      {/* 3D Background */}
      <Suspense fallback={null}>
        <NetworkMesh />
      </Suspense>

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center h-16 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to home
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Shield className="w-6 h-6 text-primary" />
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-foreground">
            Tri<span className="text-gradient-violet">Age</span>
          </span>
        </div>
      </div>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px] pt-16"
      >
        {/* Ambient glow */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/10 via-transparent to-secondary/10 blur-xl -z-10" />

        <div className="skeuo-card rounded-2xl overflow-hidden relative noise">
          {/* Card header */}
          <div className="px-8 pt-8 pb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="relative">
                <Shield className="w-8 h-8 text-primary" />
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              </div>
              <span className="text-xl font-black tracking-tight text-foreground">
                Tri<span className="text-gradient-violet">Age</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {tab === "login" ? "Welcome back" : "Start your journey"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tab === "login"
                ? "Sign in to your autonomous testing platform"
                : "Create a free account — no credit card required"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="mx-8 mb-6">
            <div className="relative flex skeuo-inset rounded-xl p-1 gap-1">
              <motion.div
                className="absolute top-1 bottom-1 rounded-[10px] bg-primary/15 border border-primary/30"
                animate={{
                  left: tab === "login" ? "4px" : "50%",
                  width: "calc(50% - 4px)",
                }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
              {(["login", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`
                    relative flex-1 py-2.5 text-sm font-semibold rounded-[10px] transition-colors duration-200
                    ${tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"}
                  `}
                >
                  {t === "login" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
          </div>

          {/* Form area */}
          <div className="px-8 pb-8">
            {/* OAuth error from URL param */}
            <AnimatePresence>
              {oauthErrorMessage && (
                <AlertBanner type="error" message={oauthErrorMessage} />
              )}
            </AnimatePresence>

            {/* OAuth Buttons */}
            <div className="space-y-2.5 mb-6">
              {oauthProviders.map((provider) => (
                <OAuthButton
                  key={provider.provider}
                  icon={provider.icon}
                  label={provider.label}
                  provider={provider.provider}
                  colorClass={provider.colorClass}
                  callbackUrl={callbackUrl}
                />
              ))}
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-3 mb-6">
              <Separator className="flex-1 bg-border/50" />
              <span className="text-[11px] font-medium text-muted-foreground/60 uppercase tracking-widest whitespace-nowrap">
                or with email
              </span>
              <Separator className="flex-1 bg-border/50" />
            </div>

            {/* Credentials form — slides in on tab change */}
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, x: tab === "login" ? -16 : 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: tab === "login" ? 16 : -16 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
              >
                {tab === "login" ? (
                  <LoginForm callbackUrl={callbackUrl} />
                ) : (
                  <SignupForm callbackUrl={callbackUrl} />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer toggle */}
            <p className="text-center text-xs text-muted-foreground mt-5">
              {tab === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setTab("signup")}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    onClick={() => setTab("login")}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Trust badge */}
        <div className="flex items-center justify-center gap-1.5 mt-4 mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          <span className="text-[11px] text-muted-foreground/50">
            Secured by TriAge · SOC 2 Type II Certified
          </span>
        </div>
      </motion.div>
    </div>
  );
}

// Wrap in Suspense because useSearchParams() requires it in Next.js App Router
export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthPageContent />
    </Suspense>
  );
}
