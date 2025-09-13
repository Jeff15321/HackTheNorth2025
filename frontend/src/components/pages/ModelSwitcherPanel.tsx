"use client";

import { ReactNode } from "react";

type ModelSwitcherPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
  onShowAll: () => void;
  buttonLabels: string[];
  footer?: ReactNode;
};

export default function ModelSwitcherPanel({ isOpen, onClose, onSelectIndex, onShowAll, buttonLabels, footer }: ModelSwitcherPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="relative bg-white/95 rounded-2xl shadow-2xl p-6 w-[70vw] h-[70vh] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Choose Character</h2>
          <button className="text-gray-600 hover:text-gray-900" onClick={onClose}>✕</button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {buttonLabels.map((label, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectIndex(idx);
                onClose();
              }}
              className="px-4 py-3 rounded-lg bg-gray-900 text-white hover:bg-gray-800"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-auto pt-6 flex gap-3">
          <button onClick={() => { onShowAll(); onClose(); }} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300">Show All</button>
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800">Close</button>
          {footer}
        </div>
      </div>
    </div>
  );
}


