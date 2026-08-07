/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#fffaf0",
        cocoa: "#4d3636",
        rose: "#d97d91",
        blush: "#f5c6ce",
        peach: "#f6c7a5",
        lavender: "#c8b8dc",
        sage: "#b7c8ae",
        butter: "#f5df91",
      },
      boxShadow: {
        paper: "0 18px 50px rgba(91, 58, 58, 0.14)",
        lift: "0 14px 28px rgba(91, 58, 58, 0.18)",
      },
    },
  },
  plugins: [],
};
