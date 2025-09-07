// tailwind.config.js
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx}",   // App Router
        "./components/**/*.{js,ts,jsx,tsx}",
        "./pages/**/*.{js,ts,jsx,tsx}", // in case Pages Router
    ],
    theme: {
        extend: {
            fontFamily: {
                orbitron: ["var(--font-orbitron)", "sans-serif"],
            },
        },
    },
    plugins: [],
};
