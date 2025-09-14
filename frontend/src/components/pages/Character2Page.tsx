"use client";

import { useEffect, useState, memo, useCallback } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { themeCharacter1, colors } from "@/styles/colors";
import Typewriter from "@/components/common/Typewriter";
import { talkToScriptAgent } from "@/lib/agentApi";
import { scriptStore, setScriptDataValue, setShouldAnimateScriptData } from "@/data/scriptData";
import LoadingClapBoard from "../common/loading_clap_board";

// Hoist memoization so the component type stays stable between renders

export default function Character2Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);

  const textColor = themeCharacter1.text;
  const borderColor = themeCharacter1.border;
  const buttonColor = themeCharacter1.button;
  const backgroundColor = themeCharacter1.background;

  const initialTopMessage = "Hey there buddy, tell me a script you want to write and I will make it come to life";
  const [scriptData, setTopScript] = useState<string>(scriptStore.scriptData || initialTopMessage);
  const [bottomText, setBottomText] = useState<string>("");
  const [typeKey, setTypeKey] = useState<number>(0);
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(scriptStore.shouldAnimateScriptData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const handleTypewriterDone = useCallback(() => {
    setShouldAnimate(false);
  }, []);
  // The top box will always display the latest returned script

  // Turn off future animation at the start of an animation cycle
  useEffect(() => {
    if (shouldAnimate) {
      setShouldAnimateScriptData(false);
    }
  }, [shouldAnimate]);

  async function handleSubmit() {
    if (!bottomText.trim()) return;
    const prompt = bottomText.trim();
    setBottomText("");
    // Clear previous top content before loading the new one
    setTopScript("");
    setTypeKey((k) => k + 1);
    setIsLoading(true);
    const result = await talkToScriptAgent(prompt);
    setTopScript(result);
    setScriptDataValue(result);
    // Mark completed when API first returns a value
    useSceneStore.getState().setCompleted("character_2", true);
    setIsLoading(false);
    setShouldAnimate(true);
    setShouldAnimateScriptData(true);
    setTypeKey((k) => k + 1);
  }

  return (
    <div
      className="font-game"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "80%",
        background: "var(--game-soft-white)",
        borderLeft: "1px solid var(--game-light-gray)",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.1)",
        padding: 20,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        color: "var(--game-charcoal)",
        borderRadius: "16px 0 0 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 className="font-game-bold" style={{ fontSize: 24, color: "var(--game-charcoal)" }}>SCRIPT GENERATOR</h2>
        <button 
          className="font-game"
          style={{ 
            border: "1px solid var(--game-light-gray)", 
            padding: "8px 16px", 
            borderRadius: 12, 
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
            cursor: "pointer",
            transition: "all 0.2s ease"
          }} 
          onClick={reset}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--game-orange)";
            e.currentTarget.style.color = "var(--game-soft-white)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--game-cream)";
            e.currentTarget.style.color = "var(--game-charcoal)";
          }}
        >
          Close
        </button>
      </div>

      {isLoading ? (
        <div
          className="font-game"
          style={{
            flex: 1,
            minHeight: 200,
            border: "2px solid var(--game-light-gray)",
            borderRadius: 16,
            padding: 20,
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <LoadingClapBoard />
        </div>
      ) : shouldAnimate ? (
        <div
          className="font-game"
          style={{
            flex: 1,
            minHeight: 200,
            border: "2px solid var(--game-light-gray)",
            borderRadius: 16,
            padding: 20,
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
            overflow: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <Typewriter
            key={typeKey}
            text={scriptData}
            speed={2}
            startDelay={0}
            cursor={true}
            onDone={handleTypewriterDone}
          />
        </div>
      ) : (
        <textarea
          className="font-game"
          value={scriptData}
          onChange={(e) => {
            setTopScript(e.target.value);
            setScriptDataValue(e.target.value);
            if (shouldAnimate) {
              setShouldAnimate(false);
              setShouldAnimateScriptData(false);
            }
          }}
          placeholder="Your generated script will appear here..."
          style={{
            flex: 1,
            minHeight: 200,
            resize: "none",
            border: "2px solid var(--game-light-gray)",
            borderRadius: 16,
            padding: 20,
            outline: "none",
            overflow: "auto",
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            fontSize: 16,
            lineHeight: 1.5,
          }}
        />
      )}

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <textarea
          className="font-game"
          value={bottomText}
          onChange={(e) => setBottomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Describe your script idea here... (Enter to submit, Shift+Enter for newline)"
          style={{
            flex: 1,
            height: 60,
            resize: "none",
            border: "2px solid var(--game-light-gray)",
            borderRadius: 12,
            padding: "12px 16px",
            outline: "none",
            overflow: "auto",
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
            fontSize: 16,
            lineHeight: 1.5,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            transition: "all 0.2s ease",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--game-orange)";
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(246, 183, 142, 0.3)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--game-light-gray)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
          }}
        />
        <button
          className="font-game"
          onClick={handleSubmit}
          disabled={!bottomText.trim() || isLoading}
          style={{
            border: "2px solid var(--game-orange)",
            padding: "12px 20px",
            borderRadius: 12,
            background: isLoading ? "var(--game-light-gray)" : "var(--game-orange)",
            color: "var(--game-soft-white)",
            cursor: isLoading ? "not-allowed" : "pointer",
            height: 60,
            alignSelf: "flex-start",
            fontSize: 16,
            fontWeight: 500,
            boxShadow: "0 4px 12px rgba(246, 183, 142, 0.3)",
            transition: "all 0.2s ease",
            opacity: isLoading ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = "var(--game-warm-orange)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(246, 183, 142, 0.4)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading) {
              e.currentTarget.style.background = "var(--game-orange)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(246, 183, 142, 0.3)";
            }
          }}
        >
          {isLoading ? "Generating..." : "Generate Script"}
        </button>
      </div>
    </div>
  );
}
