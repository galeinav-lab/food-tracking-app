import { type JSX, type ReactNode } from "react";
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
function Ring({ pct, size, stroke, color, trackColor, children, label }: RingProps): JSX.Element {
    const r = (size - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const clamped = Math.max(0, Math.min(pct, 100));
    const offset = circumference * (1 - clamped / 100);
    const center = size / 2;

    return (
        <div className="uiring" style={{ width: size, height: size }} role="img" aria-label={label}>
            <svg width={size} height={size} className="uiring-svg">
                <circle
                    cx={center}
                    cy={center}
                    r={r}
                    strokeWidth={stroke}
                    stroke={trackColor ?? "rgba(255,255,255,0.08)"}
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
