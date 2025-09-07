export const MOCK_TXS = [
    { id: "tx-01", from: "node-01", to: "node-03", amount: "12.50 X", status: "confirmed", tsEpoch: Date.now() - 2 * 60_000 },
    { id: "tx-02", from: "node-02", to: "node-01", amount: "3.2 X", status: "verified_local", tsEpoch: Date.now() - 70_000 },
    { id: "tx-03", from: "node-04", to: "node-02", amount: "50 X", status: "failed", tsEpoch: Date.now() - 5 * 60_000 },
    { id: "tx-04", from: "node-01", to: "node-05", amount: "7.25 X", status: "confirmed", tsEpoch: Date.now() - 30_000 },
    { id: "tx-05", from: "node-03", to: "node-02", amount: "1.00 X", status: "pending", tsEpoch: Date.now() - 10_000 },
];