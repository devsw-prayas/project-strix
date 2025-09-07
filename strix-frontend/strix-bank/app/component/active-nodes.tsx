"use client";

import React from "react";

type Node = { id: string; name: string; pubKey: string; lastHeartbeatEpoch: number };

function timeAgo(epoch: number) {
    const s = Math.floor((Date.now() - epoch) / 1000);
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
}

function statusFromHeartbeat(epoch: number) {
    const s = (Date.now() - epoch) / 1000;
    if (s < 30) return "ok";
    if (s < 120) return "stale";
    return "offline";
}

const statusDot = (s: string) =>
    s === "ok" ? "bg-[#00D6C1] shadow-[0_0_8px_rgba(0,214,193,0.18)]" : s === "stale" ? "bg-yellow-400" : "bg-white/20";

export default function ActiveNodesList({ nodes }: { nodes: Node[] }) {
    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Active nodes</h3>
                <div className="text-sm text-[#BFC7CA]">Showing {nodes.length}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nodes.map((n) => {
                    const st = statusFromHeartbeat(n.lastHeartbeatEpoch);
                    return (
                        <div key={n.id} className="flex items-center justify-between bg-[#141414] border border-white/6 rounded-xl p-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${statusDot(st)}`} />
                                <div>
                                    <div className="text-sm text-white font-medium">{n.name}</div>
                                    <div className="text-xs text-[#9AA6A9]">{timeAgo(n.lastHeartbeatEpoch)}</div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-xs text-[#D1D5DB]">ID</div>
                                <div className="text-sm font-mono text-[#D1D5DB]">{n.id}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
