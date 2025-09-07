"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type User = {
    id: string;
    username: string;
    email?: string;
} | null;

export function useAuth({ redirectIfUnauthenticated = false }: { redirectIfUnauthenticated?: boolean } = {}) {
    const [user, setUser] = useState<User>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const router = useRouter();

    // fetch current user from server; always clears loading in finally
    const fetchUser = useCallback(async (): Promise<User> => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/me");
            if (!res.ok) {
                setUser(null);
                return null;
            }
            const payload = await res.json().catch(() => ({ user: null }));
            const u = payload?.user ?? null;
            setUser(u);
            return u;
        } catch (e) {
            setUser(null);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // exposed refresh that callers can await
    const refresh = useCallback(() => fetchUser(), [fetchUser]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const u = await fetchUser();
            if (!mounted) return;
            if (redirectIfUnauthenticated && !u) {
                router.replace("/auth");
            }
        })();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchUser, redirectIfUnauthenticated]);

    function signInDemo(u: { id: string; username: string; email?: string }) {
        try {
            localStorage.setItem("demo_user", JSON.stringify(u));
        } catch {
            // ignore localStorage write failures
        }
        setUser(u);
    }

    function signOut() {
        try {
            localStorage.removeItem("demo_user");
        } catch {}
        setUser(null);
        router.replace("/auth");
    }

    return { user, loading, signInDemo, signOut, refresh };
}
