import colors from "tailwindcss/colors.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{css,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ── Core semantic tokens ──────────────────────────────────
        ink:    "#0F172A",   // primary text  (Tailwind slate-900)
        muted:  "#64748B",   // secondary text (Tailwind slate-500)
        subtle: "#94A3B8",   // placeholder / disabled (Tailwind slate-400)
        surface: "#F8FAFC",  // page background (Tailwind slate-50)
        border: "#E2E8F0",   // card / divider borders (Tailwind slate-200)

        // ── Legacy aliases – kept so existing pages don't break ──
        mist:     "#eef2ef",
        steel:    "#2e5b6e",
        teal:     "#0f766e",
        amber:    "#b7791f",
        slate:    {
          ...colors.slate,
          DEFAULT: "#556270",
        },
        redoxide: "#b54f3a",
        moss:     "#4d7a58",
        navy:     "#0d1b2a",
        cloud:    "#f6f3ec",
        brass:    "#c08a2e",
        fog:      "#d9e1dc",

        // ── Module accent colors ──────────────────────────────────
        // Each module has: DEFAULT (action/icon), light (bg tint), dim (border)
        // Usage: bg-grn text-grn border-grn-dim  bg-grn-light
        "grn": {
          DEFAULT: "#2563EB",   // blue-600
          light:   "#EFF6FF",   // blue-50
          dim:     "#BFDBFE",   // blue-200
          dark:    "#1D4ED8",   // blue-700 (hover)
        },
        "inv": {
          DEFAULT: "#059669",   // emerald-600
          light:   "#ECFDF5",   // emerald-50
          dim:     "#A7F3D0",   // emerald-200
          dark:    "#047857",   // emerald-700
        },
        "qc": {
          DEFAULT: "#0D9488",   // teal-600
          light:   "#F0FDFA",   // teal-50
          dim:     "#99F6E4",   // teal-200
          dark:    "#0F766E",   // teal-700
        },
        "wms": {
          DEFAULT: "#4F46E5",   // indigo-600
          light:   "#EEF2FF",   // indigo-50
          dim:     "#C7D2FE",   // indigo-200
          dark:    "#4338CA",   // indigo-700
        },
        "vq": {
          DEFAULT: "#EA580C",   // orange-600
          light:   "#FFF7ED",   // orange-50
          dim:     "#FED7AA",   // orange-200
          dark:    "#C2410C",   // orange-700
        },
        "qms": {
          DEFAULT: "#D97706",   // amber-600
          light:   "#FFFBEB",   // amber-50
          dim:     "#FDE68A",   // amber-200
          dark:    "#B45309",   // amber-700
        },
        "lims": {
          DEFAULT: "#7C3AED",   // violet-600
          light:   "#F5F3FF",   // violet-50
          dim:     "#DDD6FE",   // violet-200
          dark:    "#6D28D9",   // violet-700
        },
        "hrms": {
          DEFAULT: "#E11D48",   // rose-600
          light:   "#FFF1F2",   // rose-50
          dim:     "#FECDD3",   // rose-200
          dark:    "#BE123C",   // rose-700
        },
        "admin": {
          DEFAULT: "#475569",   // slate-600
          light:   "#F1F5F9",   // slate-100
          dim:     "#CBD5E1",   // slate-300
          dark:    "#334155",   // slate-700
        },
      },

      boxShadow: {
        panel: "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.06)",
        float: "0 8px 32px rgba(15, 23, 42, 0.16), 0 2px 8px rgba(15, 23, 42, 0.08)",
        card:  "0 0 0 1px rgba(15, 23, 42, 0.06), 0 2px 8px rgba(15, 23, 42, 0.06)",
        bar:   "4px 0 24px rgba(15, 23, 42, 0.08)",
      },

      fontFamily: {
        sans:    ["Avenir Next", "Segoe UI", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
        mono:    ["JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas", "monospace"],
      },

      backgroundImage: {
        grid: "linear-gradient(rgba(15, 23, 42, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 23, 42, 0.04) 1px, transparent 1px)",
        "gradient-subtle": "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)",
      },

      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },

      transitionDuration: {
        "200": "200ms",
      },
    },
  },
  plugins: [],
};
