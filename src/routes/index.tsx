import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Flame } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) router.navigate({ to: "/auth" });
    else if (!profile?.onboarded) router.navigate({ to: "/onboarding" });
    else router.navigate({ to: "/dashboard" });
  }, [session, profile, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent glow-primary">
          <Flame className="h-8 w-8 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Loading AI_COACH…</p>
      </div>
    </div>
  );
}
