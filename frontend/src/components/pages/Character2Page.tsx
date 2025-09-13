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
    setTimeout(async () => {
      const result = await talkToScriptAgent(prompt);
      setTopScript(result);
      setScriptDataValue(result);
      // Mark completed when API first returns a value
      useSceneStore.getState().setCompleted("character_2", true);
      setIsLoading(false);
      setShouldAnimate(true);
      setShouldAnimateScriptData(true);
      setTypeKey((k) => k + 1);
    }, 3000);
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "28rem",
        background: backgroundColor,
        borderLeft: "1px solid rgba(0,0,0,0.08)",
        boxShadow: `-8px 0 24px ${colors.shadow}`,
        padding: 16,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        color: textColor,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>character_2</h2>
        <button style={{ border: `1px solid ${colors.borderLight}`, padding: "6px 10px", borderRadius: 6, background: colors.white }} onClick={reset}>
          Close
        </button>
      </div>

      {isLoading ? (
        <div
          style={{
            flex: 1,
            minHeight: 160,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: "8px 10px",
            background: colors.white,
            color: borderColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LoadingClapBoard />
        </div>
      ) : shouldAnimate ? (
        <div
          style={{
            flex: 1,
            minHeight: 160,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: "8px 10px",
            background: colors.white,
            color: borderColor,
            overflow: "auto",
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
          value={scriptData}
          onChange={(e) => {
            setTopScript(e.target.value);
            setScriptDataValue(e.target.value);
            if (shouldAnimate) {
              setShouldAnimate(false);
              setShouldAnimateScriptData(false);
            }
          }}
          placeholder="Top script"
          style={{
            flex: 1,
            minHeight: 160,
            resize: "none",
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: "8px 10px",
            outline: "none",
            overflow: "auto",
            background: colors.white,
            color: borderColor,
          }}
        />
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <textarea
          value={bottomText}
          onChange={(e) => setBottomText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Type here (Enter to submit, Shift+Enter for newline)"
          style={{
            flex: 1,
            minHeight: 140,
            resize: "none",
            border: `1px solid ${colors.borderLight}`,
            borderRadius: 6,
            padding: "8px 10px",
            outline: "none",
            overflow: "auto",
            background: colors.white,
            color: borderColor,
          }}
        />
        <button
          onClick={handleSubmit}
          style={{
            border: `1px solid ${buttonColor}`,
            padding: "10px 14px",
            borderRadius: 6,
            background: buttonColor,
            color: colors.white,
            cursor: "pointer",
            height: 40,
            alignSelf: "flex-start",
          }}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
