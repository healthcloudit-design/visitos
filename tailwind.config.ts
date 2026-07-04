import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff", 100: "#d9edff", 500: "#2377c8", 600: "#1a63a8", 700: "#154f86", 900: "#0e3457"
        }
      }
    }
  },
  plugins: []
};
export default config;
