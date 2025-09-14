"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Eraser, Highlighter as HighlighterIcon, Palette, Pencil, Ruler, Trash2 } from "lucide-react";
import { Stage, Layer, Image as KImage, Line } from "react-konva";
import { colors } from "@/styles/colors";

export type ScribbleLine = { points: number[]; color: string; size: number; erase?: boolean; tool?: "pencil" | "highlighter" | "eraser" };

export default function ScribbleEditor({
  src,
  width,
  brushSize = 12,
  brushColor = "#8DFF00",
  lines,
  onChangeLines,
}: {
  src: string;
  width?: number; // if undefined, fills parent width
  brushSize?: number;
  brushColor?: string;
  lines?: ScribbleLine[];
  onChangeLines?: (l: ScribbleLine[]) => void;
}) {
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [height, setHeight] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [internalLines, setInternalLines] = useState<ScribbleLine[]>([]);
  const [editing] = useState(true);
  const [tool, setTool] = useState<"pencil" | "highlighter" | "eraser">("pencil");
  const [color, setColor] = useState(brushColor);
  const [size, setSize] = useState(brushSize);

  // load image
  useEffect(() => {
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.src = src;
    i.onload = () => {
      // height is computed from container (1:1)
      setImg(i);
    };
  }, [src]);

  // Track container width if width is not provided
  const [containerWidth, setContainerWidth] = useState<number>(width ?? 480);
  useEffect(() => {
    if (typeof width === "number") {
      setContainerWidth(width);
      setHeight(width); // 1:1
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(180, Math.floor(entry.contentRect.width));
        setContainerWidth(w);
        setHeight(w); // 1:1 square
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);

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
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    if (!pos) return;
    setIsDrawing(true);
    updateLines((prev) =>
      prev.concat([
        {
          points: [pos.x, pos.y],
          color,
          size,
          erase: tool === "eraser",
          tool: tool === "eraser" ? "eraser" : tool,
        },
      ])
    );
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

  // no text features

  const exportPNG = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataURL = stage.toDataURL({ pixelRatio: 2, mimeType: "image/png" });
    const a = document.createElement("a");
    a.href = dataURL;
    a.download = "scribble.png";
    a.click();
  };

  const containerHeight = useMemo(() => Math.max(180, height), [height]);

  // compute cover-fit dims for image within square stage
  const coverDims = useMemo(() => {
    if (!img) return { x: 0, y: 0, w: containerWidth, h: containerHeight };
    const sx = containerWidth / img.naturalWidth;
    const sy = containerHeight / img.naturalHeight;
    const scale = Math.max(sx, sy);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (containerWidth - w) / 2;
    const y = (containerHeight - h) / 2;
    return { x, y, w, h };
  }, [img, containerWidth, containerHeight]);

  return (
    <div ref={containerRef} className="flex w-full flex-col gap-3">
      <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white">
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
          style={{ display: "block", background: "transparent" }}
        >
          <Layer listening={false}>
            {img && (
              <KImage image={img} x={coverDims.x} y={coverDims.y} width={coverDims.w} height={coverDims.h} />
            )}
          </Layer>

          <Layer listening={editing}>
            {internalLines.map((l, i) => {
              const isEraser = l.erase || l.tool === "eraser";
              const isHighlighter = l.tool === "highlighter";
              return (
                <Line
                  key={i}
                  points={l.points}
                  stroke={l.color}
                  strokeWidth={l.size}
                  opacity={isEraser ? 1 : isHighlighter ? 0.5 : 1}
                  tension={0}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={isEraser ? "destination-out" : "source-over"}
                />
              );
            })}
          </Layer>

          {/* No text layer */}
        </Stage>
      </div>

      <div className="flex flex-wrap items-center gap-2">

        <button
          onClick={() => updateLines(() => [])}
          title="Clear"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/12 bg-white/5 text-white/80 hover:border-white/22"
        >
          <Trash2 className="h-5 w-5" />
        </button>

        <label className="inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-white/12 bg-white/5 px-2 text-white/80">
          <Palette className="h-5 w-5" />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded-md border border-white/20 bg-transparent p-0"
          />
        </label>

        <label className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-white/12 bg-white/5 px-2 text-white/80">
          <Ruler className="h-5 w-5" />
          <input
            type="range"
            min={2}
            max={30}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value, 10))}
            className="accent-[#8de21d]"
          />
        </label>

        <button
          onClick={() => setTool("pencil")}
          title="Pencil"
          className={[
            "inline-flex h-10 w-10 items-center justify-center rounded-[12px] border",
            tool === "pencil" ? "border-[#2aa3ff] bg-[#0e1b1d] text-[#69c0ff]" : "border-white/12 bg-white/5 text-white/80 hover:border-white/22",
          ].join(" ")}
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          onClick={() => setTool("highlighter")}
          title="Highlighter"
          className={[
            "inline-flex h-10 w-10 items-center justify-center rounded-[12px] border",
            tool === "highlighter" ? "border-[#2aa3ff] bg-[#0e1b1d] text-[#69c0ff]" : "border-white/12 bg-white/5 text-white/80 hover:border-white/22",
          ].join(" ")}
        >
          <HighlighterIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setTool("eraser")}
          title="Eraser"
          className={[
            "inline-flex h-10 w-10 items-center justify-center rounded-[12px] border",
            tool === "eraser" ? "border-[#2aa3ff] bg-[#0e1b1d] text-[#69c0ff]" : "border-white/12 bg-white/5 text-white/80 hover:border-white/22",
          ].join(" ")}
        >
          <Eraser className="h-5 w-5" />
        </button>

        <button
          onClick={exportPNG}
          title="Export PNG"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-white/12 bg-white/5 text-white/80 hover:border-white/22"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}


