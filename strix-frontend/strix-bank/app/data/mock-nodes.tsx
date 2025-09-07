export const MOCK_NODES = [
    { id: "node-01", name: "Validator-A", pubKey: "PUBKEY_A", lastHeartbeatEpoch: Date.now() - 5_000 },
    { id: "node-02", name: "Validator-B", pubKey: "PUBKEY_B", lastHeartbeatEpoch: Date.now() - 12_000 },
    { id: "node-03", name: "Relay-01", pubKey: "PUBKEY_C", lastHeartbeatEpoch: Date.now() - 34_000 },
    { id: "node-04", name: "Validator-C", pubKey: "PUBKEY_D", lastHeartbeatEpoch: Date.now() - 3 * 60_000 },
    { id: "node-05", name: "Observer-01", pubKey: "PUBKEY_E", lastHeartbeatEpoch: Date.now() - 70_000 },
];