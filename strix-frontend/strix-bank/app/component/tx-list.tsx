"use client";

import React from "react";

type Tx = {
    id: string;
    from: string;
    to: string;
    amount: string;
    status: "pending" | "verified_local" | "confirmed" | "failed";
    ts: string;
};

const statusColor: Record<Tx["status"], string> = {
    pending: "bg-yellow-500 text-black",
    verified_local: "bg-[#00D6C1] text-black",
    confirmed: "bg-[#00D6C1] text-black",
    failed: "bg-[#FA5765] text-white",
};

export default function TxList({ items }: { items: Tx[] }) {
    return (
        <section className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Recent transactions</h3>
                <div className="text-sm text-[#BFC7CA]">Showing {items.length}</div>
            </div>

            <div className="space-y-3">
                {items.map((t) => (
                    <div key={t.id} className="flex items-center justify-between bg-[#121212] border border-white/6 rounded-lg p-3">
                        <div>
                            <div className="text-sm text-[#D1D5DB]">{t.from} → {t.to}</div>
                            <div className="text-xs text-[#9AA6A9]">{t.ts}</div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={`px-3 py-1 rounded-md text-xs font-semibold ${statusColor[t.status]}`}>
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
