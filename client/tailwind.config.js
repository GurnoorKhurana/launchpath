/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // New Modern Geometric tokens (Variant B)
        bg: "#FAFAFA",
        surface: "#FFFFFF",
        ink: "#0A0A0A",
        body: "#525252",
        hairline: "#E5E5E5",
        accent: {
          DEFAULT: "#4F46E5",
          soft: "#EEF2FF",
        },

        // Legacy shadcn-style tokens — kept to avoid breaking existing utilities.
        border: "#E5E5E5",
        background: "#FAFAFA",
        foreground: "#0A0A0A",
        primary: {
          DEFAULT: "#4F46E5",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F5F5F5",
          foreground: "#A3A3A3",
        },
      },
      fontFamily: {
        sans: ["Inter Tight", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
    },
  },
  plugins: [],
};
