import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eaf1f2", 100: "#c9dbde", 200: "#a3c0c5", 500: "#1a5d70", 600: "#124a5a", 700: "#0d3b48", 800: "#0a2f3a", 900: "#061f27"
        },
        gold: {
          50: "#f7f1e4", 100: "#ece0c6", 400: "#cbb079", 500: "#bea06c", 600: "#a8894f", 700: "#8a6f3d"
        }
      }
    }
  },
  plugins: []
};
export default config;
