"use client";

import { useCallback, useEffect, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import Typewriter from "@/components/common/Typewriter";
import { talkToScriptAgent } from "@/lib/agentApi";
import { scriptStore, setScriptDataValue, setShouldAnimateScriptData } from "@/data/scriptData";
import LoadingClapBoard from "../common/ClapboardLoading3D";
import { DuoButton, DuoTextArea } from "@/components/duolingo";

export default function Character2Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);

  const initialTopMessage =
    "Describe the story or scene you want. I’ll generate a cinematic script for you.";
  const [scriptData, setTopScript] = useState<string>(scriptStore.scriptData || initialTopMessage);
  const [prompt, setPrompt] = useState<string>("");
  const [typeKey, setTypeKey] = useState<number>(0);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(scriptStore.shouldAnimateScriptData);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleTypewriterDone = useCallback(() => {
    setShouldAnimate(false);
  }, []);

  // Ensure future auto-animation is disabled once an animation cycle starts
  useEffect(() => {
    if (shouldAnimate) {
      setShouldAnimateScriptData(false);
    }
  }, [shouldAnimate]);

  async function handleSubmit() {
    if (!prompt.trim() || isLoading) return;
    const userPrompt = prompt.trim();
    setPrompt("");
    setTopScript("");
    setTypeKey((k) => k + 1);
    setIsLoading(true);
    const result = await talkToScriptAgent(userPrompt);
    setTopScript(result);
    setScriptDataValue(result);
    useSceneStore.getState().setCompleted("character_2", true);
    setIsLoading(false);
    setShouldAnimate(true);
    setShouldAnimateScriptData(true);
    setTypeKey((k) => k + 1);
  }

  const examplePrompts = [
    "A heartfelt reunion between siblings at a train station",
    "A daring midnight heist on Venetian canals",
    "Two rivals forced to cooperate during a storm at sea",
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-10 flex min-h-screen w-[70%] items-stretch bg-gradient-to-b from-[#0e1b1d] to-[#102629] border-l border-white/10 shadow-[-12px_0_24px_rgba(0,0,0,0.25)]">
      <div className="flex w-full h-full flex-col gap-6 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-feather text-[24px] text-white/95">Script Generator</h2>
          </div>
          <DuoButton variant="secondary" size="md" onClick={reset}>
            Close
          </DuoButton>
        </div>
        {/* Output Panel */}
        <div className="h-[60vh] rounded-[28px] border border-white/10 bg-white/5 p-4 overflow-hidden">
          {isLoading ? (
            <div className="h-full w-full overflow-hidden rounded-[18px] border border-white/8 bg-white/[0.03] p-0 mb-18">
              <LoadingClapBoard/>
            </div>
          ) : shouldAnimate ? (
            <div className="h-full w-full overflow-auto rounded-[18px] border border-white/8 bg-white/[0.03] p-3 text-white/95">
              <Typewriter
                key={typeKey}
                text={scriptData}
                speed={2}
                startDelay={0}
                cursor={true}
                onDone={handleTypewriterDone}
                className="h-full w-full resize-none rounded-[12px] bg-transparent p-1 text-[16px] leading-relaxed text-white/95"
              />
            </div>
          ) : scriptData ? (
            <div className="h-full w-full overflow-auto">
              <DuoTextArea
                value={scriptData}
                onChange={(e) => {
                  setTopScript(e.target.value);
                  setScriptDataValue(e.target.value);
                }}
                containerClassName="h-full"
                className="h-full resize-none"
                placeholder="Your generated script will appear here."
              />
            </div>
          ) : null}
        </div>

        {/* Prompt Composer (bottom) */}
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4">
            <DuoTextArea
              label="Describe your scene"
              placeholder="e.g. A quiet café conversation that slowly turns into a mystery..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((ex) => (
                <button
                  key={ex}
                  className="font-feather rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[14px] text-white/70 hover:border-white/22 hover:text-white/90"
                  onClick={() => setPrompt(ex)}
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end">
              <DuoButton size="md" onClick={handleSubmit} disabled={!prompt.trim() || isLoading}>
                Generate script
              </DuoButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
