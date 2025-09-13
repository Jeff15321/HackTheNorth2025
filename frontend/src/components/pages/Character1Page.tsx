"use client";

import { useEffect, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { themeCharacter1, colors } from "@/styles/colors";

type Entry = { _id?: string; text: string; createdAt?: string };

export default function Character1Page() {
  const textColor = themeCharacter1.text;
  const borderColor = themeCharacter1.border;
  const buttonColor = themeCharacter1.button;
  const backgroundColor = themeCharacter1.background;

  const reset = useSceneStore((s) => s.resetSelectionAndCamera);
  const [items, setItems] = useState<Entry[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/character_1", { cache: "no-store" });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to fetch");
      setItems(json.items || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to fetch";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function add() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/character_1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Failed to add");
      setText("");
      await load();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to add";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "28rem",
        background: backgroundColor,
        borderRight: "1px solid rgba(0,0,0,0.08)",
        boxShadow: `8px 0 24px ${colors.shadow}`,
        padding: 16,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, color: textColor }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>character_1</h2>
        <button onClick={reset} style={{ border: `1px solid ${colors.borderLight}`, padding: "6px 10px", borderRadius: 6, background: colors.white, color: borderColor }}>
          Close
        </button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add an entry"
          style={{ flex: 1, border: `1px solid ${colors.borderLight}`, borderRadius: 6, padding: "6px 10px" }}
        />
        <button onClick={add} disabled={loading} style={{ border: `1px solid ${borderColor}`, padding: "6px 10px", borderRadius: 6, background: buttonColor, color: colors.white }}>
          Add
        </button>
      </div>
      {error && <p style={{ color: colors.error, marginBottom: 8 }}>{error}</p>}
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map((i) => (
              <li key={i._id?.toString?.() || Math.random()} style={{ border: `1px solid ${colors.cardBorder}`, padding: 8, borderRadius: 6, background: colors.white, color: borderColor }}>
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


