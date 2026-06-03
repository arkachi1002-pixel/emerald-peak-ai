import { Link, useRouter } from "@tanstack/react-router";
import { Dumbbell, Calendar, User, LogOut, Flame } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { signOut, profile } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* MongoDB-style promo strip */}
      <div className="bg-hero-dark text-white text-[13px] font-medium">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="opacity-90">Train smarter with your AI coach — daily readiness-tuned plans.</span>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-border bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#001e2b]">
              <Flame className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">AI_COACH</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavBtn to="/dashboard" icon={<Calendar className="h-4 w-4" />} label="Today" />
            <NavBtn to="/profile" icon={<User className="h-4 w-4" />} label="Profile" />
            <button
              onClick={handleSignOut}
              className="btn-pill bg-primary text-primary-foreground hover:opacity-90 ml-1 hidden sm:inline-flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
            <button
              onClick={handleSignOut}
              className="sm:hidden rounded-full p-2 text-muted-foreground hover:bg-secondary"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
        {profile?.sport_type && (
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
            <Dumbbell className="h-3 w-3 text-[color:var(--green-dark)]" />
            <span>{profile.sport_type} · {profile.experience_level} · Goal: {profile.main_goal}</span>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

function NavBtn({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground [&.active]:bg-[#001e2b] [&.active]:text-white"
      activeProps={{ className: "active" }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
