// components/RequireAuth.tsx
"use client";

import React, { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/hokk-use-auth";

export default function RequireAuth({
                                        children,
                                        fallback = null,
                                    }: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    const { user, loading, refresh } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // ensure we read localStorage on mount
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // once we've checked and there is no user, redirect to /auth
        if (!loading && !user) {
            router.replace("/auth");
        }
    }, [user, loading, router]);

    if (loading) return fallback ?? <div className="p-6">Loading…</div>;

    // If user exists, render children; otherwise the effect will have redirected already
    return <>{children}</>;
}
