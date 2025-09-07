// hooks/useTransactions.ts
"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";

export type TxLocal = {
    id: string;
    ts: string; // ISO
    amount: number;
    status: "confirmed" | "pending" | "failed";
    memo?: string;
    to?: string;
    from?: string;
};

type UseTransactionsOpts = {
    limit?: number;
    pollIntervalMs?: number | null; // null = no polling
    fetcher?: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
    onError?: (err: string) => void;
};

export function getCurrentUserFromLocalStorage(): { id?: string } | null {
    try {
        const raw = localStorage.getItem("currentUser") ?? localStorage.getItem("user");
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

type PageResult = {
    items: TxLocal[];
    nextCursor: string | null;
};

export function useTransactions(opts?: UseTransactionsOpts) {
    const {
        limit: defaultLimit = 20,
        pollIntervalMs: defaultPoll = null,
        fetcher, // do NOT bind fetch here — we'll create a stable one below
        onError,
    } = opts ?? {};

    // make fetcher stable: if user provided one, use it; otherwise memoize a bound fetch once
    const stableFetcher = useMemo(() => {
        return fetcher ?? (globalThis.fetch.bind(globalThis) as typeof fetch);
        // only re-create if caller changes fetcher
    }, [fetcher]);

    const mounted = useRef(true);
    const inflightController = useRef<AbortController | null>(null);
    const latestRequestId = useRef(0); // used to ignore out-of-order responses

    const [accountId, setAccountId] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        const u = getCurrentUserFromLocalStorage();
        return u?.id ?? null;
    });

    const [txs, setTxs] = useState<TxLocal[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [cursor, setCursor] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [pollIntervalMs, setPollIntervalMs] = useState<number | null>(defaultPoll);

    const hasMore = cursor !== null;

    const createQueryString = (account: string, limitNum: number, cur: string | null) => {
        const qs = new URLSearchParams();
        qs.set("accountId", account);
        qs.set("limit", String(limitNum));
        if (cur) qs.set("cursor", cur);
        return qs.toString();
    };

    const fetchPage = useCallback(
        async (pLimit = defaultLimit, pCursor: string | null = null): Promise<PageResult> => {
            const account = accountId;
            if (!account) return { items: [], nextCursor: null };

            // abort previous in-flight request
            if (inflightController.current) {
                try {
                    inflightController.current.abort();
                } catch {
                    // ignore
                }
            }
            const controller = new AbortController();
            inflightController.current = controller;
            const signal = controller.signal;

            const thisRequestId = ++latestRequestId.current;

            setLoading(true);
            setError(null);

            try {
                const qs = createQueryString(account, pLimit, pCursor);
                const res = await stableFetcher(`/api/transactions?${qs}`, { signal });

                if (!mounted.current) return { items: [], nextCursor: null };

                if (!res.ok) {
                    const txt = await res.text().catch(() => res.statusText ?? "error");
                    const errMsg = `fetch error: ${res.status} ${txt}`;
                    setError(errMsg);
                    onError?.(errMsg);
                    return { items: [], nextCursor: null };
                }

                const payload = await res.json().catch(() => ({}));

                if (thisRequestId !== latestRequestId.current) {
                    return { items: [], nextCursor: null };
                }

                const items: TxLocal[] = Array.isArray(payload.txs) ? payload.txs : [];
                const nextCursor: string | null = payload.nextCursor ?? null;

                return { items, nextCursor };
            } catch (e: unknown) {
                if (e instanceof DOMException && (e as DOMException).name === "AbortError") {
                    return { items: [], nextCursor: null };
                }
                const errMsg = e instanceof Error ? e.message : "network error";
                if (mounted.current) {
                    setError(errMsg);
                    onError?.(errMsg);
                }
                return { items: [], nextCursor: null };
            } finally {
                if (mounted.current) setLoading(false);
                if (inflightController.current === controller) inflightController.current = null;
            }
        },
        // stableFetcher is stable via useMemo; include it in deps
        [accountId, defaultLimit, stableFetcher, onError]
    );

    const refresh = useCallback(async () => {
        if (!accountId) {
            setTxs([]);
            setCursor(null);
            return;
        }
        const result = await fetchPage(defaultLimit, null);
        if (!mounted.current) return;
        setTxs(result.items);
        setCursor(result.nextCursor);
    }, [accountId, defaultLimit, fetchPage]);

    const loadMore = useCallback(async () => {
        if (!accountId || loading) return [];
        const nextCursor = cursor;
        const result = await fetchPage(defaultLimit, nextCursor);
        if (!mounted.current) return [];
        if (result.items.length > 0) {
            setTxs((s) => [...s, ...result.items]);
        }
        setCursor(result.nextCursor);
        return result.items;
    }, [accountId, cursor, defaultLimit, fetchPage, loading]);

    useEffect(() => {
        mounted.current = true;

        let debounceTimer: any = null;
        const onStorage = (ev?: StorageEvent) => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const u = getCurrentUserFromLocalStorage();
                setAccountId(u?.id ?? null);
            }, 50);
        };
        window.addEventListener("storage", onStorage);

        // initial load if account present
        refresh();

        // polling
        let intervalHandle: any = null;
        if (pollIntervalMs && pollIntervalMs > 0) {
            intervalHandle = setInterval(() => {
                refresh();
            }, pollIntervalMs);
        }

        return () => {
            mounted.current = false;
            window.removeEventListener("storage", onStorage);
            if (debounceTimer) clearTimeout(debounceTimer);
            if (intervalHandle) clearInterval(intervalHandle);
            // abort any inflight fetch
            if (inflightController.current) {
                try {
                    inflightController.current.abort();
                } catch {}
                inflightController.current = null;
            }
        };
        // depend on refresh and pollIntervalMs (refresh is stable now)
    }, [refresh, pollIntervalMs]);

    useEffect(() => {
        setTxs([]);
        setCursor(null);
        setError(null);
        latestRequestId.current = 0;
        if (accountId) {
            refresh();
        }
    }, [accountId, refresh]);

    return {
        accountId,
        setAccountId,
        txs,
        setTxs,
        loading,
        error,
        refresh,
        loadMore,
        hasMore,
        setPollIntervalMs,
    };
}
