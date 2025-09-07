// hooks/useLogin.ts
"use client";

import { useState } from "react";
import { useAuth } from "./hokk-use-auth";

type LoginInput = {
    identifier: string; // username or email
    password: string;
};

function readDemoUsers(): Array<{ id: string; username: string; email?: string; password: string }> {
    try {
        const raw = localStorage.getItem("demo_users");
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

/**
 * useLogin (demo)
 *
 * - Demo-only: validates credentials against demo_users in localStorage.
 * - On success calls useAuth().signInDemo(...)
 */
export function useLogin() {
    const { signInDemo } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function login(input: LoginInput) {
        setError(null);

        const identifier = (input.identifier ?? "").trim();
        const password = input.password ?? "";

        if (!identifier) {
            setError("Please enter username or email.");
            return { ok: false, error: "identifier_required" };
        }
        if (!password) {
            setError("Please enter password.");
            return { ok: false, error: "password_required" };
        }

        setLoading(true);
        try {
            const users = readDemoUsers();

            // find by username (case-insensitive) or email (case-insensitive)
            const user = users.find((u) => {
                if (!u) return false;
                if (u.username && u.username.toLowerCase() === identifier.toLowerCase()) return true;
                if (u.email && u.email.toLowerCase() === identifier.toLowerCase()) return true;
                return false;
            });

            if (!user) {
                setError("No user found.");
                return { ok: false, error: "not_found" };
            }

            // plain-text check (DEMO ONLY)
            if (user.password !== password) {
                setError("Invalid credentials.");
                return { ok: false, error: "invalid_credentials" };
            }

            // success: sign in via useAuth
            signInDemo({ id: user.id, username: user.username, email: user.email });
            return { ok: true, user: { id: user.id, username: user.username, email: user.email } };
        } catch (err: any) {
            setError("Login failed.");
            return { ok: false, error: "unknown" };
        } finally {
            setLoading(false);
        }
    }

    return { login, loading, error, clearError: () => setError(null) };
}
