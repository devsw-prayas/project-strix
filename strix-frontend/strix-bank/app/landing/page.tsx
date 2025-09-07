import NavBar from "@/app/component/navbar";
import Faq from "@/app/component/faq";
import About from "@/app/component/about";
import Hero from "@/app/component/heo";
import Footer from "@/app/component/footer";

export default function LandingPage() {
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