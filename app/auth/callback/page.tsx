"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthV2 } from "@/hooks/use-auth-v2";
import { FullPageLoader } from "@/components/ui/full-page-loader";

export default function AuthCallbackPage() {
  const { isAuthenticated, isLoading, profile } = useAuthV2();
  const router = useRouter();

  useEffect(() => {
    // This page is just a temporary loading screen.
    // The actual redirect logic is handled by the onAuthStateChange
    // listener in the AuthProviderV2.

    // If authentication is complete, but the listener somehow hasn't redirected,
    // we can give it a push. This is a fallback.
    if (!isLoading && isAuthenticated && profile) {
      // Determine redirect path based on profile
      if (profile.role === 'pending_player' && !profile.onboarding_completed) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    }
  }, [isAuthenticated, isLoading, profile, router]);

  // The main purpose is to show a loading screen while the auth provider
  // detects the new session and redirects automatically.
  return <FullPageLoader message="Finalizing login..." />;
}
