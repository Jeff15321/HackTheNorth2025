"use client";

import { useState, useEffect } from "react";
import { DuoButton, DuoTextArea } from "@/components/duolingo";
import { useSceneStore } from "@/store/useSceneStore";
import { useDirector, useProject } from "@/hooks/useBackendIntegration";
import { getCurrentProject } from "@/data/projectData";

type DirectorResult = {
  response: string;
  scene_descriptions: string[];
  characters: string[];
};

export default function Character4Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);
  const project = useProject();
  const director = useDirector();

  const [input, setInput] = useState("");
  const [result, setResult] = useState<DirectorResult | null>({
    response: "Welcome! I'm your AI director. Let's create something amazing together. Tell me about your film idea and I'll help develop the story, characters, and scenes.",
    scene_descriptions: ["Start a conversation to develop scenes..."],
    characters: ["Characters will appear as we develop the story..."],
  });

  // Initialize project if needed
  useEffect(() => {
    const initializeProject = async () => {
      const currentProject = getCurrentProject();
      if (!currentProject) {
        try {
          await project.createProject();
        } catch (error) {
          console.error('Failed to create project:', error);
        }
      }
    };

    initializeProject();
  }, [project.createProject]);

  // Update result when director conversation changes
  useEffect(() => {
    if (director.messages.length > 0) {
      const lastMessage = director.messages[director.messages.length - 1];
      if (lastMessage.type === 'director') {
        const plotPoints = director.status.plot.length > 0
          ? director.status.plot.map((plot, idx) => `Scene ${idx + 1}: ${plot}`)
          : ["Scenes will appear as we develop the story..."];

        const characterList = director.status.characters.length > 0
          ? director.status.characters.map(char => `${char.name}: ${char.description}`)
          : ["Characters will appear as we develop the story..."];

        setResult({
          response: lastMessage.content,
          scene_descriptions: plotPoints,
          characters: characterList
        });
      }
    }
  }, [director.messages, director.status]);

  async function handleSend() {
    const prompt = input.trim();
    if (!prompt || director.isLoading) return;

    setInput("");

    try {
      const response = await director.sendMessage(prompt);

      // Transform the response to match our UI format
      const plotPoints = response.plot_points.length > 0
        ? response.plot_points.map((plot, idx) => `Scene ${idx + 1}: ${plot}`)
        : ["Scenes will appear as we develop the story..."];

      const characterList = response.characters.length > 0
        ? response.characters.map(char => `${char.name}: ${char.description}`)
        : ["Characters will appear as we develop the story..."];

      setResult({
        response: response.response,
        scene_descriptions: plotPoints,
        characters: characterList
      });

      // Mark as completed if the conversation is complete
      if (response.is_complete) {
        try {
          useSceneStore.getState().setCompleted("character_4", true);
          // Auto-generate characters when conversation is complete
          await director.generateCharacters();
        } catch (error) {
          console.error('Failed to complete workflow:', error);
        }
      }
    } catch (error) {
      console.error('Failed to send message to director:', error);
      setResult({
        response: "Sorry, I'm having trouble connecting right now. Please try again.",
        scene_descriptions: ["Connection error - please retry"],
        characters: ["Connection error - please retry"]
      });
    }
  }

  const containerClass = "fixed inset-y-0 right-0 z-10 flex min-h-screen w-[70%] items-stretch bg-gradient-to-b from-[#0e1b1d] to-[#102629] border-l border-white/10 shadow-[-12px_0_24px_rgba(0,0,0,0.25)]";

  return (
    <div className={containerClass}>
      <div className="flex h-full w-full flex-col gap-6 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-feather text-[24px] text-white/95">Director</h2>
            {project?.currentProject && (
              <div className="text-sm text-white/60 mt-1">
                Project: {project.currentProject.id.substring(0, 8)}...
              </div>
            )}
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
                {director.isLoading ? "Thinking…" : result?.response}
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
          <div className="flex h-full flex-col gap-3 overflow-hidden">
            <div className="flex items-end gap-3">
              <DuoTextArea
                label="Director note"
                placeholder="e.g. I want to create a sci-fi thriller about space exploration, or tell me about your characters and plot ideas..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                rows={2}
                containerClassName="flex-1"
                className="h-[72px] min-h-[72px] max-h-[72px] resize-none overflow-auto"
              />
              <DuoButton size="md" onClick={handleSend} disabled={!input.trim() || director.isLoading}>
                {director.isLoading ? 'Sending...' : 'Submit'}
              </DuoButton>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        {director.status.isComplete && (
          <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-3 text-green-400 text-sm">
            ✓ Conversation complete! Characters are being generated automatically.
          </div>
        )}
      </div>
    </div>
  );
}