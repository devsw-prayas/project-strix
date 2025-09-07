import TransactionsToday from "@/app/component/transactions-today";
import ActiveNodesList from "@/app/component/active-nodes";
import {MOCK_TXS} from "@/app/data/mock-tx";
import ProfileCard from "@/app/component/profile-card";
import RecentTransactions from "@/app/component/recent-transactions";
import NavBar from "@/app/component/dashboard-nav";
import RequireAuth from "@/app/component/elements/require-auth";

export const metadata = { title: "Dashboard - StriX" };

export default function DashboardPage() {
    return (
            <div className="min-h-screen bg-gradient-to-b from-[#3B3B3B] to-[#2E2E2E] text-[#E5E7EB] antialiased">
                <NavBar></NavBar>
                <div className=" max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-30">
                    <header className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-extrabold gradient-cyan-crimson">Dashboard</h1>
                            <p className="text-sm text-[#C0C7CA]">Overview · live nodes · recent tx</p>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <ActiveNodesList />
                            <RecentTransactions/>
                        </div>

                        <aside className="lg:col-span-1 space-y-4">
                            <ProfileCard user={{ name: "Demo User", email: "demo@strix", nodesOwned: 3 }} />
                            <TransactionsToday/>
                        </aside>
                    </div>
                </div>
            </div>
    );
}
