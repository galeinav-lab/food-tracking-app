// JS mirror of the CSS color tokens in index.css — for SVG/recharts which need
// literal color strings (CSS var() doesn't resolve in those contexts). Keep in
// sync with :root in index.css (single conceptual source of truth).
export const colors = {
    accent: "#3B82F6",
    macroProtein: "#F87171",
    macroCarbs: "#FBBF24",
    macroFat: "#34D399",
    water: "#38BDF8",
    track: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.09)",
    textDim: "#64748B",
    surface2: "#1E2A40",
    // Chart theming (recharts needs literal colors; CSS var() doesn't resolve there).
    text: "#F1F5F9",
    muted: "#94A3B8",
    grid: "rgba(255,255,255,0.08)",
    success: "#34D399",
    warning: "#FBBF24",
} as const;

// Shared recharts theming so axes/tooltips read on the dark theme.
export const chartTheme = {
    axisTick: { fontSize: 11, fill: colors.muted },
    axisLine: { stroke: colors.border },
    tooltipContentStyle: {
        background: colors.surface2,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        color: colors.text,
    },
    tooltipLabelStyle: { color: colors.muted },
    tooltipItemStyle: { color: colors.text },
} as const;
