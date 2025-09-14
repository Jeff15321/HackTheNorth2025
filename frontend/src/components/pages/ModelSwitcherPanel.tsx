"use client";

import { ReactNode } from "react";
import MapPinButton from "@/components/ui/MapPinButton";

type ModelSwitcherPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  buttonLabels: string[];
  footer?: ReactNode;
  // Optional: absolute pin positions relative to the background image (0..1)
  pinPositions?: Array<{ top: number; left: number; label?: string }>; // top/left as 0..1
  // Optional: per-pin colors; if omitted, defaults used
  pinColors?: string[];
};

export default function ModelSwitcherPanel({ isOpen, onClose, onSelectIndex, buttonLabels, footer, pinPositions, pinColors }: ModelSwitcherPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="relative bg-white/95 rounded-2xl shadow-2xl p-6 w-[70vw] h-[75vh] flex flex-col overflow-hidden">
        {/* Background image (contained), buttons/content will overlay */}
        <div className="absolute inset-0 pointer-events-none mt-[2.5vh] mb-[2.5vh]">
          <img src="/background/map.png" alt="panel background" className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Choose Worker</h2>
        </div>
        {pinPositions && pinPositions.length > 0 ? (
          // Absolute overlay that scales with the panel; positions are relative (0..1)
          <div className="relative z-10 w-full h-full">
            {pinPositions.map((pin, idx) => (
              <div
                key={idx}
                style={{
                  position: "absolute",
                  top: `${pin.top * 100}%`,
                  left: `${pin.left * 100}%`,
                  transform: "translate(-50%, -100%)",
                }}
                className="flex flex-col items-center gap-1"
              >
                <MapPinButton
                  value={( idx + 2) % buttonLabels.length == 0 ? buttonLabels.length : ( idx + 2) % buttonLabels.length}
                  size={76}
                  color={pinColors?.[idx] ?? "#000000"}
                  onClick={() => {
                    onSelectIndex(idx);
                    onClose();
                  }}
                />
                <div className="text-xs text-gray-800 bg-white/80 px-2 py-1 rounded shadow"
                  style={{
                    fontSize: "20px",
                  }}
                >
                  {pin.label ?? buttonLabels[idx]}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="relative z-10 mt-auto pt-6 flex gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800">Close</button>
          {footer}
        </div>
      </div>
    </div>
  );
}


