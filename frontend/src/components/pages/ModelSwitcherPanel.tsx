"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { X, Users, Eye } from "lucide-react";

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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="font-game relative rounded-3xl shadow-2xl p-8 w-[80vw] max-w-4xl h-[80vh] max-h-[600px] flex flex-col" style={{ backgroundColor: 'var(--game-soft-white)', border: '2px solid var(--game-light-gray)' }}>
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-game-bold text-2xl flex items-center gap-3" style={{ color: 'var(--game-charcoal)' }}>
            <Users className="w-6 h-6" style={{ color: 'var(--game-orange)' }} />
            Choose Character
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-xl transition-colors"
            style={{ color: 'var(--game-dark-gray)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--game-charcoal)';
              e.currentTarget.style.backgroundColor = 'var(--game-light-gray)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--game-dark-gray)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 overflow-y-auto">
          {buttonLabels.map((label, idx) => (
            <Button
              key={idx}
              onClick={() => {
                onSelectIndex(idx);
                onClose();
              }}
              variant="outline"
              className="font-game rounded-2xl px-6 py-4 h-auto text-left justify-start transition-all duration-200"
              style={{ 
                backgroundColor: 'var(--game-cream)', 
                color: 'var(--game-charcoal)', 
                border: '2px solid var(--game-light-gray)' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--game-orange)';
                e.currentTarget.style.color = 'var(--game-soft-white)';
                e.currentTarget.style.borderColor = 'var(--game-orange)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--game-cream)';
                e.currentTarget.style.color = 'var(--game-charcoal)';
                e.currentTarget.style.borderColor = 'var(--game-light-gray)';
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'var(--game-orange)', color: 'var(--game-soft-white)' }}>
                  {idx + 1}
                </div>
                <span className="font-medium">{label}</span>
              </div>
            </Button>
          ))}
        </div>
        
        <div className="mt-8 pt-6 flex gap-4" style={{ borderTop: '2px solid var(--game-light-gray)' }}>
          <Button 
            onClick={() => { onShowAll(); onClose(); }} 
            variant="outline"
            className="font-game rounded-2xl px-6 py-3 transition-all"
            style={{ 
              backgroundColor: 'var(--game-cream)', 
              color: 'var(--game-charcoal)', 
              border: '2px solid var(--game-light-gray)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--game-warm-orange)';
              e.currentTarget.style.color = 'var(--game-soft-white)';
              e.currentTarget.style.borderColor = 'var(--game-warm-orange)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--game-cream)';
              e.currentTarget.style.color = 'var(--game-charcoal)';
              e.currentTarget.style.borderColor = 'var(--game-light-gray)';
            }}
          >
            <Eye className="w-4 h-4 mr-2" />
            Show All
          </Button>
          <Button 
            onClick={onClose} 
            className="font-game rounded-2xl px-6 py-3 transition-all"
            style={{ 
              backgroundColor: 'var(--game-orange)', 
              color: 'var(--game-soft-white)', 
              border: '2px solid var(--game-orange)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--game-warm-orange)';
              e.currentTarget.style.borderColor = 'var(--game-warm-orange)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--game-orange)';
              e.currentTarget.style.borderColor = 'var(--game-orange)';
            }}
          >
            Close
          </Button>
          {footer}
        </div>
      </div>
    </div>
  );
}


