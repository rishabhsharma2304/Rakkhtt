/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Crimson / rose brand palette (from design handoff)
        accent: { DEFAULT: "#DC2626", deep: "#9F1239" },
        ink: { DEFAULT: "#231A1F", 2: "#3A2C32", 3: "#4A3A40", 4: "#5A4A50" },
        muted: { DEFAULT: "#8A7A80", 2: "#9A8C92", 3: "#A79DA4", disabled: "#C8BCC1" },
        page: "#F4EEF0",
        card: "#FFFFFF",
        fill: { DEFAULT: "#FBF5F7", 2: "#F7F1F3", 3: "#FBF7F8" },
        line: { card: "#F0E6EA", chip: "#EBDFE3", table: "#F2E9EC", topbar: "#ECE0E4", drop: "#EFE4E8" },
        hovertint: "#FBEEF1",
        rowtint: "#FCF8F9",
        eventchip: "#FBE9EE",
        // component / chart palette
        comp: { prbc: "#DC2626", ffp: "#FB7185", wb: "#9F1239", plc: "#F59E0B" },
        // semantic
        success: { DEFAULT: "#15803D", bg: "#DCFCE7" },
        warning: { DEFAULT: "#B45309", alt: "#D97706", bg: "#FEF3C7" },
        info: { DEFAULT: "#1D4ED8", alt: "#2563EB", bg: "#DBEAFE" },
        neutralpill: { DEFAULT: "#8A7A80", bg: "#F1E9EC" },
        excel: "#15803D",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        display: ["'Bricolage Grotesque'", "'Plus Jakarta Sans'", "sans-serif"],
      },
      borderRadius: { chip: "9px", btn: "13px", card: "18px", card2: "20px" },
      boxShadow: {
        card: "0 1px 2px rgba(31,18,24,.04), 0 12px 30px rgba(136,19,55,.05)",
        banner: "0 14px 36px rgba(150,20,50,.22)",
        nav: "0 6px 20px rgba(124,19,48,.22)",
        dropnav: "0 22px 50px rgba(60,15,30,.20)",
        droptop: "0 18px 48px rgba(80,20,40,.16)",
        primary: "0 8px 22px rgba(220,38,38,.28)",
      },
      keyframes: {
        rakRise: { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        rakPulse: { "0%,100%": { opacity: ".5" }, "50%": { opacity: "1" } },
      },
      animation: { rakRise: "rakRise .14s ease", rakPulse: "rakPulse 1.6s ease-in-out infinite" },
      backgroundImage: {
        "nav-grad": "linear-gradient(95deg,#7C1330 0%,#9F1239 48%,#BE1240 100%)",
        "banner-grad": "linear-gradient(115deg,#7F1D2E 0%,#A4163A 52%,#C81E4A 100%)",
        "bar-home": "linear-gradient(180deg,#E11D48,#9F1239)",
        "bar-graph": "linear-gradient(180deg,#FB7185,#DC2626)",
        "bar-camp": "linear-gradient(180deg,#FB7185,#9F1239)",
        "drop-grad": "linear-gradient(135deg,#E11D48,#9F1239)",
      },
    },
  },
  plugins: [],
};
