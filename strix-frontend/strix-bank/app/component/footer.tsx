export default function Footer() {
    return (
        <footer className="w-full border-t border-white/10 mt-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-sm text-[#D1D5DB]/80">
                    © {new Date().getFullYear()} StriX — Demo
                </div>
                <div className="flex items-center gap-5 text-sm">
                    <a
                        href="/docs"
                        className="hover:text-cyan transition drop-shadow-[0_0_6px_rgba(0,214,193,0.6)]"
                    >
                        Docs
                    </a>
                    <a
                        href="/admin"
                        className="hover:text-crimson transition drop-shadow-[0_0_6px_rgba(250,87,101,0.6)]"
                    >
                        Admin
                    </a>
                </div>
            </div>
        </footer>
    );
}
