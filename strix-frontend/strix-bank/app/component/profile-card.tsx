"use client";

import React from "react";

export default function ProfileCard({ user }: { user: { name: string; email?: string; nodesOwned: number; avatarUrl?: string } }) {
    return (
        <div className="bg-[#151515] border border-white/6 rounded-xl p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#00D6C1] to-[#009bcf] inline-flex items-center justify-center text-[#062226] font-bold">
                {user.name.split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase()}
            </div>
            <div className="flex-1">
                <div className="text-sm font-semibold text-white">{user.name}</div>
                <div className="text-xs text-[#9AA6A9]">{user.email ?? "demo@strix"}</div>
            </div>

            <div className="text-right">
                <div className="text-xs text-[#D1D5DB]">Nodes owned</div>
                <div className="text-sm font-semibold text-white">{user.nodesOwned}</div>
            </div>
        </div>
    );
}
