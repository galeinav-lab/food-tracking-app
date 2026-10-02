// JS mirror of the CSS color tokens in index.css — for SVG/recharts which need
// literal color strings (CSS var() doesn't resolve in those contexts). Keep in
// sync with :root in index.css (single conceptual source of truth).
// v4 light theme — see design-system/nutritrack/MASTER.md.
export const colors = {
    // Lime as a STROKE on white (ring arcs): one step deeper than the --accent fill.
    accent: "#84CC16",
    // Lines that carry data (weight trend): deep olive, >= 3:1 on white.
    accentLine: "#4D7C0F",
    macroProtein: "#F43F5E",
    macroCarbs: "#F59E0B",
    macroFat: "#14B8A6",
    macroFiber: "#A855F7",
    water: "#0EA5E9",
    track: "rgba(17,18,20,0.07)",
    border: "rgba(17,18,20,0.08)",
    textDim: "#8B9099",
    surface2: "#F2F2F5",
    // Chart theming (recharts needs literal colors; CSS var() doesn't resolve there).
    text: "#111214",
    muted: "#575B63",
    grid: "rgba(17,18,20,0.07)",
    // Weekly bars (graphics, >= 3:1 on white): deficit day / surplus day.
    barDeficit: "#16A34A",
    barSurplus: "#D97706",
    // Faint washes for chart interaction/empty states.
    chartCursor: "rgba(17,18,20,0.04)", // hovered column
    barTrack: "rgba(17,18,20,0.04)", // empty column behind a bar (day not logged)
    tooltipBg: "#FFFFFF",
    tooltipShadow: "0 8px 24px rgba(17,18,20,0.12)",
} as const;

// recharts animates in JS, so the CSS reduced-motion kill-switch can't reach it.
const reduceMotion =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Shared recharts theming so axes/tooltips match the light theme.
export const chartTheme = {
    // Mirrors --dur-sweep / --ease-out (index.css): charts sweep in like the rings.
    animation: {
        isAnimationActive: !reduceMotion,
        animationDuration: 550,
        animationEasing: "ease-out",
    },
    axisTick: { fontSize: 11, fill: colors.muted },
    axisLine: { stroke: colors.border },
    tooltipContentStyle: {
        background: colors.tooltipBg,
        border: `1px solid ${colors.border}`,
        borderRadius: 14, // --r-control
        color: colors.text,
        boxShadow: colors.tooltipShadow,
    },
    tooltipLabelStyle: { color: colors.muted },
    tooltipItemStyle: { color: colors.text },
} as const;
