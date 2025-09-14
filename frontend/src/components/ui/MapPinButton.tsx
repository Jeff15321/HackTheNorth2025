"use client";

import React from "react";

type MapPinButtonProps = {
  value: number | string;
  onClick?: () => void;
  size?: number; // base pixels
  sizeFactor?: number; // multiplier applied to the whole component
  color?: string; // primary color (stroke + text)
  className?: string;
  title?: string;
};

export default function MapPinButton({ value, onClick, size = 48, sizeFactor = 1, color = "#EF4444", className, title }: MapPinButtonProps) {
  const px = Math.max(28, size) * Math.max(0.5, sizeFactor); // minimal sensible size & scaling
  const scale = px / 48; // relative to the design base of 48px
  const strokeW = 1 * scale;
  const innerStrokeW = 0.7 * scale;
  const fontSize = 5 * scale;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        "inline-flex items-center justify-center transition-transform duration-150 hover:scale-120 focus:outline-none",
        className || "",
      ].join(" ")}
      style={{ width: px, height: px, display: "inline-flex", alignItems: "center", justifyContent: "center" }}
    >
      <svg width={px} height={px} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Pin outline (transparent fill, red stroke) */}
        <path
          d="M12 2c-4 0-7 3-7 7 0 5.25 7 13 7 13s7-7.75 7-13c0-4-3-7-7-7z"
          fill="white"
          stroke={color}
          strokeWidth={strokeW}
        />
        {/* Inner circle */}
        <circle cx="12" cy="9.2" r="4.9" fill="#FFFFFF" stroke={color} strokeWidth={innerStrokeW} />
        {/* Number */}
        <text x="12" y="9" textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fontWeight="700" fill={color}>
          {String(value)}
        </text>
      </svg>
    </button>
  );
}


