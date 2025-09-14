import { useState } from 'react';
import { Play, Pause, Edit3, Check, Clock, Film } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ImageWithFallback } from './figma/ImageWithFallback';

export interface Scene {
  id: string;
  title: string;
  order: number;
  status: 'generated' | 'generating' | 'needs-edits';
  thumbnailUrl: string;
  duration: number;
  description: string;
  metadata?: {
    location: string;
    characters: string[];
    mood: string;
    cameraWork: string;
    lighting: string;
    soundDesign: string;
    visualEffects: string;
  };
}

interface ProjectTimelineProps {
  scenes: Scene[];
  onSceneClick: (scene: Scene) => void;
  projectTitle: string;
  totalDuration: number;
}

const getStatusIcon = (status: Scene['status']) => {
  switch (status) {
    case 'generated':
      return <Check className="w-4 h-4 text-green-400" />;
    case 'generating':
      return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
    case 'needs-edits':
      return <Edit3 className="w-4 h-4 text-red-400" />;
  }
};

const getStatusColor = (status: Scene['status']) => {
  switch (status) {
    case 'generated':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'generating':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'needs-edits':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
};

export function ProjectTimeline({ scenes, onSceneClick, projectTitle, totalDuration }: ProjectTimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Film className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">{projectTitle}</h1>
                <p className="text-sm text-muted-foreground">
                  {scenes.length} scenes • {Math.floor(totalDuration / 60)}m {totalDuration % 60}s total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="border-primary/20 hover:border-primary/40"
              >
                {isPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isPlaying ? 'Pause' : 'Preview Film'}
              </Button>
              <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/80 hover:to-accent/80">
                Export Film
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="container mx-auto px-6 py-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Scene Timeline</h2>
          <p className="text-muted-foreground">Click on any scene to view details and make edits</p>
        </div>

        {/* Film Strip Container */}
        <div className="relative bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 rounded-lg p-4 overflow-hidden">
          {/* Film Strip Background */}
          <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900">
            {/* Sprocket Holes - Top */}
            <div className="absolute top-3 left-0 right-0 flex justify-between">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={`top-${i}`} className="w-4 h-4 bg-stone-950 rounded-full opacity-80 border border-stone-800" />
              ))}
            </div>
            {/* Sprocket Holes - Bottom */}
            <div className="absolute bottom-3 left-0 right-0 flex justify-between">
              {Array.from({ length: 20 }).map((_, i) => (
                <div key={`bottom-${i}`} className="w-4 h-4 bg-stone-950 rounded-full opacity-80 border border-stone-800" />
              ))}
            </div>
          </div>

          {/* Film Frames */}
          <div className="relative z-10 flex gap-2 overflow-x-auto pb-4 scrollbar-hide" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                onClick={() => onSceneClick(scene)}
                className="group flex-shrink-0 cursor-pointer transition-all duration-300 hover:scale-105"
              >
                {/* Film Frame */}
                <div className="relative bg-stone-900 border-2 border-stone-700 rounded-sm overflow-hidden" style={{ width: '280px', height: '200px' }}>
                  {/* Frame Border */}
                  <div className="absolute inset-1 border border-stone-600 rounded-sm overflow-hidden">
                    {/* Image */}
                    <div className="relative w-full h-full">
                      <ImageWithFallback
                        src={scene.thumbnailUrl}
                        alt={scene.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      
                      {/* Scene Number */}
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-black/70 text-white border-white/20 text-xs">
                          {scene.order}
                        </Badge>
                      </div>
                      
                      {/* Status Icon */}
                      <div className="absolute top-2 right-2">
                        <div className={`p-1 rounded-full ${getStatusColor(scene.status)}`}>
                          {getStatusIcon(scene.status)}
                        </div>
                      </div>
                      
                      {/* Duration */}
                      <div className="absolute bottom-2 right-2">
                        <Badge className="bg-black/70 text-white border-white/20 text-xs">
                          {scene.duration}s
                        </Badge>
                      </div>
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-12 h-12 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/40">
                          <Play className="w-6 h-6 text-primary ml-0.5" />
                        </div>
                      </div>
                      
                      {/* Scene Title */}
                      <div className="absolute bottom-2 left-2 right-12">
                        <h3 className="text-white text-sm font-medium line-clamp-1">{scene.title}</h3>
                      </div>
                    </div>
                  </div>
                  
                  {/* Film Frame Perforations */}
                  <div className="absolute -left-1 top-0 bottom-0 w-2 bg-stone-800 flex flex-col justify-evenly">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 bg-stone-950 rounded-full mx-auto" />
                    ))}
                  </div>
                  <div className="absolute -right-1 top-0 bottom-0 w-2 bg-stone-800 flex flex-col justify-evenly">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="w-1 h-1 bg-stone-950 rounded-full mx-auto" />
                    ))}
                  </div>
                </div>
                
                {/* Frame Number Label */}
                <div className="mt-3 text-center">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Frame {String(scene.order).padStart(2, '0')}
                  </span>
                </div>
              </div>
            ))}
            
            {/* Add Scene Button */}
            <div className="flex-shrink-0 flex items-center justify-center cursor-pointer group transition-all duration-300 hover:scale-105">
              <div className="relative bg-stone-900 border-2 border-dashed border-stone-600 rounded-sm overflow-hidden group-hover:border-primary/40 transition-colors" style={{ width: '280px', height: '200px' }}>
                <div className="absolute inset-1 border border-dashed border-stone-500 rounded-sm overflow-hidden flex items-center justify-center group-hover:border-primary/40 transition-colors">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                      <Play className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">Add Scene</p>
                  </div>
                </div>
                
                {/* Perforations for add button */}
                <div className="absolute -left-1 top-0 bottom-0 w-2 bg-stone-800 flex flex-col justify-evenly">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-stone-950 rounded-full mx-auto" />
                  ))}
                </div>
                <div className="absolute -right-1 top-0 bottom-0 w-2 bg-stone-800 flex flex-col justify-evenly">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-stone-950 rounded-full mx-auto" />
                  ))}
                </div>
              </div>
              <div className="mt-3 text-center">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                  + New
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}