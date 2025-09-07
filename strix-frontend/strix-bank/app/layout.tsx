// app/layout.tsx
import "./globals.css";
import React from "react";
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className={` bg-[#1c1c1c] text-white`}>
        {children}
        </body>
        </html>
    );
}
