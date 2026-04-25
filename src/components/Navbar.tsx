"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu, X, LogOut, User, Mail, CheckCircle2,
  Github, Chrome, GitMerge, Loader2, LayoutDashboard,
} from "lucide-react";
import Link from "next/link";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Agents", href: "#agents" },
  { label: "Pricing", href: "#pricing" },
];

// Maps the provider name coming from the session to an icon + label
function ProviderBadge({ provider }: { provider?: string }) {
  const p = provider?.toLowerCase();

  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    github: {
      icon: <Github className="w-3 h-3" />,
      label: "GitHub",
      color: "text-foreground/80 border-foreground/20",
    },
    google: {
      icon: <Chrome className="w-3 h-3" />,
      label: "Google",
      color: "text-[#4285F4] border-[#4285F4]/30",
    },
    gitlab: {
      icon: <GitMerge className="w-3 h-3" />,
      label: "GitLab",
      color: "text-[#FC6D26] border-[#FC6D26]/30",
    },
    credentials: {
      icon: <Mail className="w-3 h-3" />,
      label: "Email",
      color: "text-primary border-primary/30",
    },
  };

  const entry = (p && map[p]) ?? {
    icon: <User className="w-3 h-3" />,
    label: provider ?? "Unknown",
    color: "text-muted-foreground border-border",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${entry.color}`}
    >
      {entry.icon}
      {entry.label}
    </span>
  );
}

// Avatar shown in the navbar trigger button
function Avatar({
  image,
  name,
  size = "md",
}: {
  image?: string | null;
  name?: string | null;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  if (image) {
    return (
      // referrerPolicy="no-referrer" is required — Google/GitHub CDNs return 429
      // when the Referer header is sent with strict-origin-when-cross-origin policy
      <img
        src={image}
        alt={name ?? "avatar"}
        referrerPolicy="no-referrer"
        className={`${dim} rounded-full object-cover ring-2 ring-primary/40`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary`}
    >
      {initials}
    </div>
  );
}

// Profile dropdown panel
function ProfileDropdown() {
  const { data: session } = useSession();
  const [signingOut, setSigningOut] = useState(false);

  const user = session?.user as
    | {
        name?: string | null;
        email?: string | null;
        image?: string | null;
        provider?: string;
      }
    | undefined;

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  // Detect provider from session token (NextAuth exposes it via callbacks)
  // Fallback: infer from image URL heuristics
  const inferredProvider = (() => {
    if (!user?.image) return "credentials";
    if (user.image.includes("googleusercontent")) return "google";
    if (user.image.includes("avatars.githubusercontent")) return "github";
    if (user.image.includes("gitlab")) return "gitlab";
    return "credentials";
  })();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative focus:outline-none group">
          <Avatar image={user?.image} name={user?.name} />
          {/* Online indicator */}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-72 glass-strong border-border/60 p-0 overflow-hidden"
      >
        {/* Header band */}
        <div className="relative px-4 pt-5 pb-4">
          {/* Ambient glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />

          <div className="relative flex items-start gap-3">
            <Avatar image={user?.image} name={user?.name} size="md" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.name ?? "Anonymous"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {user?.email ?? "—"}
              </p>
              <div className="mt-2">
                <ProviderBadge provider={inferredProvider} />
              </div>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/40 my-0" />

        {/* Session data table */}
        <div className="px-4 py-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">
            Session Data
          </p>

          {[
            { label: "Name", value: user?.name },
            { label: "Email", value: user?.email },
            { label: "Provider", value: inferredProvider },
            {
              label: "Avatar",
              value: user?.image ? "Provided" : "None",
              badge: user?.image ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              ) : null,
            },
          ].map(({ label, value, badge }) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground/70 shrink-0">{label}</span>
              <span className="flex items-center gap-1 text-xs text-foreground/80 font-mono truncate text-right">
                {badge}
                <span className="truncate max-w-[160px]">{value ?? "—"}</span>
              </span>
            </div>
          ))}

          {/* Avatar preview */}
          {user?.image && (
            <div className="mt-3 pt-3 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground/60 mb-2 uppercase tracking-widest font-semibold">
                Avatar URL
              </p>
              <p className="text-[10px] text-muted-foreground/50 font-mono break-all leading-relaxed">
                {user.image}
              </p>
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="bg-border/40 my-0" />

        {/* Dashboard link */}
        <div className="px-2 pt-2">
          <Link
            href="/dashboard"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-foreground/80 hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </div>

        <DropdownMenuSeparator className="bg-border/40 my-0 mt-2" />

        {/* Sign out */}
        <div className="p-2">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {signingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const isLoggedIn = status === "authenticated";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <motion.div
            whileHover={{ rotate: [0, -8, 8, 0], scale: 1.05 }}
            transition={{ duration: 0.5 }}
          >
            <Image 
              src="/icon.png" 
              alt="TriAge" 
              width={32} 
              height={32}
              className="rounded-lg group-hover:opacity-90 transition-opacity"
            />
          </motion.div>
          <span className="text-lg font-extrabold tracking-tight text-foreground">
            Tri<span className="text-gradient-violet">Age</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors relative group"
            >
              {link.label}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary rounded-full group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* Desktop right slot */}
        <div className="hidden md:flex items-center gap-3">
          {status === "loading" ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : isLoggedIn ? (
            <ProfileDropdown />
          ) : (
            <Button
              className="skeuo-btn text-white font-semibold rounded-xl px-5"
              asChild
            >
              <Link href="/auth">Start Testing</Link>
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass-strong border-t border-border/50 px-6 py-4 space-y-3"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="block text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </a>
          ))}

          {isLoggedIn ? (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-destructive/40 text-sm text-destructive/80 hover:bg-destructive/10 transition-colors mt-2"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          ) : (
            <Button
              className="w-full skeuo-btn text-white font-semibold rounded-xl mt-2"
              asChild
            >
              <Link href="/auth">Start Testing</Link>
            </Button>
          )}
        </motion.div>
      )}
    </nav>
  );
}
