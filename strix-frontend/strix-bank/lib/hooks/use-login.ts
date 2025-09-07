// hooks/useSign.ts
import { signPayload } from "@/lib/utils/crypto";
import { makeEphemeralAttestation } from "@/lib/tpm/tpm";

/**
 * applyLogin - builds payload, adds ephemeral attestation, forwards to Next API endpoint
 *
 * payload: {
 *   emailOrUsername: string;
 *   password: string;
 *   user_pub: string;   // optional, if you use local key-signing
 *   node_id?: string;   // optional - if provided, attestation will use this nodeId
 * }
 *
 * secretKeyB64: base64 of client's signing key used by signPayload
 */
export async function applyLogin(payload: {
    emailOrUsername: string;
    password: string;
    user_pub?: string;
    node_id?: string;
}, secretKeyB64: string) {
    // 1) core client payload the app uses/signs
    const fullPayload = {
        ...payload,
        event_type: "sign",
        ts: new Date().toISOString(),
        nonce: Math.random().toString(36).slice(2),
    };

    // 2) client-side signature (if you do this)
    const signature = signPayload(fullPayload, secretKeyB64);

    // 3) ephemeral attestation
    const att = await makeEphemeralAttestation({ nodeId: payload.node_id });

    // 4) envelope to send to Next.js backend; we'll include both the payload + attest details
    const envelope = {
        payload: fullPayload,
        signature,
        password: payload.password, // server will handle hashing/verification as configured
        attest: {
            parent_pub_b64: att.parent_pub_b64,
            child_sig_b64: att.child_sig_b64,
            attestation: att.attestation,
            attestation_hash: att.attestation_hash,
            node_id: att.nodeId,
        },
    };

    // 5) POST to Next route (this route will forward to one of your auth nodes)
    const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Sign-in failed" }));
        throw new Error(err.error ?? "Sign-in failed");
    }
    return await res.json();
}
