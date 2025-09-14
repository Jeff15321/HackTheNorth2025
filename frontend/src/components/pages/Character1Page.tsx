"use client";

import { useEffect, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";

type Entry = { _id?: string; text: string; createdAt?: string };

export default function Character1Page() {

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
    // Temporary: mark this page as completed on open until API is wired
    // In the future, move this to run only after a successful API call.
    useSceneStore.getState().setCompleted("character_1", true);
    load();
  }, []);

  return (
    <div
      className="font-game"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "28rem",
        background: "var(--game-soft-white)",
        borderRight: "1px solid var(--game-light-gray)",
        boxShadow: "8px 0 24px rgba(0,0,0,0.1)",
        padding: 20,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        borderRadius: "0 16px 16px 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 className="font-game-bold" style={{ fontSize: 24, color: "var(--game-charcoal)" }}>CHARACTER NOTES</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-var(--game-charcoal) hover:bg-var(--game-orange) hover:text-var(--game-soft-white)"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <Input
          className="font-game"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a character note..."
          style={{
            flex: 1,
            height: 48,
            fontSize: 16,
            border: "2px solid var(--game-light-gray)",
            borderRadius: 12,
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
          }}
        />
        <Button
          className="font-game"
          onClick={add}
          disabled={loading || !text.trim()}
          style={{
            height: 48,
            padding: "0 20px",
            background: "var(--game-orange)",
            color: "var(--game-soft-white)",
            border: "2px solid var(--game-orange)",
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add
        </Button>
      </div>
      
      {error && (
        <div 
          className="font-game"
          style={{ 
            color: "var(--game-error)", 
            marginBottom: 12, 
            padding: 12, 
            background: "var(--game-cream)", 
            borderRadius: 8,
            border: "1px solid var(--game-error)"
          }}
        >
          {error}
        </div>
      )}
      
      <div style={{ flex: 1, overflow: "auto" }}>
        {loading ? (
          <div className="font-game" style={{ textAlign: "center", color: "var(--game-dark-gray)", padding: 20 }}>
            Loading...
          </div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((i) => (
              <li 
                key={i._id?.toString?.() || Math.random()} 
                className="font-game"
                style={{ 
                  border: "2px solid var(--game-light-gray)", 
                  padding: 16, 
                  borderRadius: 12, 
                  background: "var(--game-cream)", 
                  color: "var(--game-charcoal)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  lineHeight: 1.5
                }}
              >
                {i.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}


