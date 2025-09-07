"use client";

import React from "react";

export default function TransactionsToday({ items }: { items: { id: string; amount: string; tsEpoch: number }[] }) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    const todays = items.filter(i => i.tsEpoch >= startOfDay);
    const total = todays.reduce((s, it) => {
        const num = parseFloat(it.amount.split(" ")[0]) || 0;
        return s + num;
    }, 0);

    return (
        <section className="bg-[#151515] border border-white/6 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white">Transactions — today</h4>
                <div className="text-xs text-[#BFC7CA]">{todays.length} tx</div>
            </div>

            <div className="text-3xl font-bold text-white mb-2">{total.toFixed(2)} X</div>
            <div className="text-xs text-[#9AA6A9]">Total volume today</div>
        </section>
    );
}
