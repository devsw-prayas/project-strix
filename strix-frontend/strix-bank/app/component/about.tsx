export default function About() {
    return (
        <section id="about" className="w-full py-20">
            <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="md:col-span-2">
                    <h2 className="text-5xl font-bold text-white drop-shadow-[0_0_8px_rgba(250,87,101,0.4)] font-orbitron font-semibold">
                        What is StriX
                    </h2>
                    <p className="mt-6 text-[#E5E7EB]/90 leading-relaxed">
                        StriX is the BlockDAG authentication subsystem that secures how nodes and transactions are identified, verified, and locked into the DAG.
                        Its purpose is to make sure that only valid, authenticated transactions from recognized nodes are allowed into the global DAG.
                    </p>

                    <ul className="mt-8 space-y-4 text-[#D1D5DB]">
                        <li className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[#FA5765] shadow-[0_0_6px_rgba(250,87,101,0.6)]" />
                            High Performance DAG-based transaction and authenticator
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[#FA5765] shadow-[0_0_6px_rgba(250,87,101,0.6)]" />
                            Decentralized storage
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-[#FA5765] shadow-[0_0_6px_rgba(250,87,101,0.6)]" />
                            Cryptographic + Hardware locked security
                        </li>
                    </ul>
                </div>

                <aside className="bg-[#2E2E2E]/80 rounded-xl p-6 border border-white/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.08)]">
                    <h3 className="text-sm font-semibold text-white/90 tracking-wide">
                        Quick stats
                    </h3>
                    <dl className="mt-6 space-y-3 text-sm text-[#D1D5DB]">
                        <div className="flex justify-between">
                            <dt>Nodes</dt>
                            <dd className="font-semibold text-white">14</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt>Recent tx</dt>
                            <dd className="font-semibold text-white">28</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt>Avg latency</dt>
                            <dd className="font-semibold text-white">120ms</dd>
                        </div>
                    </dl>
                </aside>
            </div>
        </section>
    );
}
