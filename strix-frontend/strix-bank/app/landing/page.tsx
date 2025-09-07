// app/landing/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/hokk-use-auth";
import NavBar from "@/app/component/navbar";
import Faq from "@/app/component/faq";
import About from "@/app/component/about";
import Hero from "@/app/component/heo";
import Footer from "@/app/component/footer";

export default function LandingPage() {
    const { user, loading, refresh } = useAuth();
    const router = useRouter();
    useEffect(() => {
        // restore from localStorage on mount
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // once loaded, if user exists -> redirect to dashboard
        if (!loading && user) {
            router.replace("/dashboard");
        }
    }, [loading, user, router]);

    if (loading) {
        // optional: show nothing or a tiny loader while we check localStorage
        return null;
    }

    return (
        <div className="min-h-screen max-wdas-full bg-[#1e1e1e] text-[#E5E7EB] antialiased">
            <NavBar />
            <main className="pt-16">
                <Hero />
                <About />
                <Faq />
            </main>
            <Footer />
        </div>
    );
}
