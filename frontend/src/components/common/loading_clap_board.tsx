"use client";

import { useEffect, useRef } from "react";

export default function LoadingClapBoard() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    let dir = 1;
    let pos = 0;
    const id = setInterval(() => {
      pos += dir * 6;
      if (pos >= 80) dir = -1;
      if (pos <= 0) dir = 1;
      el.style.transform = `translateX(${pos}%) rotate(${dir > 0 ? 5 : -5}deg)`;
    }, 60);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: 160, height: 64, border: "2px solid #111", borderRadius: 8, overflow: "hidden", background: "#fff" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 16, background: "#111", display: "flex" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ flex: 1, background: i % 2 === 0 ? "#fff" : "#111" }} />
          ))}
        </div>
        <div ref={barRef} style={{ position: "absolute", top: 20, left: 8, width: 56, height: 28, background: "#111", borderRadius: 4, transformOrigin: "left center", transition: "transform 120ms linear" }} />
        <div style={{ position: "absolute", bottom: 8, left: 8, right: 8, height: 8, background: "#eee", borderRadius: 4 }}>
          <div className="animate-pulse" style={{ width: "40%", height: "100%", background: "#888", borderRadius: 4 }} />
        </div>
      </div>
      <div style={{ fontSize: 14, color: "#333" }}>Generating script...</div>
    </div>
  );
}


