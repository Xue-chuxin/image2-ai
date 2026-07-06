import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7ff",
          100: "#eaf1ff",
          200: "#d4e3ff",
          300: "#aac8ff",
          400: "#6f9fff",
          500: "#3d7fff",
          600: "#2f6ceb",
          700: "#2557c4",
          800: "#20479c",
          900: "#1d3a7a"
        },
        ink: {
          DEFAULT: "#1f2329",
          secondary: "#646a73",
          faint: "#8f959e"
        },
        line: "#e8ecf3",
        page: "#f4f6fb"
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(31, 41, 55, 0.06)",
        pop: "0 12px 40px rgba(31, 41, 55, 0.14)",
        chip: "0 4px 14px rgba(61, 127, 255, 0.28)"
      },
      borderRadius: {
        card: "16px"
      },
      animation: {
        "float-in": "float-in 480ms cubic-bezier(.2,.8,.2,1) both"
      },
      keyframes: {
        "float-in": {
          "0%": { opacity: "0", transform: "translateY(14px) scale(.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
