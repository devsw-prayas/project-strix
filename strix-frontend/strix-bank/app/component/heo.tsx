export default function Hero() {
    return (
        <section className="w-full pt-20 pb-24">
            <div className="max-w-4xl mx-auto px-6 text-center">
                <h1 className="text-6xl font-orbitron font-semibold leading-tight bg-gradient-to-r from-[#d1d5db] via-white to-[#00D6C1]
                    bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,214,193,0.35)]">
                    Verifiable Transactions,<br /> Reinvented.
                </h1>

                <p className="mt-6 text-lg text-[#d1d5db]/90 max-w-2xl mx-auto leading-relaxed font-orbitron font-bold">
                    A next-generation high performance DAG based banking and transaction platform with decentralized
                    and system bound security for care-free banking.
                </p>

                <div className="mt-10 flex justify-center gap-6">
                    <a
                        href="#about"
                        className="px-6 py-2 rounded-md border border-white/20 text-white text-sm hover:border-cyan hover:shadow-[0_0_12px_rgba(0,214,193,0.6)] transition"
                    >
                        Learn more
                    </a>
                    <a
                        href="/dashboard"
                        className="px-6 py-2 rounded-md bg-gradient-to-r from-[#00D6C1] to-[#009bcf] text-[#062226] font-semibold shadow-[0_0_14px_rgba(0,214,193,0.7)] hover:shadow-[0_0_18px_rgba(0,214,193,1)] transition"
                    >
                        Try demo
                    </a>
                </div>
            </div>
        </section>
    );
}
