"use client";

import React from "react";
import { useTodayTxSummary, TxItem } from "@/app/hooks/hook-use-today-transact";

export default function TransactionsToday({
                                              items,
                                              showCurrency = "X",
                                              compact = false,
                                          }: {
    items?: TxItem[];
    showCurrency?: string | null;
    compact?: boolean;
}) {
    if (!items || items.length === 0) {
        return (
            <section className="bg-[#151515] border border-white/6 rounded-xl p-4 text-center">
                <h4 className="text-sm font-semibold text-white mb-1">Transactions — today</h4>
                <div className="text-xs text-[#9AA6A9]">No data</div>
            </section>
        );
    }

    const { count, grossIn, grossOut, net } = useTodayTxSummary(items);

    const fmt = (v: number) =>
        v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <section className="bg-[#151515] border border-white/6 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white">Transactions — today</h4>
                <div className="text-xs text-[#BFC7CA]">{count} tx</div>
            </div>

            <div className="mb-2">
                <div className="text-3xl font-bold text-white">
                    {fmt(net)}{showCurrency ? ` ${showCurrency}` : ""}
                </div>
                <div className="text-xs text-[#9AA6A9]">Net volume today</div>
            </div>

            {!compact && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                    <div className="flex flex-col">
                        <span className="text-xs text-[#BFC7CA]">Incoming</span>
                        <span className="text-sm font-semibold text-[#7EE7CE]">
              {fmt(grossIn)}{showCurrency ? ` ${showCurrency}` : ""}
            </span>
                    </div>

                    <div className="flex flex-col">
                        <span className="text-xs text-[#BFC7CA]">Outgoing</span>
                        <span className="text-sm font-semibold text-rose-400">
              {fmt(grossOut)}{showCurrency ? ` ${showCurrency}` : ""}
            </span>
                    </div>
                </div>
            )}
        </section>
    );
}
