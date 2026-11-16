import type { Config } from "tailwindcss";

const config: Config = {
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
        countdown: ["var(--font-countdown)", "sans-serif"],
      },
      screens: {
        phone: "601px",
        tablet: "851px",
        desktop: "1151px",
        wide: "1450px",
      },
      keyframes: {
        "page-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "page-in": "page-in .45s ease-out both",
      },
  		colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        shell: "rgb(var(--shell) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        raised: "rgb(var(--raised) / <alpha-value>)",
        edge: "rgb(var(--edge) / <alpha-value>)",
        "glass-edge": "rgb(255 255 255 / .15)",
        control: "rgb(var(--control) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        quiet: "rgb(var(--quiet) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [],
};
export default config;
