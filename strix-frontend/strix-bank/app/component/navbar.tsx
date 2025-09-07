"use client";

import Link from "next/link";

export default function NavBar() {
    return (
        <header className="fixed top-0 w-full z-50 backdrop-blur bg-[#2e2e2e]/80
        border-b border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.4)]">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="h-16 flex items-center justify-between">
                    {/* Brand */}
                    <Link
                        href="/"
                        className="text-3xl font-bold font-orbitron
                        bg-gradient-to-r from-[#d1d5db] via-white to-[#00D6C1] bg-clip-text text-transparent
                        drop-shadow-[0_0_6px_rgba(0,214,193,0.5)]"
                    >StriX</Link>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/auth"
                            className="text-sm px-4 py-1 rounded-md border
                            border-white/10 text-[#E5E7EB] hover:text-white hover:border-[#00D6C1]/50
                             hover:shadow-[0_0_10px_rgba(0,214,193,0.6)] transition"
                        >Sign in</Link>
                        <Link
                            href="/auth"
                            className="text-sm px-4 py-1 rounded-md
                            bg-gradient-to-r from-[#00D6C1] to-[#009bcf] text-[#062226]
                             font-semibold shadow-[0_0_12px_rgba(0,214,193,0.7)] hover:shadow-[0_0_16px_rgba(0,214,193,0.9)] transition"
                        >Get started</Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
