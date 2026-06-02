import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#f6fbff",
          100: "#e5f4ff",
          200: "#c4e7ff",
          300: "#8bd3ff",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0b7bc2",
          700: "#0b5fa8",
          800: "#0b4f9c",
          900: "#0c2d57"
        }
      },
      boxShadow: {
        app: "0 24px 70px rgba(12, 45, 87, 0.10)",
        card: "0 18px 48px rgba(12, 45, 87, 0.07)",
        glow: "0 12px 32px rgba(14, 165, 233, 0.16)"
      },
      borderRadius: {
        app: "28px",
        panel: "22px"
      },
      animation: {
        "float-in": "float-in 520ms cubic-bezier(.2,.8,.2,1) both",
        "soft-pulse": "soft-pulse 2.6s ease-in-out infinite"
      },
      keyframes: {
        "float-in": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "soft-pulse": {
          "0%, 100%": { transform: "scale(1)", boxShadow: "0 0 32px rgba(56, 189, 248, 0.22)" },
          "50%": { transform: "scale(1.015)", boxShadow: "0 0 54px rgba(56, 189, 248, 0.42)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
