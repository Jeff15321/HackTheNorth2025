"use client";

import * as React from "react";
import { X, Paintbrush, Type, Wand2, Trash2 } from "lucide-react";

type DuoEditOverlayProps = {
  src: string;
  open: boolean;
  onClose: () => void;
};

export function DuoEditOverlay({ src, open, onClose }: DuoEditOverlayProps) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const fabricRef = React.useRef<any>(null);
  const fabricModRef = React.useRef<any>(null);
  const [containerW, setContainerW] = React.useState(1100);
  const [containerH, setContainerH] = React.useState(620);

  const [tool, setTool] = React.useState<"brush" | "text" | "delete" | null>("brush");
  const toolRef = React.useRef<typeof tool>(tool);
  const [brushColor, setBrushColor] = React.useState("#8de21d");

  React.useEffect(() => { toolRef.current = tool; }, [tool]);

  function toAbsoluteUrl(path: string) {
    try {
      if (!path) return "";
      const normalized = path.startsWith("/public/") ? path.replace("/public", "") : path;
      return new URL(normalized, window.location.origin).toString();
    } catch {
      return path;
    }
  }

  function applyModes(c: any, currentTool: typeof tool, color: string) {
    if (!c) return;
    if (currentTool === "brush") {
      c.isDrawingMode = true;
      c.selection = false;
      c.skipTargetFind = true;
      c.forEachObject((o: any) => { if (!o.isBg) o.evented = false; });
      const fabricLib = fabricModRef.current;
      if (!c.freeDrawingBrush && fabricLib) {
        c.freeDrawingBrush = new fabricLib.PencilBrush(c);
      }
      if (c.freeDrawingBrush) {
        c.freeDrawingBrush.color = color;
        c.freeDrawingBrush.width = 6;
      }
    } else if (currentTool === "delete") {
      c.isDrawingMode = false;
      c.selection = false;
      c.skipTargetFind = false;
      c.forEachObject((o: any) => { if (!o.isBg) o.evented = true; });
    } else if (currentTool === "text") {
      c.isDrawingMode = false;
      c.selection = false;
      c.skipTargetFind = false;
      c.forEachObject((o: any) => { if (!o.isBg) o.evented = true; });
    } else {
      c.isDrawingMode = false;
      c.selection = true;
      c.skipTargetFind = false;
      c.forEachObject((o: any) => { if (!o.isBg) o.evented = true; });
    }
    c.requestRenderAll();
  }

  // Setup canvas and load image (dynamic import to avoid SSR issues)
  React.useEffect(() => {
    if (!open) return;

    const maxW = Math.min(window.innerWidth - 80, 1200);
    const maxH = Math.min(window.innerHeight - 180, 800);
    setContainerW(maxW);
    setContainerH(maxH);

    let c: any | null = null;

    const init = async () => {
      const mod: any = await import("fabric");
      const fabricLib: any = mod.fabric || mod.default || mod;
      fabricModRef.current = fabricLib;

      const el = canvasRef.current;
      if (!el) return;
      c = new fabricLib.Canvas(el, {
        width: maxW,
        height: maxH,
        backgroundColor: "#0c1a1f",
        selection: true,
        preserveObjectStacking: true,
      });
      fabricRef.current = c;

      const addCoverImageLayer = (url: string) => {
        const abs = toAbsoluteUrl(url);
        const isExternal = (() => {
          try { return new URL(abs).origin !== window.location.origin; } catch { return false; }
        })();
        const imgEl = new Image();
        if (isExternal) imgEl.crossOrigin = "anonymous";
        imgEl.onload = () => {
          const iw = imgEl.naturalWidth || imgEl.width || 1;
          const ih = imgEl.naturalHeight || imgEl.height || 1;
          const scale = Math.min(maxW / iw, maxH / ih); // contain (no crop)
          const img = new fabricLib.Image(imgEl, {
            selectable: false,
            evented: false,
            scaleX: scale,
            scaleY: scale,
            left: (maxW - iw * scale) / 2,
            top: (maxH - ih * scale) / 2,
          });
          (img as any).isBg = true;
          c.add(img);
          if (typeof c.sendToBack === "function") {
            c.sendToBack(img);
          } else if (typeof img.moveTo === "function") {
            img.moveTo(0);
          }
          c.requestRenderAll();
        };
        imgEl.onerror = () => {
          if (abs !== toAbsoluteUrl("/images/cat1.jpg")) {
            addCoverImageLayer("/images/cat1.jpg");
          }
        };
        imgEl.src = abs;
      };

      const normalizedSrc = src && src.length > 0 ? (src.startsWith("/public/") ? src.replace("/public", "") : src) : "/images/cat1.jpg";
      addCoverImageLayer(normalizedSrc);

      const handleMouseDown = (opt: any) => {
        const currentTool = toolRef.current;
        const target = opt.target as any | undefined;
        if (currentTool === "delete" && target) {
          c.remove(target);
          c.requestRenderAll();
          return;
        }
        if (currentTool === "text") {
          if (target && target.type === "i-text") {
            const it = target as any;
            c.setActiveObject(it);
            it.enterEditing();
            it.selectAll();
            c.requestRenderAll();
            return;
          }
          const pointer = c.getPointer(opt.e as MouseEvent);
          const it = new fabricLib.IText("Add a heading", {
            left: pointer.x,
            top: pointer.y,
            fill: "#ffffff",
            fontFamily: "Feather Bold",
            fontSize: 28,
            textBackgroundColor: "rgba(201,246,154,0.40)",
            padding: 4,
          });
          c.add(it);
          c.setActiveObject(it);
          it.enterEditing();
          it.selectAll();
          c.requestRenderAll();
          return;
        }
      };

      c.on("mouse:down", handleMouseDown);

      const onSelection = () => {
        const active = c.getActiveObject();
        c.getObjects().forEach((obj: any) => {
          if (obj.type === "i-text") {
            obj.set("textBackgroundColor", obj === active ? "rgba(201,246,154,0.40)" : "");
          }
        });
        c.requestRenderAll();
      };
      c.on("selection:created", onSelection);
      c.on("selection:updated", onSelection);
      c.on("selection:cleared", onSelection);

      // Apply current tool immediately after init so drawing works on first open
      applyModes(c, toolRef.current, brushColor);
    };

    init();

    return () => {
      if (c) {
        c.dispose();
      }
      fabricRef.current = null;
    };
  }, [src, open]);

  // Configure canvas modes when tool/brush changes
  React.useEffect(() => {
    const c: any = fabricRef.current;
    if (!c) return;
    applyModes(c, tool, brushColor);
  }, [tool, brushColor]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-6 top-6 font-feather h-12 w-12 rounded-[18px] border border-white/20 bg-white/10 text-white hover:bg-white/15 flex items-center justify-center"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      <div className="w-full max-w-[1300px] px-6">
        <div className="mx-auto rounded-[20px] border border-white/15 bg-[#071217] p-4 shadow-xl">
          <div className="flex w-full items-center justify-center">
            <canvas
              ref={canvasRef}
              width={containerW}
              height={containerH}
              style={{ width: containerW, height: containerH, borderRadius: 14 }}
            />
          </div>

          {/* Toolbar */}
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-3 rounded-[20px] border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <button
                onClick={() => setTool("brush")}
                className={`h-12 w-12 rounded-[18px] border border-white/20 bg-white/10 text-white flex items-center justify-center ${tool === "brush" ? "ring-2 ring-white/30" : ""}`}
                aria-label="Brush"
              >
                <Paintbrush className="h-6 w-6" />
              </button>
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="h-12 w-12 cursor-pointer rounded-[12px] border border-white/20 bg-transparent p-0"
                title="Brush color"
              />
              <button
                onClick={() => setTool("delete")}
                className={`h-12 w-12 rounded-[18px] border border-white/20 bg-white/10 text-white flex items-center justify-center ${tool === "delete" ? "ring-2 ring-white/30" : ""}`}
                aria-label="Delete"
              >
                <Trash2 className="h-6 w-6" />
              </button>
              <button
                onClick={() => setTool("text")}
                className={`h-12 w-12 rounded-[18px] border border-white/20 bg-white/10 text-white flex items-center justify-center ${tool === "text" ? "ring-2 ring-white/30" : ""}`}
                aria-label="Text"
              >
                <Type className="h-6 w-6" />
              </button>
              <button className="ml-2 font-feather rounded-[28px] bg-[#8de21d] px-6 py-3 text-[#0e1b1d] shadow-[0_6px_0_#6bb315] hover:brightness-105 inline-flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Edit Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DuoEditOverlay;