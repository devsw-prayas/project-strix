// hooks/useRecentTransactions.ts
"use client";
import { useEffect, useRef, useState } from "react";

export type Tx = {
    id: string;
    from: string;
    to: string;
    amount: string;
    status: string;
    tsEpoch: number;
};

export function useRecentTransactions(opts?: { limit?: number; intervalMs?: number }) {
    const limit = opts?.limit ?? 10;
    const intervalMs = opts?.intervalMs ?? 8000;
    const [items, setItems] = useState<Tx[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mounted = useRef(true);

    async function fetchTxs() {
        setLoading(true);
        try {
            const res = await fetch(`/api/transactions?limit=${limit}`);
            if (!res.ok) throw new Error(`status ${res.status}`);
            const body = await res.json();
            if (!mounted.current) return;
            if (body?.ok && Array.isArray(body.transactions)) {
                // Ensure shape matches Tx
                const txs: Tx[] = body.transactions.map((t: any) => ({
                    id: t.id,
                    from: t.from ?? "—",
                    to: t.to ?? "—",
                    amount: String(t.amount),
                    status: t.status,
                    tsEpoch: Date.parse(t.ts ?? t.tsEpoch) || Date.now(),
                }));
                setItems(txs);
            } else {
                setItems([]);
            }
        } catch (err: any) {
            console.error("fetch /api/transactions", err);
            setError(err?.message ?? "Failed to fetch");
            setItems([]);
        } finally {
            if (mounted.current) setLoading(false);
        }
    }

    useEffect(() => {
        mounted.current = true;
        fetchTxs();
        const t = setInterval(fetchTxs, intervalMs);
        return () => {
            mounted.current = false;
            clearInterval(t);
        };
    }, [limit, intervalMs]);

    return { items, loading, error, refresh: fetchTxs };
}
