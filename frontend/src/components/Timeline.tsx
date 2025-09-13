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
    <div className="h-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-medium">{timeline.title}</h1>
          <button
            onClick={() => router.push('/')}
            className="text-white/60 hover:text-white text-sm"
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
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white font-medium text-sm">{scene.title}</h3>
                  <p className="text-white/80 text-xs mt-1">{formatTime(scene.duration)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Storyboard Overlay */}
      {selectedScene && (
        <div className="fixed inset-0 bg-black/95 z-50 flex">
          {/* Storyboard Images */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-medium">{selectedScene.storyboard.title}</h2>
              <button
                onClick={() => {
                  setSelectedScene(null);
                  router.push('/timeline');
                }}
                className="text-white/60 hover:text-white text-2xl"
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
                    <p className="text-white text-sm bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                      {frame.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dialogue Panel */}
          <div className="w-96 border-l border-gray-800 bg-gray-900/50 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Dialogues</h3>
            <div className="space-y-4">
              {selectedScene.storyboard.dialogues.map((dialogue) => (
                <div
                  key={dialogue.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    getDialoguesForTime(currentTime).some(d => d.id === dialogue.id)
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-400">{dialogue.character}</span>
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTime(dialogue.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{dialogue.text}</p>
                  {dialogue.emotion && (
                    <span className="inline-block mt-2 px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                      {dialogue.emotion}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Timeline Controls */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <h4 className="text-sm font-medium text-gray-400 mb-3">Timeline</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>0:00</span>
                  <span>{formatTime(selectedScene.storyboard.totalDuration)}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(currentTime / selectedScene.storyboard.totalDuration) * 100}%` }}
                  />
                </div>
                <div className="text-center text-sm text-gray-400">
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
