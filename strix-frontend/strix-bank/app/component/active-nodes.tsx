"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNodesStatus, NodeStatus as HookNodeStatus } from "@/app/hooks/hook-node-status"

type Node = {
    id: string;
    name: string;
    pubKey: string;
    lastHeartbeatEpoch: number; // epoch ms
};

function timeAgo(epochMs: number) {
    const s = Math.floor((Date.now() - epochMs) / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

function statusFromHeartbeat(epochMs: number) {
    const s = (Date.now() - epochMs) / 1000;
    if (s < 30) return "ok";
    if (s < 120) return "stale";
    return "offline";
}

const statusDot = (s: string) =>
    s === "ok"
        ? "bg-[#00D6C1] shadow-[0_0_8px_rgba(0,214,193,0.18)]"
        : s === "stale"
            ? "bg-yellow-400"
            : "bg-white/20";

function SkeletonRow() {
    return (
        <div className="flex items-center justify-between bg-[#141414] border border-white/6 rounded-xl p-3 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div>
                    <div className="h-4 w-36 bg-white/6 rounded" />
                    <div className="h-3 w-24 bg-white/4 rounded mt-2" />
                </div>
            </div>
            <div className="text-right">
                <div className="h-4 w-20 bg-white/6 rounded" />
                <div className="h-3 w-20 bg-white/4 rounded mt-2" />
            </div>
        </div>
    );
}

/**
 * ActiveNodesList
 *
 * - If `nodes` prop is provided: uses that static array (no hook).
 * - Otherwise: uses `useNodesStatus()` hook (polls /api/nodes/status) as the source of data.
 */
export default function ActiveNodesList({
                                            nodes: staticNodes,
                                            pollIntervalMs,
                                            showPubKeyByDefault = false,
                                        }: {
    nodes?: Node[]; // optional static list; if omitted, component uses useNodesStatus
    pollIntervalMs?: number; // forwarded to hook when using dynamic mode
    showPubKeyByDefault?: boolean;
}) {
    const shouldFetch = !staticNodes;
    // Hook usage when dynamic
    const hook = useNodesStatus(pollIntervalMs ? { intervalMs: pollIntervalMs } : undefined);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [showPubKey, setShowPubKey] = useState(showPubKeyByDefault);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const mountedRef = useRef(true);

    // derive nodes array from either static prop or hook data
    const nodes: Node[] = useMemo(() => {
        if (staticNodes) return staticNodes;
        // map HookNodeStatus -> Node
        return hook.nodes.map((n: HookNodeStatus) => {
            const lastHeartbeatEpoch = n.lastChecked ? new Date(n.lastChecked).getTime() : Date.now() - (n.latencyMs ?? 0);
            return {
                id: n.id,
                name: n.name ?? n.id,
                pubKey: (n as any).pubKey ?? "", // best-effort if API returns pubKey
                lastHeartbeatEpoch,
            };
        });
    }, [staticNodes, hook.nodes]);

    // keep local loading state from hook
    const loading = shouldFetch ? hook.loading : false;

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // copy helper
    async function copyPubKey(pubKey: string, id: string) {
        try {
            await navigator.clipboard.writeText(pubKey);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 1400);
        } catch {
            setCopiedId(null);
        }
    }

    // visible list (filter + status + sort)
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = nodes.map((n) => ({ ...n, status: statusFromHeartbeat(n.lastHeartbeatEpoch) }));
        const filtered = list.filter((n) => {
            if (!q) return true;
            return (
                n.id.toLowerCase().includes(q) ||
                (n.name && n.name.toLowerCase().includes(q)) ||
                (n.pubKey && n.pubKey.toLowerCase().includes(q))
            );
        });
        filtered.sort((a, b) => {
            const rank = (s: string) => (s === "ok" ? 0 : s === "stale" ? 1 : 2);
            const r = rank(a.status) - rank(b.status);
            if (r !== 0) return r;
            return b.lastHeartbeatEpoch - a.lastHeartbeatEpoch;
        });
        return filtered;
    }, [nodes, query]);

    const onlineCount = visible.filter((v) => statusFromHeartbeat(v.lastHeartbeatEpoch) === "ok").length;

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-semibold text-white">Active nodes</h3>
                    <div className="text-sm text-[#BFC7CA]">Showing {visible.length} — {onlineCount} online</div>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search id, name or pubKey"
                        className="px-3 py-2 rounded bg-[#0b0b0b] border border-[rgba(255,255,255,0.04)] text-sm"
                    />

                    <button
                        onClick={() => {
                            // manual refresh: if using hook, call its refresh; otherwise noop
                            if (shouldFetch) {
                                setError(null);
                                hook.refresh().catch((e: any) => {
                                    setError(String(e));
                                });
                            }
                        }}
                        className="px-3 py-2 rounded-md bg-[rgba(255,255,255,0.03)] text-sm"
                    >
                        Refresh
                    </button>

                    <button
                        onClick={() => setShowPubKey((s) => !s)}
                        className="px-3 py-2 rounded-md border border-[rgba(255,255,255,0.04)] text-sm"
                    >
                        {showPubKey ? "Hide keys" : "Show keys"}
                    </button>
                </div>
            </div>

            {error && <div className="text-xs text-rose-400 mb-3">{error}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}

                {!loading && visible.length === 0 && <div className="text-sm text-[#9AA6A9]">No nodes found.</div>}

                {!loading &&
                    visible.map((n) => {
                        const st = statusFromHeartbeat(n.lastHeartbeatEpoch);
                        return (
                            <div key={n.id} className="flex items-center justify-between bg-[#141414] border border-white/6 rounded-xl p-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${statusDot(st)}`} />
                                    <div>
                                        <div className="text-sm text-white font-medium">{n.name}</div>
                                        <div className="text-xs text-[#9AA6A9]">{timeAgo(n.lastHeartbeatEpoch)}</div>
                                        {showPubKey && (
                                            <div className="mt-2 text-xs font-mono text-[#C8CFD2] truncate max-w-[22rem]">
                                                {n.pubKey || <span className="text-[#7C7C7C]">— no key —</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="text-right flex flex-col items-end gap-2">
                                    <div className="text-xs text-[#D1D5DB]">ID</div>
                                    <div className="text-sm font-mono text-[#D1D5DB]">{n.id}</div>

                                    <div className="flex items-center gap-2 mt-2">
                                        {showPubKey && n.pubKey && (
                                            <button
                                                onClick={() => copyPubKey(n.pubKey, n.id)}
                                                className="px-2 py-1 rounded-md bg-[rgba(255,255,255,0.02)] text-xs"
                                            >
                                                {copiedId === n.id ? "Copied" : "Copy key"}
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                navigator.clipboard?.writeText(n.id).then(() => {
                                                    setCopiedId(n.id);
                                                    setTimeout(() => setCopiedId(null), 1200);
                                                });
                                            }}
                                            className="px-2 py-1 rounded-md border border-[rgba(255,255,255,0.04)] text-xs"
                                        >
                                            Copy ID
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
            </div>
        </section>
    );
}
