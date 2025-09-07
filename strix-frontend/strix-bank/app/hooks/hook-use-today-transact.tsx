// hooks/useTodayTxSummary.ts
"use client";
import {useMemo} from "react";

export type TxItem = {
    id: string;
    amount: string | number;
    tsEpoch: number;
};

export function useTodayTxSummary(items: TxItem[]) {
    return useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        let count = 0;
        let grossIn = 0;   // sum of positive amounts
        let grossOut = 0;  // sum of negative amounts (negative value)

        for (const it of items) {
            if (!it || typeof it.tsEpoch !== "number") continue;
            if (it.tsEpoch < startOfDay) continue;

            count++;

            // parse amount
            let n = 0;
            if (typeof it.amount === "number") {
                n = it.amount;
            } else if (typeof it.amount === "string") {
                // strip currency suffix/prefix, commas, keep sign
                // examples supported: "12.50 X", "12,345.50", "+12.5", "-3.14"
                const cleaned = it.amount.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
                if (cleaned) n = parseFloat(cleaned[0]);
                else n = 0;
            }

            if (Number.isFinite(n)) {
                if (n >= 0) grossIn += n;
                else grossOut += n;
            }
        }

        return {
            count,
            grossIn,
            grossOut,
            net: grossIn + grossOut,
        };
    }, [items]);
}
