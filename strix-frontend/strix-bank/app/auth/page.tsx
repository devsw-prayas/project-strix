import AuthPanel from "@/app/component/auth-panel";
import Link from "next/link";

export default function AuthPage() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#2b2b2b] via-[#1c1c1c] to-[#2b2b2b] [background-image:linear-gradient(180deg,#2b2b2b_0%,#1c1c1c_50%,#2b2b2b_100%),radial-gradient(circle_at_30%_20%,rgba(0,214,193,0.06),transparent_60%)] bg-blend-overlay text-[#E5E7EB] antialiased">
            <div className="py-5"></div>
            <Link href="/landing"
                className="text-5xl  px-20 py-20 font-extrabold font-orbitron bg-gradient-to-r from-[#d1d5db] via-white to-[#00D6C1] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(0,214,193,0.35)] hover:opacity-90 transition"
            >StriX</Link>
            <AuthPanel />
        </div>
    );
}
