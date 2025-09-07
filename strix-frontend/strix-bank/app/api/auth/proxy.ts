// lib/roundRobinForward.ts  (or wherever your function lives)
import { NextResponse } from "next/server";

// lib/roundRobinForward.ts
export const NODES = [
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
    "http://127.0.0.1:8083",
];

let rrIndex = 0;
const TIMEOUT_MS = 15000; // 15s


async function forwardToNode(node: string, path: string, body: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        console.log(`[DEBUG] trying node ${node}${path}`);
        const res = await fetch(`${node}${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body,
            signal: controller.signal,
        });

        const text = await res.text();
        let parsed: any;
        try {
            parsed = JSON.parse(text);
        } catch {
            parsed = { raw: text };
        }

        console.log(`[DEBUG] node ${node} responded status=${res.status} ok=${res.ok}`);
        // return both status and body
        return { ok: res.ok, status: res.status, body: parsed, node };
    } catch (err: any) {
        console.warn(`[DEBUG] node ${node} forward error:`, err?.message ?? err);
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

export async function roundRobinForward(path: string, body: string): Promise<NextResponse> {
    const tried: string[] = [];
    for (let i = 0; i < NODES.length; i++) {
        const idx = (rrIndex + i) % NODES.length;
        const node = NODES[idx];
        tried.push(node);

        try {
            const result = await forwardToNode(node, path, body);
            // if node returned success (200-range) — return immediately
            if (result.ok) {
                rrIndex = (idx + 1) % NODES.length;
                return NextResponse.json(result.body, { status: result.status });
            } else {
                // Log non-OK body as warning and try next node
                console.warn(`[DEBUG] node ${node} returned non-ok status=${result.status} body=`, result.body);
            }
        } catch (err) {
            // node unreachable/timed out; continue to next
            console.warn(`[DEBUG] node ${node} unreachable:`, String(err?.message ?? err));
        }
    }

    console.error("[DEBUG] all nodes tried and failed:", tried);
    return NextResponse.json({ error: "All auth backends unavailable", tried }, { status: 503 });
}
