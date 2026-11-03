/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ibm: {
          dark: "#161616",
          darker: "#0d0d0d",
          gray: "#262626",
          lightGray: "#525252",
          blue: "#0f62fe",
          blueHover: "#0353e9",
          purple: "#8a3ffc",
          cyan: "#1192e8",
          teal: "#007d79"
        }
      }
    },
  },
  plugins: [],
}
