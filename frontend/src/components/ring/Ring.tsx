import { type JSX, type ReactNode, useEffect, useState } from "react";
import { colors } from "../../styles/colors";
import "./Ring.css";

interface RingProps {
    pct: number; // 0..; caps visually at 100
    size: number;
    stroke: number;
    color: string;
    trackColor?: string;
    children?: ReactNode;
    label?: string;
}

// Presentational SVG progress ring. No data fetching — pure props.
// The arc SWEEPS to its value (mounts at 0, then transitions via CSS) instead of
// snapping; prop changes also animate. Reduced-motion users get the final value
// instantly (the global reduced-motion rule kills the transition).
function Ring({ pct, size, stroke, color, trackColor, children, label }: RingProps): JSX.Element {
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(pct, 100));

    // Visual-only: render one frame at 0, then set the real value so the CSS
    // transition on stroke-dashoffset performs the sweep.
    const [drawPct, setDrawPct] = useState(0);
    useEffect(() => {
        const id = requestAnimationFrame(() => setDrawPct(clamped));
        return () => cancelAnimationFrame(id);
    }, [clamped]);

    const offset = circumference * (1 - drawPct / 100);
    const center = size / 2;

    return (
        <div className="uiring" style={{ width: size, height: size }} role="img" aria-label={label}>
            <svg width={size} height={size} className="uiring-svg">
                <circle
                    cx={center}
                    cy={center}
                    r={r}
                    strokeWidth={stroke}
                    stroke={trackColor ?? colors.track}
                    fill="none"
                />
                <circle
                    className="uiring-arc"
                    cx={center}
                    cy={center}
                    r={r}
                    strokeWidth={stroke}
                    stroke={color}
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${center} ${center})`}
                />
            </svg>
            <div className="uiring-center">{children}</div>
        </div>
    );
}

export default Ring;
