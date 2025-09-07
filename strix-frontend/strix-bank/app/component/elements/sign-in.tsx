"use client";

import { useState } from "react";
import { Field } from "@/app/component/auth-panel";
import { applyLogin } from "@/lib/hooks/use-login";
import {DEMO_SECRET_KEY_B64} from "@/lib/utils/keys"; // <-- new hook

export default function SignInForm({
                                       onSuccess,
                                   }: {
    onSuccess?: (id: string) => void;
}) {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Example: in real app, secret key would come from wallet/TPM/etc
    const demoSecretKey = DEMO_SECRET_KEY_B64;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!identifier || !password) {
            setError("Please enter your email/username and password.");
            return;
        }

        setBusy(true);
        try {
            const user = await applyLogin(
                {
                    emailOrUsername: identifier,
                    password,
                    user_pub: DEMO_SECRET_KEY_B64,
                    node_id: "demo-node", // could be dynamic
                },
                demoSecretKey
            );
            setBusy(false);
            onSuccess?.(user.id);
        } catch (err: unknown) {
            setBusy(false);
            setError((err as Error).message ?? "Sign-in failed");
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Field
                id="signin-identifier"
                label="Node ID or email"
                value={identifier}
                onChange={setIdentifier}
                placeholder="node-01 / demo@strix"
                autoComplete="username"
            />
            <Field
                id="signin-pass"
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="demo password"
                autoComplete="current-password"
            />

            {error && <div className="text-xs text-crimson mt-1">{error}</div>}

            <div className="mt-3 flex items-center justify-between gap-3">
                <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 rounded-md bg-gradient-to-r from-[#00D6C1] to-[#009bcf] text-[#062226] font-semibold shadow-[0_8px_20px_rgba(0,214,193,0.45)] hover:shadow-[0_10px_24px_rgba(0,214,193,0.6)] transition transform hover:-translate-y-0.5"
                >
                    {busy ? "Signing in…" : "Sign in"}
                </button>
            </div>
        </form>
    );
}
