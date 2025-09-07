// hooks/useRegister.ts
import { signPayload } from "@/lib/utils/crypto";
import { makeEphemeralAttestation } from "@/lib/tpm/tpm";

/**
 * applyRegister - builds payload, adds ephemeral attestation, forwards to Next API endpoint
 *
 * payload: {
 *   username: string;
 *   email: string;
 *   password: string;
 *   user_pub?: string; // optional, client’s pub key if you have one
 *   node_id?: string;  // optional node id
 * }
 */
export async function applyRegister(payload: {
    username: string;
    email: string;
    password: string;
    user_pub?: string;
    node_id?: string;
}, secretKeyB64: string) {
    // 1) core client payload
    const fullPayload = {
        ...payload,
        event_type: "register", // important: this marks it as a registration
        ts: new Date().toISOString(),
        nonce: Math.random().toString(36).slice(2),
        event_payload: {
            username: payload.username,
            email: payload.email,
        },
    };

    // 2) sign client payload (if you require local signing)
    const signature = signPayload(fullPayload, secretKeyB64);

    // 3) ephemeral attestation
    const att = await makeEphemeralAttestation({ nodeId: payload.node_id });

    // 4) envelope for Next.js API
    const envelope = {
        payload: fullPayload,
        signature,
        password: payload.password, // pass raw or hashed depending on your backend logic
        attest: {
            parent_pub_b64: att.parent_pub_b64,
            child_sig_b64: att.child_sig_b64,
            attestation: att.attestation,
            attestation_hash: att.attestation_hash,
            node_id: att.nodeId,
        },
    };

    // 5) POST to Next route (it will forward to /api/auth/sign at one of the nodes)
    const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Registration failed" }));
        throw new Error(err.error ?? "Registration failed");
    }
    return await res.json();
}
