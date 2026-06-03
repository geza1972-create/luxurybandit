import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#161616",
        panel: "#f6f4ef",
        mint: "#b9f5d8",
        coral: "#ff7e67",
        cobalt: "#2457d6"
      },
      boxShadow: {
        soft: "0 14px 35px rgba(22, 22, 22, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
