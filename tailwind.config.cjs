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
          bg: "#0B1118",
          sidebar: "#0A1017",
          surface: "#111923",
          card: "#171F2B",
          hover: "#222C38",
          cardHover: "#222C38",
          border: "#2A3543",
          borderLight: "#3A4757",
          cyan: "#D7A93A",
          blue: "#7D9BB8",
          purple: "#9B8AB9",
          teal: "#B99132",
          text: "#EEF1F2",
          secondaryText: "#C4CBD2",
          muted: "#8D9AA6",
          success: "#69B99C",
          safe: "#69B99C",
          info: "#82A5C5",
          warning: "#D7A93A",
          medium: "#D7A93A",
          high: "#D48757",
          critical: "#D76E6E",
          low: "#70B7A8",
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
