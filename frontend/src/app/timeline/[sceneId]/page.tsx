"use client";

import { useParams, useRouter } from "next/navigation";
import { sampleTimeline } from "@/data/sampleTimeline";
import { Scene } from "@/types/filmmaking";
import Image from "next/image";
import { useState } from "react";

export default function ScenePage() {
  const params = useParams();
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(0);
  
  const sceneId = params.sceneId as string;
  const scene: Scene | undefined = sampleTimeline.scenes.find(s => s.id === sceneId);

  if (!scene) {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Scene not found</h1>
          <button
            onClick={() => router.push('/timeline')}
            className="px-6 py-3 bg-white text-black rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Timeline
          </button>
        </div>
      </div>
    );
  }

  const getDialoguesForTime = (time: number) => {
    return scene.storyboard.dialogues.filter(dialogue => 
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
    <div className="h-screen bg-black text-white flex">
      {/* Storyboard Images */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{scene.title}</h1>
            <p className="text-gray-400 mt-2">{scene.storyboard.title}</p>
          </div>
          <button
            onClick={() => router.push('/timeline')}
            className="text-white/60 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scene.storyboard.frames.map((frame) => (
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
          {scene.storyboard.dialogues.map((dialogue) => (
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
              <span>{formatTime(scene.storyboard.totalDuration)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentTime / scene.storyboard.totalDuration) * 100}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-400">
              {formatTime(currentTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
