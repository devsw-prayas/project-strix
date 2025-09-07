// utils/crypto.ts
import nacl from "tweetnacl";
import { decodeUTF8, encodeBase64 } from "tweetnacl-util";

// Simple deterministic JSON (keys sorted)
export function canonicalize(obj: Record<string, any>): string {
    const keys = Object.keys(obj).sort();
    const ordered: Record<string, any> = {};
    for (const k of keys) ordered[k] = obj[k];
    return JSON.stringify(ordered);
}

export function signPayload(payload: Record<string, any>, secretKeyB64: string) {
    const canonical = canonicalize(payload);
    const secretKey = Buffer.from(secretKeyB64, "base64");
    const sig = nacl.sign.detached(decodeUTF8(canonical), secretKey);
    return encodeBase64(sig);
}
