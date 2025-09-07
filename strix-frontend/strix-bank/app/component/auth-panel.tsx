"use client";

import React, { useState } from "react";
import SignUpForm from "@/app/component/elements/sign-up";
import SignInForm from "@/app/component/elements/sign-in";

export function Field({id, label, type = "text", value, onChange, placeholder, autoComplete,}: {
    id: string;
    label: string;
    type?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    autoComplete?: string;
}) {
    return (
        <label htmlFor={id} className="block">
            <div className="text-sm text-[#D1D5DB] mb-2">{label}</div>
            <input
                id={id}
                name={id}
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                autoComplete={autoComplete}
                className="w-full rounded-lg bg-[#161616] border border-[#2E2E2E] px-4 py-2 text-[#E5E7EB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D6C1]/40"
            />
        </label>
    );
}

function SocialHints() {
    return (
        <div className="mt-4 text-xs text-[#BFC7CA]">
            By continuing you agree to StriX&apos;s T&C. Personal data is temporarily retained, no real accounts are created
        </div>
    );
}

export default function AuthPanel() {
    const [mode, setMode] = useState<"signin" | "signup">("signin");

    const handleSuccess = (id: string) => {
        // small demo callback - in real app you'd navigate or set context
        console.log("auth success for:", id);
    };

    return (
        <div className="min-h-[72vh] flex items-center justify-center px-4">
            <div
                className=" mt-5 w-full max-w-3xl rounded-2xl
                    bg-gradient-to-b from-[#1b1b1b] to-[#141414]/80 border border-white/6
                    shadow-[0_10px_30px_rgba(0,0,0,0.6),inset_0_0_12px_rgba(255,255,255,0.02)] p-6 md:p-10">
                {/* Header + toggle */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-sm text-[#D1D5DB]">Welcome to</div>
                        <div className="text-2xl font-extrabold bg-gradient-to-r from-[#d1d5db] via-white to-[#00D6C1] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,214,193,0.35)]">
                            StriX Auth
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
                            aria-pressed={mode === "signup"}
                            className="
                            relative inline-flex items-center gap-2 px-3 py-1 rounded-lg
                            bg-[#101010] border border-white/8 text-sm text-[#D1D5DB]
                            hover:shadow-[0_0_10px_rgba(0,214,193,0.12)]
                            transition">
                            <span className="text-xs">Switch to</span>
                            <strong className="text-sm">{mode === "signin" ? "Sign up" : "Sign in"}</strong>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Info / Branding */}
                    <div className="hidden md:flex flex-col justify-center gap-6 px-2">
                        <div className="text-lg font-semibold text-white">Minimal · Secure · Auditable</div>

                        <p className="text-sm text-[#C8CFD2] leading-relaxed">
                            Use StriX&aps;s secure DAG-based authentication subsystem to securely create an account
                            or login to your existing StriX account.
                        </p>

                        <ul className="mt-3 space-y-3 text-sm">
                            <li className="flex items-center gap-3 text-[#E5E7EB]">
                                <span className="w-2 h-2 rounded-full bg-[#FA5765] shadow-[0_0_6px_rgba(250,87,101,0.6)]" />
                                Blistering Fast Authentication
                            </li>
                            <li className="flex items-center gap-3 text-[#E5E7EB]">
                                <span className="w-2 h-2 rounded-full bg-[#FA5765] shadow-[0_0_6px_rgba(250,87,101,0.6)]" />
                                Extreme Security
                            </li>
                            <li className="flex items-center gap-3 text-[#E5E7EB]">
                                <span className="w-2 h-2 rounded-full bg-[#FA5765] shadow-[0_0_6px_rgba(250,87,101,0.6)]" />
                                Carefree Banking
                            </li>
                        </ul>
                    </div>

                    {/* Right: Forms */}
                    <div className="px-2">
                        <div className="bg-[#111111] border border-white/6 rounded-xl p-6 shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
                            <div className="mb-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold text-white">{mode === "signin" ? "Sign in" : "Create account"}</h2>
                                    <div className="text-xs font-orbitron font-semibold text-[#9AA6A9]">
                                        {mode === "signin" ? "Welcome Back" : "New Here?"}
                                    </div>
                                </div>
                                <div className="mt-2 text-sm text-[#C0C7CA]">
                                    {mode === "signin"
                                        ? "Sign in with your Strix identity to access the dashboard."
                                        : "Create a new Strix Identity using Strix Auth"}
                                </div>
                            </div>

                            {mode === "signin" ? <SignInForm onSuccess={handleSuccess} /> : <SignUpForm onSuccess={handleSuccess} />}

                            <SocialHints />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
