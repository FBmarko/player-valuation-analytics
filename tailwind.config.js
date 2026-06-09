/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        neon: "0 0 35px rgba(34, 197, 94, 0.35)",
        gold: "0 0 35px rgba(245, 158, 11, 0.25)",
      },
    },
  },
  plugins: [],
};
