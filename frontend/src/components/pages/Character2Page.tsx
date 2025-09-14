"use client";

import { useCallback, useEffect, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import Typewriter from "@/components/common/Typewriter";
import { scriptStore, setScriptDataValue, setShouldAnimateScriptData } from "@/data/scriptData";
import LoadingClapBoard from "../common/ClapboardLoading3D";
import { DuoButton, DuoTextArea } from "@/components/duolingo";
import { useScript, useProject, useProjectData } from "@/hooks/useBackendIntegration";

export default function Character2Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);
  const project = useProject();
  const script = useScript();
  const projectData = useProjectData();

  const initialTopMessage =
    "Welcome to Script Enhancement! Enter a base plot and I'll enhance it with better pacing, character development, and cinematic structure.";

  const [scriptData, setTopScript] = useState<string>(scriptStore.scriptData || initialTopMessage);
  const [prompt, setPrompt] = useState<string>("");
  const [typeKey, setTypeKey] = useState<number>(0);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(scriptStore.shouldAnimateScriptData);
  const [targetScenes] = useState<number>(3);
  const [enhancementResult, setEnhancementResult] = useState<{
    enhanced_plot: string;
    enhanced_summary: string;
  } | null>(null);

  const handleTypewriterDone = useCallback(() => {
    setShouldAnimate(false);
  }, []);

  // Ensure future auto-animation is disabled once an animation cycle starts
  useEffect(() => {
    if (shouldAnimate) {
      setShouldAnimateScriptData(false);
    }
  }, [shouldAnimate]);

  // Load existing enhanced script if available
  useEffect(() => {
    if (script.enhancedPlot) {
      setTopScript(script.enhancedPlot);
      setScriptDataValue(script.enhancedPlot);
    }
  }, [script.enhancedPlot]);

  async function handleSubmit() {
    if (!prompt.trim() || script.isEnhancing) return;

    const basePlot = prompt.trim();
    setPrompt("");
    setTopScript("Enhancing your script...");
    setTypeKey((k) => k + 1);

    try {
      // Get current characters for context
      const characters = projectData.characters.map(char => ({
        name: char.metadata.name,
        description: char.metadata.description,
        role: char.metadata.role,
        age: char.metadata.age,
        personality: char.metadata.personality,
        backstory: char.metadata.backstory
      }));

      const result = await script.enhance(basePlot, characters);

      if (result.success) {
        setEnhancementResult({
          enhanced_plot: result.enhanced_plot,
          enhanced_summary: result.enhanced_summary
        });

        setTopScript(result.enhanced_plot);
        setScriptDataValue(result.enhanced_plot);
        useSceneStore.getState().setCompleted("character_2", true);

        setShouldAnimate(true);
        setShouldAnimateScriptData(true);
        setTypeKey((k) => k + 1);
      } else {
        setTopScript("Sorry, there was an error enhancing your script. Please try again.");
      }
    } catch (error) {
      console.error('Script enhancement error:', error);
      setTopScript("Connection error. Please check your connection and try again.");
    }
  }

  const examplePrompts = [
    "A space exploration mission discovers an ancient alien artifact that changes everything",
    "Two rival journalists must work together to uncover a conspiracy in 1940s Hollywood",
    "A young programmer discovers their AI creation has developed consciousness and wants freedom",
  ];

  const isLoading = script.isEnhancing;
  const hasProjectWithCharacters = project?.currentProject && projectData.characters.length > 0;

  return (
    <div className="fixed inset-y-0 right-0 z-10 flex min-h-screen w-[70%] items-stretch bg-gradient-to-b from-[#0e1b1d] to-[#102629] border-l border-white/10 shadow-[-12px_0_24px_rgba(0,0,0,0.25)]">
      <div className="flex w-full h-full flex-col gap-6 px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-feather text-[24px] text-white/95">Script Enhancement</h2>
            {project?.currentProject && (
              <div className="text-sm text-white/60 mt-1">
                Project: {project.currentProject.id.substring(0, 8)}... | Characters: {projectData.characters.length}
              </div>
            )}
          </div>
          <DuoButton variant="secondary" size="md" onClick={reset}>
            Close
          </DuoButton>
        </div>

        {/* Status/Info Panel */}
        {!hasProjectWithCharacters && (
          <div className="rounded-[16px] border border-orange-500/20 bg-orange-900/10 p-4 text-orange-400">
            <div className="text-sm">
              💡 <strong>Tip:</strong> Complete the Director conversation first to get characters, then come back here to enhance your script with character context!
            </div>
          </div>
        )}

        {/* Enhancement Result Summary */}
        {enhancementResult && (
          <div className="rounded-[16px] border border-green-500/20 bg-green-900/10 p-4">
            <h3 className="text-green-400 font-medium mb-2">✅ Enhancement Complete</h3>
            <div className="text-white/80 text-sm">
              <strong>Summary:</strong> {enhancementResult.enhanced_summary}
            </div>
            <div className="text-white/60 text-xs mt-2">
              Your enhanced script is ready for scene generation! This will create 3 scenes: Scene 1 (3 frames = 24s), Scene 2 (2 frames = 16s), Scene 3 (3 frames = 24s). Total: 64 seconds.
            </div>
          </div>
        )}

        {/* Output Panel */}
        <div className="h-[50vh] rounded-[28px] border border-white/10 bg-white/5 p-4 overflow-hidden">
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
                placeholder="Your enhanced script will appear here."
              />
            </div>
          ) : null}
        </div>

        {/* Prompt Composer (bottom) */}
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4">
            <DuoTextArea
              label="Base Plot for Enhancement"
              placeholder="Enter your basic plot outline here. I'll enhance it with better pacing, character development, and cinematic structure..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={3}
            />

            {/* Target Scenes Info */}
            <div className="flex items-center justify-between text-sm text-white/60">
              <div>Target Scenes: {targetScenes} (3-2-3 frame structure)</div>
              {hasProjectWithCharacters && (
                <div>✓ {projectData.characters.length} characters will be used for context</div>
              )}
            </div>

            {/* Suggestions */}
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((ex) => (
                <button
                  key={ex}
                  className="font-feather rounded-full border border-white/12 bg-white/5 px-3 py-1 text-[12px] text-white/70 hover:border-white/22 hover:text-white/90"
                  onClick={() => setPrompt(ex)}
                  disabled={isLoading}
                >
                  {ex}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end">
              <DuoButton
                size="md"
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading}
              >
                {isLoading ? 'Enhancing Script...' : 'Enhance Script'}
              </DuoButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}