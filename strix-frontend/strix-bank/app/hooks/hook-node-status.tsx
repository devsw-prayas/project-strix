// hooks/useNodesStatus.ts
"use client";
import { useEffect, useRef, useState } from "react";

export type NodeStatus = {
    id: string;
    name?: string;
    ok: boolean;
    httpStatus?: number | null;
    latencyMs?: number | null;
    error?: string | null;
    lastChecked: string;
};

export function useNodesStatus(opts?: { intervalMs?: number }) {
    const intervalMs = opts?.intervalMs ?? 5000;
    const [nodes, setNodes] = useState<NodeStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const mounted = useRef(true);

    async function fetchStatus() {
        setLoading(true);
        try {
            const res = await fetch("/api/nodes/status");
            if (!res.ok) {
                setNodes([]);
                setLoading(false);
                return;
            }
            const data = await res.json();
            if (!mounted.current) return;
            setNodes(Array.isArray(data.nodes) ? data.nodes : []);
        } catch (err) {
            console.error("fetch /api/nodes/status", err);
            setNodes([]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        mounted.current = true;
        fetchStatus();
        const t = setInterval(fetchStatus, intervalMs);
        return () => {
            mounted.current = false;
            clearInterval(t);
        };
    }, [intervalMs]);

    return { nodes, loading, refresh: fetchStatus };
}
