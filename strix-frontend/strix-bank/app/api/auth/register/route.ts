// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { roundRobinForward } from "@/app/api/auth/proxy";

export async function POST(req: Request) {
    try {
        const text = await req.text();
        if (!text) {
            return NextResponse.json({ error: "empty body" }, { status: 400 });
        }
        const obj = JSON.parse(text);

        if (!obj.payload || !obj.attest) {
            return NextResponse.json({ error: "missing payload or attest" }, { status: 400 });
        }

        // flatten into the exact shape the node expects
        const merged: any = {
            ...obj.payload,
            password: obj.password ?? null,
            client_signature: obj.signature ?? null,
            parent_pub_b64: obj.attest.parent_pub_b64,
            child_sig_b64: obj.attest.child_sig_b64,
            attestation: obj.attest.attestation,
            attestation_hash: obj.attest.attestation_hash,
            node_id: obj.attest.node_id,
            event_type: obj.payload.event_type ?? "register",
            event_payload: obj.payload.event_payload ?? {
                username: obj.payload.username,
                email: obj.payload.email,
            },
            parents: obj.payload.parents ?? [],
            node_signature: obj.payload.node_signature ?? "",
        };

        // forward to an auth node
        return await roundRobinForward("/api/auth/sign", JSON.stringify(merged));
    } catch (err: any) {
        return NextResponse.json({ error: err?.message ?? "server error" }, { status: 500 });
    }
}
