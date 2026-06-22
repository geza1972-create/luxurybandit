import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Minimal typography: the UI leans heavily on font-black / font-bold.
      // Remap the weight scale lighter so the whole site reads minimal,
      // while keeping enough contrast for hierarchy. Tune to taste.
      fontWeight: {
        thin: "200",
        extralight: "200",
        light: "300",
        normal: "400",
        medium: "450",
        semibold: "550",
        bold: "600",
        extrabold: "650",
        black: "700",
      },
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
