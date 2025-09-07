"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, User, Settings } from "lucide-react";

export default function NavBar({
                                   brandName = "StriX",
                               }: {
    brandName?: string;
}) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // close on escape
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setMobileOpen(false);
                setMenuOpen(false);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // click-outside user menu
    useEffect(() => {
        function onDoc(e: MouseEvent) {
            if (!menuRef.current) return;
            if (menuRef.current.contains(e.target as Node)) return;
            setMenuOpen(false);
        }
        if (menuOpen) document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [menuOpen]);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur bg-[#2e2e2e]/85 border-b border-white/8 shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="h-16 flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-3">
              <span
                  aria-hidden
                  className="inline-flex items-center justify-center h-9 w-9 rounded-full"
                  style={{ background: "linear-gradient(90deg,#00D6C1,#009bcf)" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="11" fill="white" opacity="0.06" />
                  <path d="M6 12C6 9.23858 8.23858 7 11 7H13.5C16.5376 7 19 9.46243 19 12.5C19 15.5376 16.5376 18 13.5 18H11C8.23858 18 6 15.7614 6 13" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>

                            <span className="hidden sm:inline-block font-extrabold text-lg bg-gradient-to-r from-[#d1d5db] via-white to-[#00D6C1] bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(0,214,193,0.35)]">
                {brandName}
              </span>
                        </Link>
                    </div>

                    {/* Nav links (desktop) */}
                    <nav className="hidden md:flex items-center gap-4">
                        <Link href="/dashboard" className="text-sm text-[#D1D5DB] hover:text-white px-3 py-2 rounded-md">Dashboard</Link>
                        <Link href="/transactions" className="text-sm text-[#D1D5DB] hover:text-white px-3 py-2 rounded-md">Transactions</Link>
                        <Link href="/admin" className="text-sm text-[#D1D5DB] hover:text-white px-3 py-2 rounded-md">Admin</Link>
                        <Link href="/profile" className="text-sm text-[#D1D5DB] hover:text-white px-3 py-2 rounded-md">Profile</Link>
                    </nav>

                    {/* Actions / mobile button */}
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-3">
                            <Link
                                href="/transactions/new"
                                className="inline-flex items-center px-4 py-2 rounded-md bg-gradient-to-r from-[#00D6C1] to-[#009bcf] text-[#062226] font-semibold shadow-[0_6px_24px_rgba(0,214,193,0.35)] hover:brightness-95 transition"
                            >
                                New Transaction
                            </Link>
                        </div>

                        {/* user avatar */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setMenuOpen((s) => !s)}
                                className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/6 focus:outline-none"
                                aria-haspopup="true"
                                aria-expanded={menuOpen}
                            >
                <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-[#00D6C1] text-[#062226] font-semibold">
                  DU
                </span>
                                <span className="hidden md:inline text-sm text-[#E5E7EB]">Demo User</span>
                            </button>

                            {/* user menu */}
                            {menuOpen && (
                                <div className="absolute right-0 mt-2 w-44 bg-[#111111] rounded-md border border-white/6 shadow-lg py-2 z-50">
                                    <Link href="/profile" className="block px-4 py-2 text-sm text-[#D1D5DB] hover:bg-white/3">
                                        <div className="flex items-center gap-2"><User size={14} /> Profile</div>
                                    </Link>
                                    <Link href="/settings" className="block px-4 py-2 text-sm text-[#D1D5DB] hover:bg-white/3">
                                        <div className="flex items-center gap-2"><Settings size={14} /> Settings</div>
                                    </Link>
                                    <hr className="my-1 border-t border-white/6" />
                                    <button className="w-full text-left px-4 py-2 text-sm text-[#FA5765] hover:bg-white/3">Sign out</button>
                                </div>
                            )}
                        </div>

                        {/* mobile menu toggle */}
                        <button
                            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-md hover:bg-white/6"
                            onClick={() => setMobileOpen((s) => !s)}
                            aria-label="Open menu"
                            aria-expanded={mobileOpen}
                        >
                            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div className="md:hidden border-t border-white/6 bg-[#1a1a1a]/90">
                    <div className="px-4 py-3 space-y-1">
                        <Link href="/dashboard" className="block px-3 py-2 rounded-md text-[#D1D5DB] hover:bg-white/3">Dashboard</Link>
                        <Link href="/transactions" className="block px-3 py-2 rounded-md text-[#D1D5DB] hover:bg-white/3">Transactions</Link>
                        <Link href="/admin" className="block px-3 py-2 rounded-md text-[#D1D5DB] hover:bg-white/3">Admin</Link>
                        <Link href="/profile" className="block px-3 py-2 rounded-md text-[#D1D5DB] hover:bg-white/3">Profile</Link>

                        <div className="pt-2 border-t border-white/6 mt-2">
                            <Link href="/transactions/new" className="block px-3 py-2 rounded-md text-[#00D6C1] bg-[#061f1b]">New Transaction</Link>
                            <Link href="/auth" className="block px-3 py-2 rounded-md text-[#D1D5DB]">Sign in</Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
