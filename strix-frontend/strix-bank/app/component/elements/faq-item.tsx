"use client";

import React, { useRef, useState } from "react";
import { Plus } from "lucide-react";

export type FaqItemProps = {
    question: string;
    answer: string;
    defaultOpen?: boolean;
};

export default function FaqItem({ question, answer, defaultOpen = false }: FaqItemProps) {
    const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
    const contentRef = useRef<HTMLDivElement | null>(null);

    return (
        <div className="w-full max-w-2xl mx-auto my-4">
            <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((s) => !s)}
                className="w-full flex items-center justify-between gap-4
                bg-[#181818] border border-[#ACACAC]/20 rounded-2xl px-10 py-20
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D6C1]/40">
                <h3 className="text-left text-base sm:text-lg font-bold text-white">{question}</h3>
                <span
                    aria-hidden
                    className={`inline-flex transition-transform duration-200 ${isOpen ? "rotate-45" : "rotate-0"}`}>
                    <Plus size={18} color="white" />
                </span>
            </button>
            <div
                ref={contentRef}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[800px] mt-3" : "max-h-0"}`}
                aria-hidden={!isOpen}
            >
                <div className="bg-[#1F1F1F] border border-[#ACACAC]/10 rounded-xl p-4 text-sm text-[#D1D5DB]">
                    <p className="leading-relaxed">{answer}</p>
                </div>
            </div>
        </div>
    );
}
