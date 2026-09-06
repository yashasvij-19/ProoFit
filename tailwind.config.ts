import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f5f2",
          100: "#eceae4",
          200: "#d8d4c8",
          400: "#8a8478",
          500: "#6b665c",
          700: "#3d3a34",
          900: "#1c1b18",
        },
        accent: {
          DEFAULT: "#8b6b3d",
          muted: "#c4a574",
          faint: "#f3ead9",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-newsreader)", "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
