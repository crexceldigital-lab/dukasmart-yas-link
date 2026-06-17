import type { CSSProperties } from "react";

export function ProBadge({ style }: { style?: CSSProperties }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "#F5A623",
        color: "#fff",
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: "0.08em",
        padding: "2px 6px",
        borderRadius: 999,
        lineHeight: 1,
        textTransform: "uppercase",
        ...style,
      }}
    >
      PRO
    </span>
  );
}