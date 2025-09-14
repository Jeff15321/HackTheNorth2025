"use client";

import { useCallback, useEffect, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import Typewriter from "@/components/common/Typewriter";
import { setScriptDataValue, setShouldAnimateScriptData } from "@/data/scriptData";
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

  const [scriptData, setTopScript] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [typeKey, setTypeKey] = useState<number>(0);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(false);
  const [targetScenes] = useState<number>(3);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [enhancementContext, setEnhancementContext] = useState<{
    base_plot: string;
    characters_context: any[];
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

  // Initialize with current project's plot when component mounts or project changes
  useEffect(() => {
    const initializeScript = async () => {
      if (project?.currentProject && !isInitialized) {
        try {
          // Check if project already has a plot
          if (project.currentProject.plot && project.currentProject.plot.trim()) {
            const currentPlot = project.currentProject.plot;
            const currentSummary = project.currentProject.summary || '';

            setTopScript(currentPlot);
            setScriptDataValue(currentPlot);

            // Plot loaded successfully
          } else {
            // No existing plot, show welcome message
            setTopScript(initialTopMessage);
          }
          setIsInitialized(true);
        } catch (error) {
          console.error('Error initializing script:', error);
          setTopScript(initialTopMessage);
          setIsInitialized(true);
        }
      } else if (!project?.currentProject) {
        // No project selected, show welcome message
        setTopScript(initialTopMessage);
        setIsInitialized(true);
      }
    };

    initializeScript();
  }, [project?.currentProject, isInitialized, initialTopMessage]);

  // Update when script enhancement data changes
  useEffect(() => {
    if (script.enhancedPlot && isInitialized) {
      setTopScript(script.enhancedPlot);
      setScriptDataValue(script.enhancedPlot);

      // Enhanced script loaded successfully
    }
  }, [script.enhancedPlot, script.enhancedSummary, isInitialized]);

  async function handleSubmit() {
    if (!prompt.trim() || script.isEnhancing || !project?.currentProject) return;

    const basePlot = prompt.trim();
    setPrompt("");
    setTopScript("Enhancing your script...");
    setTypeKey((k) => k + 1);

    try {
      // Get current characters for context
      const characters = projectData.characters.map(char => ({
        name: char.metadata?.name || 'Unknown',
        description: char.metadata?.description || 'No description',
        role: char.metadata?.role || 'Unknown',
        age: char.metadata?.age || 30,
        personality: char.metadata?.personality || 'No personality info',
        backstory: char.metadata?.backstory || 'No backstory'
      }));

      console.log('Enhancing script with:', { basePlot, characters: characters.length });

      const result = await script.enhance(basePlot, characters);

      if (result.success) {
        // Store the enhancement context for reference
        setEnhancementContext({
          base_plot: basePlot,
          characters_context: characters
        });

        setTopScript(result.enhanced_plot);
        setScriptDataValue(result.enhanced_plot);
        useSceneStore.getState().setCompleted("character_2", true);

        setShouldAnimate(true);
        setShouldAnimateScriptData(true);
        setTypeKey((k) => k + 1);
      } else {
        setTopScript(`Sorry, there was an error enhancing your script. Please try again.`);
      }
    } catch (error) {
      console.error('Script enhancement error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setTopScript(`Connection error: ${errorMessage}. Please check your connection and try again.`);
    }
  }


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
        {!project?.currentProject ? (
          <div className="rounded-[16px] border border-red-500/20 bg-red-900/10 p-4 text-red-400">
            <div className="text-sm">
              ⚠️ <strong>No Project Selected:</strong> Please create or select a project first!
            </div>
          </div>
        ) : !hasProjectWithCharacters ? (
          <div className="rounded-[16px] border border-orange-500/20 bg-orange-900/10 p-4 text-orange-400">
            <div className="text-sm">
              💡 <strong>Tip:</strong> Complete the Director conversation first to get characters, then come back here to enhance your script with character context!
            </div>
          </div>
        ) : null}

        {/* Enhancement Context Reference */}
        {enhancementContext && (
          <div className="rounded-[16px] border border-blue-500/20 bg-blue-900/10 p-4">
            <h3 className="text-blue-400 font-medium mb-3">📝 Enhancement Reference</h3>

            <div className="space-y-3">
              <div>
                <div className="text-white/70 text-sm font-medium mb-1">Base Plot:</div>
                <div className="text-white/80 text-sm bg-black/20 rounded p-2 max-h-20 overflow-y-auto">
                  {enhancementContext.base_plot}
                </div>
              </div>

              {enhancementContext.characters_context.length > 0 && (
                <div>
                  <div className="text-white/70 text-sm font-medium mb-1">Characters Context ({enhancementContext.characters_context.length}):</div>
                  <div className="text-white/80 text-xs bg-black/20 rounded p-2 max-h-16 overflow-y-auto">
                    {enhancementContext.characters_context.map((char, i) => (
                      <span key={i}>
                        <strong>{char.name}</strong>: {char.description}
                        {i < enhancementContext.characters_context.length - 1 ? ' | ' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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


            <div className="flex items-center justify-end">
              <DuoButton
                size="md"
                onClick={handleSubmit}
                disabled={!prompt.trim() || isLoading || !project?.currentProject}
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