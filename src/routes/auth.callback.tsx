import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in - AI_COACH" }] }),
  component: AuthCallbackPage,
});

type Profile = {
  onboarded: boolean;
};

async function getProfile(userId: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarded")
      .eq("id", userId)
      .maybeSingle();

    if (data || error) return data as Profile | null;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return null;
}

function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finishSignIn = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const authError = params.get("error_description") ?? params.get("error");
        if (authError) throw new Error(authError);

        const code = params.get("code");
        const { data, error: authSessionError } = code
          ? await supabase.auth.exchangeCodeForSession(code)
          : await supabase.auth.getSession();
        if (authSessionError) throw authSessionError;

        const user = data.session?.user;
        if (!user) throw new Error("Supabase did not return a signed-in session.");

        const profile = await getProfile(user.id);
        if (cancelled) return;

        router.navigate({ to: profile?.onboarded ? "/dashboard" : "/onboarding", replace: true });
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    };

    finishSignIn();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card/70 p-6 text-center">
        {error ? (
          <>
            <h1 className="text-lg font-semibold">Sign-in failed</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Link
              to="/auth"
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
            <h1 className="mt-4 text-lg font-semibold">Signing you in</h1>
            <p className="mt-2 text-sm text-muted-foreground">Finishing secure Supabase Auth.</p>
          </>
        )}
      </div>
    </div>
  );
}
