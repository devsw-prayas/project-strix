import nacl from "tweetnacl";
import { encodeBase64 } from "tweetnacl-util";

const kp = nacl.sign.keyPair();

// Base64 encode
const pubKey = encodeBase64(kp.publicKey);
const secretKey = encodeBase64(kp.secretKey);

// Hardcode them (for demo only)
export const DEMO_USER_PUB = pubKey;
export const DEMO_SECRET_KEY_B64 = secretKey;
