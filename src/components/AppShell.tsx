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
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent glow-primary">
              <Flame className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">AI_COACH</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavBtn to="/dashboard" icon={<Calendar className="h-4 w-4" />} label="Today" />
            <NavBtn to="/profile" icon={<User className="h-4 w-4" />} label="Profile" />
            <button
              onClick={handleSignOut}
              className="rounded-md p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>
        </div>
        {profile?.sport_type && (
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2 text-xs text-muted-foreground">
            <Dumbbell className="h-3 w-3 text-primary" />
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
      className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
      activeProps={{ className: "active" }}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
