// lib/attest.ts
import nacl from "tweetnacl";
import * as naclUtil from "tweetnacl-util";

const u8ToB64 = (u: Uint8Array) => naclUtil.encodeBase64(u);
const utf8ToU8 = (s: string) => new Uint8Array(naclUtil.decodeUTF8(s));

async function sha256Hex(u8: Uint8Array): Promise<string> {
    const subtle = (globalThis.crypto?.subtle ?? (globalThis as any).crypto?.webcrypto?.subtle);
    const buf = await subtle.digest("SHA-256", u8.buffer);
    const h = new Uint8Array(buf);
    return Array.from(h).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a one-shot ephemeral attestation suitable for demo/test.
 * Returns fields expected by your auth node.
 */
export async function makeEphemeralAttestation(opts?: { nodeId?: string }) {
    const nodeId = opts?.nodeId ?? `node-ephemeral-${Date.now()}`;

    // parent and child keypairs
    const parentKP = nacl.sign.keyPair();
    const childKP = nacl.sign.keyPair();

    const now = Math.floor(Date.now() / 1000);
    const attPayload = {
        child_pub_b64: u8ToB64(new Uint8Array(childKP.publicKey)),
        created_at_unix: now,
        policy: "demo-policy",
        counter: 0,
    };

    const payloadJson = JSON.stringify(attPayload);
    const payloadBytes = utf8ToU8(payloadJson);

    // parent signs the attestation payload
    const attSig = nacl.sign.detached(payloadBytes, new Uint8Array(parentKP.secretKey));

    // child signs heartbeat msg "heartbeat:<nodeId>"
    const hb = utf8ToU8("heartbeat:" + nodeId);
    const childSig = nacl.sign.detached(hb, new Uint8Array(childKP.secretKey));

    const attestation = {
        child_pub_b64: attPayload.child_pub_b64,
        created_at_unix: attPayload.created_at_unix,
        policy: attPayload.policy,
        counter: attPayload.counter,
        sig_b64: u8ToB64(new Uint8Array(attSig)),
        signed_payload_b64: u8ToB64(payloadBytes),
    };

    const attHash = await sha256Hex(utf8ToU8(JSON.stringify(attestation)));

    return {
        nodeId,
        parent_pub_b64: u8ToB64(new Uint8Array(parentKP.publicKey)),
        child_sig_b64: u8ToB64(new Uint8Array(childSig)),
        attestation,
        attestation_hash: attHash,
    };
}
