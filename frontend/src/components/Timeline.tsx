'use client';

import React, { useState, useRef } from 'react';
import { Timeline as TimelineType, Scene, Dialogue } from '@/types/filmmaking';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface TimelineProps {
  timeline: TimelineType;
}

const Timeline: React.FC<TimelineProps> = ({ timeline }) => {
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const handleSceneClick = (scene: Scene) => {
    setSelectedScene(scene);
    setCurrentTime(0);
    router.push(`/timeline/${scene.id}`);
  };

  const getDialoguesForTime = (time: number): Dialogue[] => {
    if (!selectedScene) return [];
    return selectedScene.storyboard.dialogues.filter(dialogue => 
      dialogue.timestamp <= time && 
      dialogue.timestamp + 5 >= time
    );
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen overflow-hidden font-game" style={{ backgroundColor: 'var(--game-charcoal)', color: 'var(--game-soft-white)' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 backdrop-blur-sm p-4" style={{ backgroundColor: 'rgba(74, 74, 74, 0.5)' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium">{timeline.title}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-sm transition-colors"
            style={{ color: 'var(--game-light-gray)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--game-soft-white)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--game-light-gray)'}
          >
            ← Back to Home
          </button>
        </div>
      </div>

      {/* Horizontal Timeline with Scroll */}
      <div className="h-full pt-16 pb-4">
        <div 
          ref={scrollRef}
          className="h-full flex items-center overflow-x-auto px-4 space-x-4 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {timeline.scenes.map((scene) => (
            <div
              key={scene.id}
              className="flex-shrink-0 cursor-pointer group"
              onClick={() => handleSceneClick(scene)}
            >
              <div className="relative w-80 h-48 rounded-lg overflow-hidden">
                <Image
                  src={scene.thumbnail}
                  alt={scene.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 transition-colors" style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }} />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="font-medium text-sm" style={{ color: 'var(--game-soft-white)' }}>{scene.title}</h3>
                  <p className="text-xs mt-1" style={{ color: 'var(--game-light-gray)' }}>{formatTime(scene.duration)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Storyboard Overlay */}
      {selectedScene && (
        <div className="fixed inset-0 z-50 flex" style={{ backgroundColor: 'rgba(74, 74, 74, 0.95)' }}>
          {/* Storyboard Images */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-medium" style={{ color: 'var(--game-soft-white)' }}>{selectedScene.storyboard.title}</h2>
              <button
                onClick={() => {
                  setSelectedScene(null);
                  router.push('/timeline');
                }}
                className="text-2xl transition-colors"
                style={{ color: 'var(--game-light-gray)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--game-soft-white)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--game-light-gray)'}
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {selectedScene.storyboard.frames.map((frame) => (
                <div key={frame.id} className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={frame.imageUrl}
                    alt={frame.description}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-sm backdrop-blur-sm rounded px-2 py-1" style={{ color: 'var(--game-soft-white)', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                      {frame.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dialogue Panel */}
          <div className="w-96 border-l p-6 overflow-y-auto" style={{ borderColor: 'var(--game-light-gray)', backgroundColor: 'rgba(74, 74, 74, 0.5)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--game-soft-white)' }}>Dialogues</h3>
            <div className="space-y-4">
              {selectedScene.storyboard.dialogues.map((dialogue) => (
                <div
                  key={dialogue.id}
                  className="p-4 rounded-lg border transition-colors"
                  style={{
                    borderColor: getDialoguesForTime(currentTime).some(d => d.id === dialogue.id) ? 'var(--game-orange)' : 'var(--game-light-gray)',
                    backgroundColor: getDialoguesForTime(currentTime).some(d => d.id === dialogue.id) ? 'rgba(246, 183, 142, 0.1)' : 'rgba(74, 74, 74, 0.5)'
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium" style={{ color: 'var(--game-orange)' }}>{dialogue.character}</span>
                    <span className="text-xs font-mono" style={{ color: 'var(--game-dark-gray)' }}>
                      {formatTime(dialogue.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--game-light-gray)' }}>{dialogue.text}</p>
                  {dialogue.emotion && (
                    <span className="inline-block mt-2 px-2 py-1 text-xs rounded" style={{ backgroundColor: 'var(--game-dark-gray)', color: 'var(--game-light-gray)' }}>
                      {dialogue.emotion}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Timeline Controls */}
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--game-light-gray)' }}>
              <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--game-light-gray)' }}>Timeline</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--game-dark-gray)' }}>
                  <span>0:00</span>
                  <span>{formatTime(selectedScene.storyboard.totalDuration)}</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--game-dark-gray)' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(currentTime / selectedScene.storyboard.totalDuration) * 100}%`,
                      backgroundColor: 'var(--game-orange)'
                    }}
                  />
                </div>
                <div className="text-center text-sm" style={{ color: 'var(--game-light-gray)' }}>
                  {formatTime(currentTime)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
