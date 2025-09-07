// hooks/useRegister.ts
"use client";

import { useState } from "react";
import { useAuth } from "@/app/hooks/hokk-use-auth";

export type RegisterInput = {
    username: string;
    email?: string;
    password: string;
};

function simpleEmailValid(e?: string) {
    if (!e) return false;
    // very small email sanity check
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function makeId() {
    return "u_" + Math.random().toString(36).slice(2, 9);
}

function readDemoUsers(): Array<{ id: string; username: string; email?: string; password: string }> {
    try {
        const raw = localStorage.getItem("demo_users");
        if (!raw) return [];
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeDemoUsers(users: Array<{ id: string; username: string; email?: string; password: string }>) {
    try {
        localStorage.setItem("demo_users", JSON.stringify(users));
    } catch {
        // ignore
    }
}

/**
 * useRegister
 *
 * Demo-first registration hook. Stores demo accounts in localStorage and signs
 * in the new user via useAuth.signInDemo().
 *
 * Note: for production you would call your GraphQL / REST register endpoint instead.
 */
export function useRegister() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { signInDemo } = useAuth();

    async function register(input: RegisterInput) {
        setError(null);

        const username = (input.username ?? "").trim();
        const email = (input.email ?? "").trim();
        const password = input.password ?? "";

        // basic validation
        if (!username) {
            setError("Please provide a username.");
            return { ok: false, error: "username_required" };
        }
        if (!password || password.length < 3) {
            setError("Password must be at least 3 characters.");
            return { ok: false, error: "weak_password" };
        }
        if (email && !simpleEmailValid(email)) {
            setError("Please provide a valid email address.");
            return { ok: false, error: "invalid_email" };
        }

        setLoading(true);
        try {
            // read existing demo users
            const users = readDemoUsers();

            // check duplicates
            const dupName = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
            if (dupName) {
                setError("Username already taken.");
                return { ok: false, error: "username_exists" };
            }
            if (email) {
                const dupEmail = users.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase());
                if (dupEmail) {
                    setError("Email already registered.");
                    return { ok: false, error: "email_exists" };
                }
            }

            // create demo user (store password in localStorage for demo only)
            const newUser = { id: makeId(), username, email: email || undefined, password };
            users.unshift(newUser);
            writeDemoUsers(users);

            // auto sign-in demo user
            signInDemo({ id: newUser.id, username: newUser.username, email: newUser.email });

            setLoading(false);
            return { ok: true, user: { id: newUser.id, username: newUser.username, email: newUser.email } };
        } catch (err: unknown) {
            setError("Registration failed.");
            setLoading(false);
            return { ok: false, error: "unknown" };
        }
    }

    return { register, loading, error };
}
