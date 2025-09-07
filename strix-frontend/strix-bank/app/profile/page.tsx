"use client";

import React, { useEffect, useMemo, useState } from "react";
import NavBar from "@/app/component/dashboard-nav";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import {useAuth} from "@/app/hooks/hokk-use-auth";
import {useTransactions} from "@/app/hooks/hook-use-transaction";

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
    // auth hook (your implementation)
    const { user, loading: authLoading, refresh: refreshAuth } = useAuth();

    // transactions hook (our hook)
    const {
        txs,
        setTxs,
        loading: txLoading,
        error: txError,
        refresh: refreshTxs,
        setPollIntervalMs,
    } = useTransactions({ limit: 50, pollIntervalMs: null });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(Boolean(authLoading) || Boolean(txLoading));
    }, [authLoading, txLoading]);

    useEffect(() => {
        // enable polling if you'd like; currently we keep it enabled at 30s
        setPollIntervalMs(30_000);
        refreshAuth();
        refreshTxs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Derive profile from auth user
    const profile: Profile | null = useMemo(() => {
        if (!user) return null;
        return {
            id: user.id,
            username: user.username,
            email: user.email,
        };
    }, [user]);

    // Build a 15-day balance history from transactions.
    // If there are no transactions, the result will be an empty array.
    const balanceHistory: BalancePoint[] = useMemo(() => {
        if (!txs || txs.length === 0) return [];

        const DAYS = 15;
        const now = new Date();
        const dayKey = (d: Date) => d.toISOString().slice(0, 10);

        const dates: string[] = [];
        for (let i = DAYS - 1; i >= 0; --i) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            dates.push(dayKey(d));
        }

        const perDay = new Map<string, number>();
        for (const tx of txs) {
            if (!tx?.ts) continue;
            const d = new Date(tx.ts);
            if (Number.isNaN(d.getTime())) continue;
            const k = dayKey(d);
            perDay.set(k, (perDay.get(k) ?? 0) + tx.amount);
        }

        // Without a known opening balance from the server we cannot invent one.
        // We'll compute a delta-based history only if we can reasonably do so.
        // For safety, if perDay is empty we return [].
        const hasAny = Array.from(perDay.values()).some((v) => v !== 0);
        if (!hasAny) return [];

        // If there are daily deltas, start from 0 and accumulate (server should supply base balance).
        let running = 0;
        const points: BalancePoint[] = [];
        for (const d of dates) {
            const delta = perDay.get(d) ?? 0;
            running = running + delta;
            points.push({ ts: d, balance: Math.round((running + Number.EPSILON) * 100) / 100 });
        }
        return points;
    }, [txs]);

    function formatCurrency(v: number) {
        return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    const chartData = balanceHistory.map((p) => ({ name: p.ts, balance: p.balance }));

    // UI helpers
    const showNoProfile = !profile;
    const showNoTxs = !txs || txs.length === 0;
    const showNoHistory = !balanceHistory || balanceHistory.length === 0;

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_15%_10%,rgba(0,214,193,0.03),transparent_20%),linear-gradient(180deg,#0b0b0d, #0f1112)] text-[#E6EEF0] antialiased p-6">
            <NavBar />
            <div className="py-10" />
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
                            {showNoProfile ? "U" : (profile!.username ? profile!.username[0].toUpperCase() : "U")}
                        </div>

                        <div>
                            <div className="text-lg font-semibold leading-tight">{showNoProfile ? "—" : profile!.username}</div>
                            <div className="text-sm text-[#BFC7CA]">{showNoProfile ? "no data" : profile!.email ?? "—"}</div>
                            <div className="text-xs text-[#94A0A2] mt-2">Joined: {showNoProfile ? "—" : profile!.joinedAt ?? "—"}</div>
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-[#9AA6A9]">Current balance</div>
                            <div className="text-lg font-mono">{showNoHistory ? "No data" : formatCurrency(balanceHistory[balanceHistory.length - 1].balance)}</div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button className="px-3 py-2 rounded-md bg-gradient-to-r from-[#00D6C1] to-[#009bcf] text-[#042524] font-semibold shadow-[0_10px_24px_rgba(0,214,193,0.14)] text-sm" disabled>
                                Send
                            </button>
                            <button className="px-3 py-2 rounded-md border border-[rgba(255,255,255,0.06)] text-sm text-[#D1D5DB] hover:bg-white/2 transition" disabled>
                                Receive
                            </button>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="text-sm text-[#9AA6A9]">Profile actions</div>
                        <div className="mt-3 flex flex-col gap-3">
                            <button className="w-full text-left px-3 py-2 rounded-md bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.03)]" disabled>
                                Edit profile
                            </button>
                            <button className="w-full text-left px-3 py-2 rounded-md bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.03)]" disabled>
                                Export keys
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

                    <div className="mt-4 h-64 rounded-md border border-dashed border-[rgba(255,255,255,0.03)] p-2 flex items-center justify-center">
                        {showNoHistory ? (
                            <div className="text-sm text-[#9AA6A9]">No balance history available.</div>
                        ) : (
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
                        )}
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <h3 className="text-lg font-medium">Recent transactions</h3>
                        <button className="text-sm px-3 py-1 rounded-md bg-[rgba(255,255,255,0.03)]" disabled>
                            View all
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                        {loading ? (
                            <div className="col-span-full text-[#9AA6A9]">Loading…</div>
                        ) : showNoTxs ? (
                            <div className="col-span-full text-sm text-[#9AA6A9]">No transactions available.</div>
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
            </div>
        </div>
    );
}
