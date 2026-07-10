import type { Config } from "tailwindcss";

// 核心色改为 CSS 变量驱动（通道值），暗色模式只需在 .dark 下换变量，大部分组件零改动。
// brand.400~900 保持 hex（品牌主色在明暗下一致），仅浅色档 50~300 与中性色随主题变化。
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "rgb(var(--brand-50) / <alpha-value>)",
          100: "rgb(var(--brand-100) / <alpha-value>)",
          200: "rgb(var(--brand-200) / <alpha-value>)",
          300: "rgb(var(--brand-300) / <alpha-value>)",
          400: "#6f9fff",
          500: "#3d7fff",
          600: "#2f6ceb",
          700: "#2557c4",
          800: "#20479c",
          900: "#1d3a7a"
        },
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          secondary: "rgb(var(--ink-secondary) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)"
        },
        line: "rgb(var(--line) / <alpha-value>)",
        page: "rgb(var(--page) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
        chip: "var(--shadow-chip)"
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
