// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { roundRobinForward } from "@/app/api/auth/proxy"; // adjust path if needed

export async function POST(req: Request) {
    try {
        const text = await req.text();
        if (!text) {
            return NextResponse.json({ error: "empty body" }, { status: 400 });
        }

        let obj: any;
        try {
            obj = JSON.parse(text);
        } catch {
            return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
        }

        // Validate basic envelope shape
        if (!obj.payload || !obj.attest) {
            return NextResponse.json({ error: "missing payload or attest" }, { status: 400 });
        }

        // Build the merged object that your auth node expects at /api/auth/sign
        // We place attestation fields at top-level and keep original payload fields as payload.
        const merged: any = {
            // From client payload (account info / event info)
            ...obj.payload,

            // include the password & client signature so the node can handle auth
            password: obj.password ?? null,
            client_signature: obj.signature ?? null,

            // Flatten attestation fields expected by node
            parent_pub_b64: obj.attest.parent_pub_b64,
            child_sig_b64: obj.attest.child_sig_b64,
            attestation: obj.attest.attestation,
            attestation_hash: obj.attest.attestation_hash,
            node_id: obj.attest.node_id,

            // ensure required DAG fields exist for the node handler
            event_type: obj.payload.event_type ?? "sign",
            event_payload: obj.payload.event_payload ?? { emailOrUsername: obj.payload.emailOrUsername },
            parents: obj.payload.parents ?? [],
            node_signature: obj.payload.node_signature ?? "",
        };

        // Forward to one of the auth nodes (path must match node's endpoint)
        const resp = await roundRobinForward("/api/auth/sign", JSON.stringify(merged));
        return resp;
    } catch (err: any) {
        return NextResponse.json({ error: err?.message ?? "server error" }, { status: 500 });
    }
}
