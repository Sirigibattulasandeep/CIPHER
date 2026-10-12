/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        sentrix: {
          bg: "#080D18", // Main background
          sidebar: "#0A1120", // Sidebar background
          surface: "#0D1422", // Secondary background
          card: "#121C2D", // Card background
          hover: "#18263A", // Hover background
          cardHover: "#18263A",
          border: "#26354B", // Enterprise border
          borderLight: "#334666",
          cyan: "#22D3EE", // Primary cyan
          blue: "#3B82F6", // Primary blue
          purple: "#818CF8", // Accent purple
          teal: "#22D3EE",
          text: "#F1F5F9", // Main text
          secondaryText: "#A7B4C8", // Secondary text
          muted: "#8190A5", // Muted text
          success: "#34D399", // Success / Safe
          safe: "#34D399",
          info: "#60A5FA", // Informational
          warning: "#FBBF24", // Warning
          medium: "#FBBF24",
          high: "#FB923C", // High risk
          critical: "#F87171", // Critical risk
          low: "#22D3EE",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px -5px rgba(34, 211, 238, 0.15)",
        "glow-sm": "0 0 12px -3px rgba(34, 211, 238, 0.2)",
        "glow-safe": "0 0 20px -5px rgba(52, 211, 153, 0.15)",
        "glow-critical": "0 0 20px -5px rgba(248, 113, 113, 0.2)",
      },
      keyframes: {
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        pulseSubtle: "pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        fadeIn: "fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 1.8s infinite",
      },
    },
  },
  plugins: [],
};
