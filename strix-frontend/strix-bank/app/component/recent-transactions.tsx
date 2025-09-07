"use client";

import React from "react";

type Tx = { id: string; from: string; to: string; amount: string; status: string; tsEpoch: number };

export default function RecentTransactions({ items }: { items: Tx[] }) {
    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Recent transactions</h3>
                <div className="text-sm text-[#BFC7CA]">Latest {items.length}</div>
            </div>

            <div className="space-y-3">
                {items.map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-[#121212] border border-white/6 rounded-lg p-3">
                        <div>
                            <div className="text-sm text-[#D1D5DB]">{t.from} → {t.to}</div>
                            <div className="text-xs text-[#9AA6A9]">{new Date(t.tsEpoch).toLocaleString()}</div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={`px-3 py-1 rounded-md text-xs font-semibold ${t.status === "failed" ? "bg-[#FA5765] text-white" : t.status === "pending" ? "bg-yellow-400 text-black" : "bg-[#00D6C1] text-black"}`}>
                                {t.status.replace("_", " ")}
                            </div>
                            <div className="text-sm font-semibold text-white">{t.amount}</div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
