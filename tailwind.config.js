/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-sc)",
          "var(--font-noto-sans-tc)",
          "var(--font-noto-sans-jp)",
          "var(--font-noto-sans-kr)",
          "var(--font-noto-naskh-ar)",
          "var(--font-noto-sans-dv)",
          "var(--font-noto-sans-he)",
          "var(--font-noto-sans-bn)",
          "var(--font-noto-sans-ta)",
          "var(--font-noto-sans-th)",
          "var(--font-noto-sans-gk)",
        ],
      },
      letterSpacing: {
        tighter: "-0.05em",
        tight: "-0.05em",
        normal: "0",
        wide: "0.025em",
        wider: "0.05em",
        widest: "0.1em",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
