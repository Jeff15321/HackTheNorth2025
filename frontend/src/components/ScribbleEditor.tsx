"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Image as KImage, Line } from "react-konva";
import { colors } from "@/styles/colors";

export type ScribbleLine = { points: number[]; color: string; size: number; erase?: boolean };

export default function ScribbleEditor({
  src,
  width = 480,
  brushSize = 12,
  brushColor = "#8DFF00",
  lines,
  onChangeLines,
}: {
  src: string;
  width?: number;
  brushSize?: number;
  brushColor?: string;
  lines?: ScribbleLine[];
  onChangeLines?: (l: ScribbleLine[]) => void;
}) {
  const stageRef = useRef<any>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [height, setHeight] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [internalLines, setInternalLines] = useState<ScribbleLine[]>([]);
  const [editing, setEditing] = useState(false);
  const [erase, setErase] = useState(false);
  const [color, setColor] = useState(brushColor);
  const [size, setSize] = useState(brushSize);

  // load image and keep aspect
  useEffect(() => {
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.src = src;
    i.onload = () => {
      const h = Math.round((i.naturalHeight / i.naturalWidth) * width);
      setHeight(h);
      setImg(i);
    };
  }, [src, width]);

  // Initialize/refresh lines when source image changes
  useEffect(() => {
    setInternalLines(lines ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  function updateLines(updater: (prev: ScribbleLine[]) => ScribbleLine[]) {
    setInternalLines((prev) => updater(prev));
  }

  // Notify parent after render when lines change to avoid parent updates during child render
  const lastSentRef = useRef<ScribbleLine[] | null>(null);
  useEffect(() => {
    if (!onChangeLines) return;
    if (internalLines === lines) return;
    if (lastSentRef.current === internalLines) return;
    lastSentRef.current = internalLines;
    onChangeLines(internalLines);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalLines, lines, onChangeLines]);

  const handlePointerDown = (e: any) => {
    if (!editing) return;
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    updateLines((prev) => prev.concat([{ points: [pos.x, pos.y], color, size, erase }]));
  };

  const handlePointerMove = (e: any) => {
    if (!isDrawing || !editing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    updateLines((prev) => {
      const last = prev[prev.length - 1];
      if (!last) return prev;
      last.points = last.points.concat([point.x, point.y]);
      return prev.slice(0, -1).concat(last);
    });
  };

  const handlePointerUp = () => setIsDrawing(false);

  const exportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "scribble.png";
    a.click();
  };

  const containerWidth = width;
  const containerHeight = useMemo(() => Math.max(180, height), [height]);

  return (
    <div style={{ width: containerWidth, display: "flex", flexDirection: "column", gap: 8 }}>
      <Stage
        ref={stageRef}
        width={containerWidth}
        height={containerHeight}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        style={{ border: `1px solid ${colors.borderLight}`, borderRadius: 6, background: colors.white }}
      >
        <Layer listening={false}>
          {img && <KImage image={img} width={containerWidth} height={containerHeight} />}
        </Layer>

        <Layer listening={editing}>
          {internalLines.map((l, i) => (
            <Line
              key={i}
              points={l.points}
              stroke={l.color}
              strokeWidth={l.size}
              opacity={l.erase ? 1 : 0.5}
              tension={0}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation={l.erase ? "destination-out" : "source-over"}
            />
          ))}
        </Layer>
      </Stage>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => setEditing((e) => !e)}
          style={{ border: `1px solid ${colors.borderLight}`, padding: "4px 8px", borderRadius: 6, background: colors.white }}
        >
          {editing ? "Done" : "Edit"}
        </button>
        <button
          onClick={() => updateLines(() => [])}
          style={{ border: `1px solid ${colors.borderLight}`, padding: "4px 8px", borderRadius: 6, background: colors.white }}
        >
          Clear
        </button>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#444" }}>Color</span>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            style={{ width: 28, height: 28, padding: 0, border: `1px solid ${colors.borderLight}`, borderRadius: 4 }}
          />
        </label>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#444" }}>Size</span>
          <input
            type="range"
            min={2}
            max={30}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
          />
        </label>
        <button
          onClick={() => setErase(false)}
          style={{ border: `1px solid ${colors.borderLight}`, padding: "4px 8px", borderRadius: 6, background: erase ? colors.white : "#f5f5f5" }}
        >
          Pencil
        </button>
        <button
          onClick={() => setErase(true)}
          style={{ border: `1px solid ${colors.borderLight}`, padding: "4px 8px", borderRadius: 6, background: erase ? "#f5f5f5" : colors.white }}
        >
          Eraser
        </button>
        <button
          onClick={exportPNG}
          style={{ border: `1px solid ${colors.borderLight}`, padding: "4px 8px", borderRadius: 6, background: colors.white }}
        >
          Export PNG
        </button>
      </div>
    </div>
  );
}


