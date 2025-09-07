import {useState} from "react";
import {Field} from "@/app/component/auth-panel";

export default function SignInForm({
                               onSuccess,
                           }: {
    onSuccess?: (id: string) => void;
}) {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        // placeholder - wire to your auth
        await new Promise((r) => setTimeout(r, 500));
        setBusy(false);
        if (!identifier) setError("Please enter your node id or email.");
        else {
            // TODO: call your auth endpoint
            setError(null);
            onSuccess?.(identifier);
            alert("Demo sign-in (no backend) — replace with your auth flow.");
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4">
            <Field id="signin-identifier" label="Node ID or email" value={identifier} onChange={setIdentifier} placeholder="node-01 / demo@strix" autoComplete="username" />
            <Field id="signin-pass" label="Password" type="password" value={password} onChange={setPassword} placeholder="demo password" autoComplete="current-password" />

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