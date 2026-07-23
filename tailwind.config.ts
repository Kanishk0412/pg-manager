import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        rentok: {
          blue: "#0038FF",
          "blue-hover": "#1d4ed8",
          indigo: "#4f46e5",
          cyan: "#06b6d4",
          emerald: "#10b981",
          amber: "#f59e0b",
          rose: "#f43f5e",
          slate: "#0f172a",
          dark: "#070b14",
        },
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          500: "#16a34a",
          600: "#15803d",
          700: "#166534",
          primary: "#0038FF",
          hover: "#1d4ed8",
        },
      },
      boxShadow: {
        glow: "0 8px 30px rgba(0, 56, 255, 0.2)",
        "glow-emerald": "0 8px 30px rgba(16, 185, 129, 0.2)",
        "glow-amber": "0 8px 30px rgba(245, 158, 11, 0.2)",
      },
    },
  },
  plugins: [],
};
export default config;
