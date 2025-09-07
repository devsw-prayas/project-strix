import React, {useState} from "react";
import {Field} from "@/app/component/auth-panel";

 export default function SignUpForm({
                               onSuccess,
                           }: {
    onSuccess?: (id: string) => void;
}) {
    const [name, setName] = useState("");
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name || !identifier || !password) {
            setError("Please fill all fields.");
            return;
        }
        setBusy(true);
        await new Promise((r) => setTimeout(r, 600));
        setBusy(false);
        onSuccess?.(identifier);
        alert("Demo sign-up complete (no backend). Replace with your signup flow.");
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Field id="signup-name" label="Display name" value={name} onChange={setName} placeholder="Node owner" autoComplete="name" />
            <Field id="signup-identifier" label="Node ID or email" value={identifier} onChange={setIdentifier} placeholder="node-02 / demo@strix" autoComplete="username" />
            <Field id="signup-pass" label="Password" type="password" value={password} onChange={setPassword} placeholder="choose a password" autoComplete="new-password" />

            {error && <div className="text-xs text-crimson mt-1">{error}</div>}

            <div className="mt-3 flex items-center justify-between gap-3">
                <button
                    type="submit"
                    disabled={busy}
                    className="px-5 py-2 rounded-md bg-[#FA5765] text-white font-semibold shadow-[0_8px_20px_rgba(250,87,101,0.35)] hover:shadow-[0_10px_24px_rgba(250,87,101,0.55)] transition transform hover:-translate-y-0.5"
                >
                    {busy ? "Creating…" : "Create account"}
                </button>
            </div>
        </form>
    );
}