"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import NavBar from "@/app/component/dashboard-nav";

type Profile = {
    id: string;
    username: string;
    email?: string;
    avatarUrl?: string;
    joinedAt?: string;
};

type BalancePoint = {
    ts: string;
    balance: number;
};

type Tx = {
    id: string;
    ts: string;
    amount: number;
    status: "confirmed" | "pending" | "failed";
    memo?: string;
};

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [balanceHistory, setBalanceHistory] = useState<BalancePoint[]>([]);
    const [txs, setTxs] = useState<Tx[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        async function load() {
            try {
                const [pRes, bRes, tRes] = await Promise.all([
                    fetch("/api/me"),
                    fetch("/api/balance-history"),
                    fetch("/api/transactions?limit=8"),
                ]);

                if (!mounted) return;

                if (pRes.ok) setProfile(await pRes.json());
                if (bRes.ok) setBalanceHistory(await bRes.json());
                if (tRes.ok) setTxs(await tRes.json());
            } catch (e) {
                if (!mounted) return;
                // fallback mock
                setProfile({
                    id: "u_0",
                    username: "stormweaver",
                    email: "stormweaver@example.com",
                    avatarUrl: undefined,
                    joinedAt: "2024-09-01",
                });

                const now = new Date();
                const mockBal: BalancePoint[] = [];
                for (let i = 14; i >= 0; --i) {
                    const d = new Date(now);
                    d.setDate(now.getDate() - i);
                    mockBal.push({
                        ts: d.toISOString().slice(0, 10),
                        balance: 1000 + Math.round(Math.random() * 400 - 100),
                    });
                }
                setBalanceHistory(mockBal);

                setTxs([
                    { id: "tx_001", ts: new Date().toISOString(), amount: -12.5, status: "confirmed", memo: "Transfer" },
                    { id: "tx_002", ts: new Date().toISOString(), amount: 200, status: "confirmed", memo: "Reward" },
                    { id: "tx_003", ts: new Date().toISOString(), amount: -3.14, status: "pending", memo: "Fee" },
                ]);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        load();
        return () => {
            mounted = false;
        };
    }, [router]);

    function formatCurrency(v: number) {
        return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const chartData = balanceHistory.map((p) => ({ name: p.ts, balance: p.balance }));

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(0,214,193,0.03),transparent_20%),linear-gradient(180deg,#0b0b0d, #0f1112)] text-[#E6EEF0] antialiased p-6">
            <NavBar />
            <div className="py-10"></div>
            {/* Top-left fixed text logo */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 pt-8">
                {/* Profile card */}
                <aside
                    className="
            col-span-1
            rounded-2xl
            p-6
            shadow-[0_18px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]
            border
            border-[rgba(255,255,255,0.06)]
            bg-gradient-to-b
            from-[#161616]
            to-[#121213]
            backdrop-blur-sm
          "
                >
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
                            style={{
                                background: "linear-gradient(135deg,#00D6C1,#009bb8)",
                                color: "#021515",
                                boxShadow: "0 8px 20px rgba(0,214,193,0.12)",
                            }}
                        >
                            {profile?.username ? profile.username[0].toUpperCase() : "U"}
                        </div>

                        <div>
                            <div className="text-lg font-semibold leading-tight">{profile?.username ?? "—"}</div>
                            <div className="text-sm text-[#BFC7CA]">{profile?.email ?? "no-email@local"}</div>
                            <div className="text-xs text-[#94A0A2] mt-2">Joined: {profile?.joinedAt ?? "—"}</div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-[#9AA6A9]">Current balance</div>
                            <div className="text-lg font-mono">
                                {balanceHistory.length ? formatCurrency(balanceHistory[balanceHistory.length - 1].balance) : "—"}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="px-3 py-2 rounded-md bg-gradient-to-r from-[#00D6C1] to-[#009bcf] text-[#042524] font-semibold shadow-[0_10px_24px_rgba(0,214,193,0.14)] text-sm">
                                Send
                            </button>
                            <button className="px-3 py-2 rounded-md border border-[rgba(255,255,255,0.06)] text-sm text-[#D1D5DB] hover:bg-white/2 transition">
                                Receive
                            </button>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="text-sm text-[#9AA6A9]">Profile actions</div>
                        <div className="mt-3 flex flex-col gap-3">
                            <button className="w-full text-left px-3 py-2 rounded-md bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.03)]">
                                Edit profile
                            </button>
                            <button className="w-full text-left px-3 py-2 rounded-md bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.03)]">
                                Export keys
                            </button>
                            <button className="w-full text-left px-3 py-2 rounded-md bg-[#e11d48] text-white hover:brightness-105">
                                Logout
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Main column: Chart + tx list */}
                <main
                    className="
            col-span-2
            rounded-2xl
            p-6
            shadow-[0_18px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.02)]
            border
            border-[rgba(255,255,255,0.05)]
            bg-gradient-to-b
            from-[#171717]
            to-[#111213]
            flex flex-col
          "
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Balance history</h2>
                        <div className="text-sm text-[#9AA6A9]">Last 15 days</div>
                    </div>

                    <div className="mt-4 h-64 rounded-md border border-dashed border-[rgba(255,255,255,0.03)] p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 6, right: 12, left: -10, bottom: 6 }}>
                                <CartesianGrid strokeDasharray="4 6" strokeOpacity={0.04} />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#BFC7CA" }} axisLine={false} />
                                <YAxis tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 12, fill: "#BFC7CA" }} axisLine={false} />
                                <Tooltip
                                    wrapperStyle={{ background: "#0d0f10", border: "1px solid rgba(255,255,255,0.04)" }}
                                    contentStyle={{ color: "#E5E7EB", borderRadius: 8 }}
                                    formatter={(value: any) => (typeof value === "number" ? formatCurrency(value) : value)}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="balance"
                                    stroke="#00D6C1"
                                    strokeWidth={3}
                                    dot={false}
                                    activeDot={{ r: 5, stroke: "#00D6C1", strokeWidth: 2, fill: "#061514" }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <h3 className="text-lg font-medium">Recent transactions</h3>
                        <button className="text-sm px-3 py-1 rounded-md bg-[rgba(255,255,255,0.03)]">View all</button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                        {loading ? (
                            <div className="col-span-full text-[#9AA6A9]">Loading…</div>
                        ) : (
                            txs.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="p-3 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[linear-gradient(180deg,rgba(255,255,255,0.01),transparent)] flex items-center justify-between"
                                >
                                    <div>
                                        <div className="text-sm font-medium text-[#E6EEF0]">{tx.memo ?? tx.id}</div>
                                        <div className="text-xs text-[#9AA6A9]">{new Date(tx.ts).toLocaleString()}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-mono ${tx.amount < 0 ? "text-rose-400" : "text-[#7EE7CE]"}`}>
                                            {tx.amount < 0 ? "-" : "+"}
                                            {formatCurrency(Math.abs(tx.amount))}
                                        </div>
                                        <div className="text-xs text-[#9AA6A9]">{tx.status}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>

            <div className="max-w-6xl mx-auto mt-6 text-sm text-[#94A0A2]">
                Tip: If you want live updates, plug a websocket at{" "}
                <code className="bg-[#0a0a0b] px-1 py-0.5 rounded">/ws/account/{profile?.id}</code> to stream balance &amp; tx events.
            </div>
        </div>
    );
}
