"use client";

import { useState } from "react";
import { DuoButton, DuoTextArea } from "@/components/duolingo";
import { useSceneStore } from "@/store/useSceneStore";

type DirectorResult = {
  response: string;
  scene_descriptions: string[];
  characters: string[];
};

// Dummy API returning structured JSON
async function dummyDirectorApi(input: string): Promise<DirectorResult> {
  await new Promise((r) => setTimeout(r, 800));
  return {
    response: `Great direction. We'll emphasize stakes and pacing. You said: "${input}"`,
    scene_descriptions: [
      "EXT. CITY ROOFTOP - NIGHT: Hero scans the skyline as thunder rolls.",
      "INT. SUBWAY CAR - NIGHT: A quiet confession between unlikely allies.",
      "EXT. MARKET ALLEY - DAWN: A chase through weaving crowds and fabric stalls.",
    ],
    characters: [
      "Avery: resilient but secretly doubtful",
      "Mara: quick-witted fixer with a hidden agenda",
      "Kellan: idealist whose plans rarely survive reality",
    ],
  };
}

export default function Character4Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<DirectorResult | null>({
    response: "Give the director a note and I’ll break it into scenes and characters.",
    scene_descriptions: ["No scenes yet."],
    characters: ["No characters yet."],
  });

  async function handleSend() {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setInput("");
    setSending(true);
    const r = await dummyDirectorApi(prompt);
    setResult(r);
    setSending(false);
    try { useSceneStore.getState().setCompleted("character_4", true); } catch {}
  }

  const containerClass = "fixed inset-y-0 right-0 z-10 flex min-h-screen w-[80%] items-stretch bg-gradient-to-b from-[#0e1b1d] to-[#102629] border-l border-white/10 shadow-[-12px_0_24px_rgba(0,0,0,0.25)]";

  return (
    <div className={containerClass}>
      <div className="flex h-full w-full flex-col gap-6 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-feather text-[24px] text-white/95">Director</h2>
          </div>
          <DuoButton variant="secondary" size="md" onClick={reset}>Close</DuoButton>
        </div>

        {/* Three-column top section */}
        <div className="flex-[3] min-h-[50vh] overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-4">
          <div className="grid h-full grid-cols-12 gap-3">
            {/* Left: Response (50%) */}
            <div className="col-span-6 flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03] p-3 text-white/95">
              <div className="mb-2 text-white/80">Response</div>
              <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap leading-relaxed">
                {sending ? "Thinking…" : result?.response}
              </div>
            </div>

            {/* Middle: Scenes (25%) */}
            <div className="col-span-3 flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03] p-3 text-white/95">
              <div className="mb-2 text-white/80">Scenes</div>
              <ul className="min-h-0 flex-1 overflow-auto space-y-2">
                {(result?.scene_descriptions || []).map((s, idx) => (
                  <li key={idx} className="rounded-[12px] border border-white/10 bg-white/5 p-2 text-[14px] leading-relaxed">{s}</li>
                ))}
              </ul>
            </div>

            {/* Right: Characters (25%) */}
            <div className="col-span-3 flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03] p-3 text-white/95">
              <div className="mb-2 text-white/80">Characters</div>
              <ul className="min-h-0 flex-1 overflow-auto space-y-2">
                {(result?.characters || []).map((c, idx) => (
                  <li key={idx} className="rounded-[12px] border border-white/10 bg-white/5 p-2 text-[14px] leading-relaxed">{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Composer */}
        <div className="flex-[1] min-h-[18vh] rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex h-full flex-col gap-4 overflow-hidden">
            <DuoTextArea
              label="Director note"
              placeholder="e.g. Increase tension in act two, emphasize rivalry, add a quieter beat…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              containerClassName="flex-1"
              className="h-full min-h-[120px] resize-none"
            />
            <div className="mt-2 flex items-center justify-end">
              <DuoButton size="md" onClick={handleSend} disabled={!input.trim() || sending}>
                Generate
              </DuoButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
