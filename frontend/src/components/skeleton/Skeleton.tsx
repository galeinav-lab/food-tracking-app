import { type JSX, type ReactNode } from "react";
import "./Skeleton.css";

interface SkeletonProps {
    shape?: "line" | "block" | "circle";
    // Any CSS length; the shape's default is used when omitted.
    width?: string;
    height?: string;
    className?: string;
}

// One placeholder shape. Size it like the content it stands in for, so the
// layout doesn't jump when the real data arrives.
function Skeleton({ shape = "line", width, height, className }: SkeletonProps): JSX.Element {
    const cls = className ? `skel skel-${shape} ${className}` : `skel skel-${shape}`;
    return <span className={cls} style={{ width, height }} aria-hidden="true" />;
}

interface SkeletonGroupProps {
    // What is loading, for screen readers ("Loading meals…").
    label?: string;
    className?: string;
    children: ReactNode;
}

// Wraps a set of shapes and announces the loading state once (role="status").
export function SkeletonGroup({ label = "Loading", className, children }: SkeletonGroupProps): JSX.Element {
    const cls = className ? `skel-group ${className}` : "skel-group";
    return (
        <div className={cls} role="status">
            <span className="skel-label">{label}…</span>
            {children}
        </div>
    );
}

export default Skeleton;
