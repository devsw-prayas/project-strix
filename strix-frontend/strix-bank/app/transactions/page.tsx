"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NavBar from "@/app/component/dashboard-nav";

/* ---------------- Types ---------------- */
type TxLocal = {
    id: string;
    ts: string;
    amount: number;
    status: "confirmed" | "pending" | "failed";
    memo?: string;
    to?: string;
    from?: string;
};

/* ---------------- Mock API helpers (replace with real endpoints) ---------------- */
function fakeApiSend(payload: { to: string; amount: number; memo?: string }) {
    return new Promise<TxLocal>((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() < 0.95) {
                resolve({
                    id: `tx_${Math.random().toString(36).slice(2, 9)}`,
                    ts: new Date().toISOString(),
                    amount: -Math.abs(payload.amount),
                    status: "pending",
                    memo: payload.memo ?? "Transfer",
                    to: payload.to,
                });
            } else {
                reject(new Error("Network error"));
            }
        }, 700 + Math.random() * 700);
    });
}

function fakeFetchTxs(limit = 12): Promise<TxLocal[]> {
    return new Promise((res) => {
        setTimeout(() => {
            const now = Date.now();
            const items: TxLocal[] = Array.from({ length: limit }).map((_, i) => {
                const amt = Math.round((Math.random() * 800 - 400) * 100) / 100;
                return {
                    id: `tx_${(now - i).toString(36)}`,
                    ts: new Date(now - i * 1000 * 60 * 60 * 6).toISOString(),
                    amount: amt,
                    status: amt < 0 ? (Math.random() < 0.9 ? "confirmed" : "pending") : "confirmed",
                    memo: amt < 0 ? "Payment" : "Reward",
                    to: amt < 0 ? "node-031" : undefined,
                };
            });
            res(items);
        }, 450);
    });
}

/* ---------------- SendModal ---------------- */
function SendModal({
                       defaultTo = "",
                       onClose,
                       onSent,
                   }: {
    defaultTo?: string;
    onClose: () => void;
    onSent: (tx: TxLocal) => void;
}) {
    const [to, setTo] = useState(defaultTo);
    const [amount, setAmount] = useState("");
    const [memo, setMemo] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const parsed = Number(amount);

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError(null);

        if (!to.trim()) {
            setError("Please enter a destination node or address.");
            return;
        }
        if (!amount || Number.isNaN(parsed) || parsed <= 0) {
            setError("Enter a valid amount > 0.");
            return;
        }

        setBusy(true);
        try {
            const tx = await fakeApiSend({ to, amount: parsed, memo });
            onSent(tx); // optimistic addition
            setBusy(false);
            onClose();
        } catch (err: any) {
            setError(err?.message ?? "Failed to send.");
            setBusy(false);
        }
    };

    return (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !busy && onClose()} />
            <form
                onSubmit={submit}
                className="relative z-10 w-full max-w-md rounded-2xl p-6 bg-gradient-to-b from-[#121212] to-[#0f0f10] border border-[rgba(255,255,255,0.04)] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Send funds</h3>
                    <button type="button" onClick={() => !busy && onClose()} className="text-sm text-[#9AA6A9]">
                        close
                    </button>
                </div>

                <label className="block text-sm text-[#BFC7CA] mb-2">
                    To (node / address)
                    <input
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        className="mt-1 w-full rounded-md bg-[#0b0b0b] border border-[rgba(255,255,255,0.03)] px-3 py-2 focus:outline-none"
                        placeholder="node-031 or demo@strix"
                        autoComplete="off"
                    />
                </label>

                <label className="block text-sm text-[#BFC7CA] mb-2">
                    Amount
                    <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 w-full rounded-md bg-[#0b0b0b] border border-[rgba(255,255,255,0.03)] px-3 py-2 focus:outline-none font-mono"
                        placeholder="e.g. 12.50"
                        inputMode="decimal"
                    />
                </label>

                <label className="block text-sm text-[#BFC7CA] mb-2">
                    Memo (optional)
                    <input
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        className="mt-1 w-full rounded-md bg-[#0b0b0b] border border-[rgba(255,255,255,0.03)] px-3 py-2 focus:outline-none"
                        placeholder="Invoice #123"
                    />
                </label>

                {error && <div className="text-xs text-rose-400 mb-2">{error}</div>}

                <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                        type="submit"
                        disabled={busy}
                        className="px-4 py-2 rounded-md bg-gradient-to-r from-[#00D6C1] to-[#009bcf] text-[#042524] font-semibold shadow-[0_8px_20px_rgba(0,214,193,0.12)]"
                    >
                        {busy ? "Sending…" : "Send"}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setTo("");
                            setAmount("");
                            setMemo("");
                        }}
                        className="px-3 py-2 rounded-md border border-[rgba(255,255,255,0.04)] text-sm"
                    >
                        Clear
                    </button>
                </div>
            </form>
        </div>
    );
}

/* ---------------- ReceivePanel ---------------- */
function ReceivePanel({ addr }: { addr: string }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="rounded-lg p-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.01),transparent)] border border-[rgba(255,255,255,0.04)]">
            <div className="text-sm text-[#BFC7CA] mb-2">Receive funds</div>
            <div className="flex items-center justify-between gap-3">
                <div className="font-mono text-sm px-3 py-2 bg-[#0b0b0b] rounded">{addr}</div>
                <button
                    onClick={async () => {
                        try {
                            await navigator.clipboard.writeText(addr);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1500);
                        } catch {
                            setCopied(false);
                        }
                    }}
                    className="px-3 py-2 rounded-md bg-white/3 text-sm"
                >
                    {copied ? "Copied" : "Copy"}
                </button>
            </div>
        </div>
    );
}

/* ---------------- TxRow ---------------- */
function TxRow({ tx }: { tx: TxLocal }) {
    const ts = (() => {
        try {
            return new Date(tx.ts).toLocaleString();
        } catch {
            return tx.ts;
        }
    })();

    return (
        <div className="p-3 rounded-lg flex items-center justify-between bg-[linear-gradient(180deg,rgba(255,255,255,0.01),transparent)] border border-[rgba(255,255,255,0.03)]">
            <div>
                <div className="text-sm font-medium text-[#E6EEF0]">{tx.memo ?? tx.id}</div>
                <div className="text-xs text-[#9AA6A9]">{ts}</div>
            </div>
            <div className="text-right">
                <div className={`font-mono ${tx.amount < 0 ? "text-rose-400" : "text-[#7EE7CE]"}`}>
                    {tx.amount < 0 ? "-" : "+"}
                    {Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-[#9AA6A9]">{tx.status}</div>
            </div>
        </div>
    );
}

/* ---------------- TxList ---------------- */
function TxList({
                    initial,
                    pageSize = 8,
                    onLoadMore,
                }: {
    initial: TxLocal[];
    pageSize?: number;
    onLoadMore?: () => Promise<TxLocal[] | void>;
}) {
    const [items, setItems] = useState<TxLocal[]>(initial);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);

    useEffect(() => {
        setItems(initial);
        setPage(1);
    }, [initial]);

    const loadMore = async () => {
        if (!onLoadMore) return;
        setLoadingMore(true);
        const newItems = await onLoadMore();
        if (Array.isArray(newItems) && newItems.length) {
            setItems((s) => [...s, ...newItems]);
            setPage((p) => p + 1);
        }
        setLoadingMore(false);
    };

    return (
        <div className="space-y-3">
            {items.length === 0 ? (
                <div className="text-sm text-[#9AA6A9]">No transactions yet.</div>
            ) : (
                items.map((t) => <TxRow tx={t} key={t.id} />)
            )}

            {onLoadMore && (
                <div className="mt-3 text-center">
                    <button
                        className="px-4 py-2 rounded-md bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.04)] text-sm"
                        onClick={loadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? "Loading…" : "Load more"}
                    </button>
                </div>
            )}
        </div>
    );
}

/* ---------------- TransactionPanel (export, no props) ---------------- */
export default function TransactionPanel() {
    // fully self-contained: no props required
    const [txs, setTxs] = useState<TxLocal[]>([]);
    const [showSend, setShowSend] = useState(false);
    const [showReceive, setShowReceive] = useState(false);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<"all" | "in" | "out" | "pending">("all");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        fakeFetchTxs(12).then((res) => {
            if (!mounted) return;
            setTxs(res);
            setLoading(false);
        });
        return () => {
            mounted = false;
        };
    }, []);

    // placeholder: websocket / event source hookup (internal only)
    useEffect(() => {
        // Example:
        // const ws = new WebSocket(`wss://.../ws/account/demo`);
        // ws.onmessage = (m) => setTxs(t => [newTx, ...t]);
        return () => {
            // ws?.close();
        };
    }, []);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        return txs.filter((t) => {
            if (filter === "pending" && t.status !== "pending") return false;
            if (filter === "in" && t.amount >= 0) return false;
            if (filter === "out" && t.amount <= 0) return false;
            if (!q) return true;
            return (t.memo ?? "").toLowerCase().includes(q) || (t.id ?? "").toLowerCase().includes(q) || (t.to ?? "").toLowerCase().includes(q);
        });
    }, [txs, search, filter]);

    const handleSend = (tx: TxLocal) => {
        setTxs((s) => [tx, ...s]);
        // demo: mark confirmed later
        setTimeout(() => {
            setTxs((s) => s.map((x) => (x.id === tx.id ? { ...x, status: "confirmed" } : x)));
        }, 2200);
    };

    const loadMoreExternal = async () => {
        const more = await fakeFetchTxs(6);
        setTxs((s) => [...s, ...more]);
        return more;
    };

    // local demo receive address
    const demoReceiveAddr = `demo-local-addr`;

    return (
        <div>
            {/* Full-width header with NavBar */}
            <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#0b0b0d]/60 backdrop-blur-md">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-8">
                    <div className="flex-1 px-6">{/* center area reserved for layout */}</div>

                    <div>
                        <NavBar />
                    </div>
                </div>
            </header>

            {/* Panel content */}
            <section className="max-w-6xl mx-auto rounded-2xl p-6 mt-6 bg-gradient-to-b from-[#111111] to-[#0f0f10] border border-[rgba(255,255,255,0.04)]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-semibold">Transactions</h3>
                        <div className="text-sm text-[#9AA6A9]">Send, receive and inspect recent activity</div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowReceive((s) => !s)}
                            className="px-3 py-2 rounded-md border border-[rgba(255,255,255,0.04)] text-sm"
                        >
                            Receive
                        </button>

                        <button
                            onClick={() => setShowSend(true)}
                            className="px-4 py-2 rounded-md bg-gradient-to-r from-[#00D6C1] to-[#009bcf] text-[#042524] font-semibold"
                        >
                            Quick send
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                    <div className="md:col-span-2">
                        <div className="flex items-center gap-2">
                            <input
                                placeholder="Search memo, id or address"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 rounded-md bg-[#0b0b0b] border border-[rgba(255,255,255,0.03)] px-3 py-2"
                            />
                            <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="rounded-md bg-[#0b0b0b] border border-[rgba(255,255,255,0.03)] px-3 py-2 text-sm">
                                <option value="all">All</option>
                                <option value="in">Incoming</option>
                                <option value="out">Outgoing</option>
                                <option value="pending">Pending</option>
                            </select>
                        </div>

                        <div className="mt-3">
                            {loading ? (
                                <div className="text-sm text-[#9AA6A9]">Loading…</div>
                            ) : (
                                <TxList initial={visible} onLoadMore={loadMoreExternal} />
                            )}
                        </div>
                    </div>

                    <aside className="md:col-span-1 space-y-3">
                        <div className="rounded-lg p-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.01),transparent)] border border-[rgba(255,255,255,0.04)]">
                            <div className="text-sm text-[#BFC7CA]">Balance</div>
                            <div className="mt-2 text-lg font-mono">{txs.length ? txs.reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}</div>
                            <div className="mt-3">
                                <button className="w-full px-3 py-2 rounded-md bg-[rgba(255,255,255,0.03)]">Export CSV</button>
                            </div>
                        </div>

                        {showReceive && <ReceivePanel addr={demoReceiveAddr} />}

                        <div className="rounded-lg p-3 bg-[linear-gradient(180deg,rgba(255,255,255,0.01),transparent)] border border-[rgba(255,255,255,0.04)]">
                            <div className="text-sm text-[#BFC7CA]">Network</div>
                            <div className="mt-2 text-sm text-[#9AA6A9]">Local demo network</div>
                        </div>
                    </aside>
                </div>

                {showSend && <SendModal onClose={() => setShowSend(false)} onSent={handleSend} defaultTo={""} />}
            </section>
        </div>
    );
}
