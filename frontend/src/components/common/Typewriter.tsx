"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  text: string;
  speed?: number;            // base ms per char
  startDelay?: number;
  cursor?: boolean;
  className?: string;
  onDone?: () => void;

  // NEW:
  punctuationPause?: number; // extra ms for ,.!?;:
  newlinePause?: number;     // extra ms for single '\n'
  paragraphPause?: number;   // extra ms when about to type '\n\n'
};

export default function Typewriter({
  text,
  speed = 30,
  startDelay = 0,
  className,
  onDone,

  punctuationPause = speed * 4,
  newlinePause = speed * 20,
  paragraphPause = speed * 20,
}: Props) {
  const [i, setI] = useState(0);
  const iRef = useRef(0);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    iRef.current = 0;
    setI(0);

    let timeoutId: number | undefined;
    let startId: number | undefined;

    const schedule = () => {
      if (cancelled.current) return;

      // finished?
      if (iRef.current >= text.length) {
        onDone?.();
        return;
      }

      const ch = text[iRef.current];         // next char to reveal
      const next = text[iRef.current + 1];   // char after that
      let extra = 0;

      // Big pause *before* revealing a paragraph break (\n\n)
      if (ch === "\n" && next === "\n") {
        extra += paragraphPause;
      } else if (ch === "\n") {
        // Small pause on single newline
        extra += newlinePause;
      } else if (",.!?;:".includes(ch)) {
        // Punctuation pause
        extra += punctuationPause;
      }

      timeoutId = window.setTimeout(() => {
        iRef.current += 1;
        setI(iRef.current);
        schedule();
      }, speed + extra);
    };

    startId = window.setTimeout(schedule, startDelay);

    return () => {
      cancelled.current = true;
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (startId !== undefined) clearTimeout(startId);
    };
  }, [text, speed, startDelay, onDone, punctuationPause, newlinePause, paragraphPause]);

  return (
    <textarea
      className={className}
      value={text.slice(0, i)}
      readOnly
      style={{
        width: "100%",
        height: "100%",
        flex: 1,
        whiteSpace: "pre-wrap",
        border: "none",
        outline: "none",
        resize: "none",
        background: "transparent",
        color: "inherit",
        padding: 0,
        margin: 0,
        boxSizing: "border-box",
      }}
    />
  );
}
