// JS mirror of the CSS color tokens in index.css — for SVG/recharts which need
// literal color strings (CSS var() doesn't resolve in those contexts). Keep in
// sync with :root in index.css (single conceptual source of truth).
// v3 "Dark Lime" — see design-system/nutritrack/MASTER.md.
export const colors = {
    accent: "#A3E635",
    macroProtein: "#FB7185",
    macroCarbs: "#FBBF24",
    macroFat: "#2DD4BF",
    macroFiber: "#C084FC",
    water: "#38BDF8",
    track: "rgba(214,255,170,0.08)",
    border: "rgba(214,255,170,0.10)",
    textDim: "#86937A",
    surface2: "#212B1A",
    // Chart theming (recharts needs literal colors; CSS var() doesn't resolve there).
    text: "#F2F5EC",
    muted: "#B4BFA4",
    grid: "rgba(214,255,170,0.08)",
    success: "#4ADE80",
    warning: "#F59E0B",
} as const;

// Shared recharts theming so axes/tooltips read on the dark theme.
export const chartTheme = {
    axisTick: { fontSize: 11, fill: colors.muted },
    axisLine: { stroke: colors.border },
    tooltipContentStyle: {
        background: "#212B1A",
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        color: colors.text,
        boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
    },
    tooltipLabelStyle: { color: colors.muted },
    tooltipItemStyle: { color: colors.text },
} as const;
