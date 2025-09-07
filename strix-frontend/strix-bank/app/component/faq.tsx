"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";

type RawFaq = { question: string; answer: string; defaultOpen?: boolean };

const FAQ_ITEMS: RawFaq[] = [
    {
        question: "What is StriX?",
        answer:
            "StriX is a minimalist, demo-first banking platform built on top of a Directed Acyclic Graph (DAG)." +
            " It simulates cryptographic node identities, transactions signing, and heartbeat verification to show how next-gen" +
            " decentralized systems can function in a lightweight and transparent way.",
    },
    {
        question: "How is it safer?",
        answer:
            "Every message in StriX is cryptographically signed, which locks it to a specific node identity." +
            "Payloads and attestations are hashed and verified on receipt, making it nearly impossible to tamper " +
            "with data without being detected. Even though we use a demo TPM, the safety guarantees mimic real cryptographic hardware.",
    },
    {
        question: "How does it use DAG?",
        answer:
            "Unlike blockchains, StriX arranges transactions in a Directed Acyclic Graph. Each new transactions " +
            "links to previous ones, creating multiple branches of validation instead of a single chain. This gives " +
            "faster confirmations, better scalability, and a more flexible way to represent activity across the network.",
    },
    {
        question: "What is so special about decentralization?",
        answer:
            "Decentralization removes the need for a central authority to validate or control transactions. " +
            "In StriX, multiple nodes can validate and broadcast in parallel. This makes the system more resilient " +
            "to failures and attacks, while giving users stronger ownership of their transactions and identities.",
    },
    {
        question: "What cryptographic techniques does it use?",
        answer:
            "StriX uses public-key cryptography for digital signatures, binding each payload to its node identity." +
            " It also uses hashing to lock attestations and detect tampering. Together, signatures and hash commitments" +
            " provide the integrity, authenticity, and non-repudiation guarantees at the core of the system.",
    },
];

function FaqItem({
                     id,
                     question,
                     answer,
                     defaultOpen = false,
                 }: {
    id: string;
    question: string;
    answer: string;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState<boolean>(defaultOpen);
    const regionId = `faq-panel-${id}`;
    const btnId = `faq-btn-${id}`;

    return (
        <div className="w-full max-w-3xl mx-auto my-3">
            <button
                id={btnId}
                aria-controls={regionId}
                aria-expanded={isOpen}
                onClick={() => setIsOpen((s) => !s)}
                className="w-full flex items-center justify-between gap-4 bg-[#151515] border border-[#ACACAC]/10 rounded-2xl px-6 py-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00D6C1]/40"
            >
                <h3 className="text-left text-base sm:text-lg font-medium text-white">{question}</h3>

                <span
                    aria-hidden
                    className={`inline-flex transition-transform duration-200 ${isOpen ? "rotate-45" : "rotate-0"}`}
                >
          <Plus size={18} color="white" />
        </span>
            </button>

            <div
                id={regionId}
                role="region"
                aria-labelledby={btnId}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-[800px] mt-3" : "max-h-0"}`}
                aria-hidden={!isOpen}
            >
                <div className="bg-[#1A1A1A] border border-[#ACACAC]/8 rounded-xl p-4 text-sm text-[#D1D5DB]">
                    <p className="leading-relaxed whitespace-pre-wrap">{answer}</p>
                </div>
            </div>
        </div>
    );
}

export default function FaqSection() {
    return (
        <section className="w-full py-16">
            <div className="max-w-4xl mx-auto px-6">
                <h2 className="text-4xl sm:text-5xl font-bold text-white mb-10 font-orbitron">FAQ</h2>

                <div className="space-y-3">
                    {FAQ_ITEMS.map((it, i) => (
                        <FaqItem
                            key={it.question}
                            id={String(i)}
                            question={it.question}
                            answer={it.answer}
                            defaultOpen={!!it.defaultOpen}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
