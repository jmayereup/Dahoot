import daisyui from "daisyui"

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        schoolPastel: {
          "primary": "#FFB7B2",     // Soft pink/coral
          "secondary": "#BFFCC6",   // Mint green
          "accent": "#FFDAC1",      // Pastel peach
          "neutral": "#5D6B82",     // Slate gray
          "base-100": "#FFFDF9",    // Warm cream background
          "info": "#C7CEEA",        // Pastel blue
          "success": "#BFFCC6",     // Pastel green
          "warning": "#FFECB3",     // Pastel yellow
          "error": "#FFB7B2",       // Pastel red/pink
        },
      },
      "cupcake",
      "pastel",
    ],
  },
}
