"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/hokk-use-auth";

/**
 * Client-side middleware for auth pages.
 * If a user exists in localStorage (via useAuth), redirect to /dashboard.
 */
export default function AuthRedirect() {
    const { user, loading, refresh } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // ensure we sync from localStorage on mount
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!loading && user) {
            router.replace("/dashboard");
        }
    }, [loading, user, router]);

    return null;
}
