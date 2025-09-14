import { useState } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Download, Edit3, Wand2, Plus, Users, Camera, Volume2, Settings, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Scene } from './project-timeline';

interface Shot {
  id: string;
  order: number;
  title: string;
  description: string;
  duration: number;
  imageUrl: string;
  cameraAngle: string;
  characters: string[];
  setting: string;
}

interface Character {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

interface Setting {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

interface AudioTrack {
  id: string;
  name: string;
  type: 'dialogue' | 'music' | 'sfx';
  duration: number;
}

interface SceneStoryboardProps {
  scene: Scene;
  onBack: () => void;
}

export function SceneStoryboard({ scene, onBack }: SceneStoryboardProps) {
  const [selectedShot, setSelectedShot] = useState<string | null>(null);
  const [hoveredShot, setHoveredShot] = useState<string | null>(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [prompt, setPrompt] = useState(scene.description);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Mock data for shots within the scene
  const [shots, setShots] = useState<Shot[]>([
    {
      id: '1',
      order: 1,
      title: 'Establishing Shot',
      description: 'Wide shot establishing the laboratory setting',
      duration: 1.5,
      imageUrl: scene.thumbnailUrl,
      cameraAngle: 'Wide Shot',
      characters: ['Dr. Elena Vasquez'],
      setting: 'Futuristic Laboratory'
    },
    {
      id: '2',
      order: 2,
      title: 'Character Introduction',
      description: 'Medium shot of the scientist examining data',
      duration: 2.0,
      imageUrl: scene.thumbnailUrl,
      cameraAngle: 'Medium Shot',
      characters: ['Dr. Elena Vasquez'],
      setting: 'Futuristic Laboratory'
    },
    {
      id: '3',
      order: 3,
      title: 'The Discovery',
      description: 'Close-up on the mysterious artifact',
      duration: 1.5,
      imageUrl: scene.thumbnailUrl,
      cameraAngle: 'Close-up',
      characters: [],
      setting: 'Futuristic Laboratory'
    },
    {
      id: '4',
      order: 4,
      title: 'Reaction Shot',
      description: 'Character reacts to the discovery',
      duration: 1.0,
      imageUrl: scene.thumbnailUrl,
      cameraAngle: 'Close-up',
      characters: ['Dr. Elena Vasquez'],
      setting: 'Futuristic Laboratory'
    },
    {
      id: '5',
      order: 5,
      title: 'Artifact Activation',
      description: 'The artifact begins to glow with blue energy',
      duration: 1.5,
      imageUrl: scene.thumbnailUrl,
      cameraAngle: 'Medium Shot',
      characters: [],
      setting: 'Futuristic Laboratory'
    },
    {
      id: '6',
      order: 6,
      title: 'Ending Shot',
      description: 'Pull back to show the entire laboratory bathed in blue light',
      duration: 0.5,
      imageUrl: scene.thumbnailUrl,
      cameraAngle: 'Wide Shot',
      characters: ['Dr. Elena Vasquez'],
      setting: 'Futuristic Laboratory'
    }
  ]);

  const [characters] = useState<Character[]>([
    {
      id: '1',
      name: 'Dr. Elena Vasquez',
      description: 'Lead scientist studying the artifact',
      imageUrl: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400'
    },
    {
      id: '2',
      name: 'Commander Rex',
      description: 'Military liaison overseeing the project',
      imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
    }
  ]);

  const [settings] = useState<Setting[]>([
    {
      id: '1',
      name: 'Futuristic Laboratory',
      description: 'High-tech research facility with holographic displays',
      imageUrl: scene.thumbnailUrl
    },
    {
      id: '2',
      name: 'Artifact Chamber',
      description: 'Specialized containment room for the mysterious object',
      imageUrl: scene.thumbnailUrl
    }
  ]);

  const [audioTracks] = useState<AudioTrack[]>([
    { id: '1', name: 'Ambient Laboratory Hum', type: 'sfx', duration: 8 },
    { id: '2', name: 'Mysterious Discovery Theme', type: 'music', duration: 8 },
    { id: '3', name: 'Dr. Vasquez Dialogue', type: 'dialogue', duration: 3 }
  ]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
      setIsEditingPrompt(false);
    }, 3000);
  };

  const cameraAngles = ['Wide Shot', 'Medium Shot', 'Close-up', 'Extreme Close-up', 'Over Shoulder', 'Low Angle', 'High Angle'];

  return (
    <div className="min-h-screen font-game" style={{ backgroundColor: 'var(--game-cream)' }}>
      {/* Header */}
      <div className="border-b backdrop-blur-sm sticky top-0 z-10" style={{ borderColor: 'var(--game-light-gray)', backgroundColor: 'rgba(245, 241, 232, 0.5)' }}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onBack} 
                className="transition-colors"
                style={{ color: 'var(--game-charcoal)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--game-light-gray)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Timeline
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Badge 
                    className="border-0"
                    style={{ backgroundColor: 'var(--game-charcoal)', color: 'var(--game-soft-white)', borderColor: 'var(--game-light-gray)' }}
                  >
                    Scene {scene.order}
                  </Badge>
                  <h1 className="text-xl font-semibold" style={{ color: 'var(--game-charcoal)' }}>{scene.title}</h1>
                  <p className="mt-1 text-sm" style={{ color: 'var(--game-dark-gray)' }}>{scene.duration}s • {shots.length} shots</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Scene
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="transition-all"
                style={{ 
                  background: 'linear-gradient(to right, var(--game-orange), var(--game-warm-orange))',
                  color: 'var(--game-soft-white)',
                  border: '2px solid var(--game-orange)'
                }}
                onMouseEnter={(e) => {
                  if (!isRegenerating) {
                    e.currentTarget.style.background = 'linear-gradient(to right, rgba(246, 183, 142, 0.8), rgba(230, 164, 120, 0.8))';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isRegenerating) {
                    e.currentTarget.style.background = 'linear-gradient(to right, var(--game-orange), var(--game-warm-orange))';
                  }
                }}
              >
                {isRegenerating ? (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Regenerate Scene
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Storyboard Grid */}
          <div className="col-span-9">
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Scene Breakdown</h2>
              <p className="text-sm text-muted-foreground">Click on any shot to edit its details</p>
            </div>

            {/* 6-Shot Grid - Wider layout */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {shots.map((shot) => (
                <div
                  key={shot.id}
                  className={`group overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 border-2 relative ${
                    selectedShot === shot.id ? 'border-primary shadow-lg shadow-primary/20' : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setSelectedShot(shot.id)}
                  onMouseEnter={() => setHoveredShot(shot.id)}
                  onMouseLeave={() => setHoveredShot(null)}
                >
                  <div className="relative aspect-video">
                    <ImageWithFallback
                      src={shot.imageUrl}
                      alt={shot.title}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Shot Overlay */}
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent, transparent)' }} />
                    
                    {/* Shot Number */}
                    <div className="absolute top-3 left-3">
                      <Badge className="text-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'var(--game-soft-white)' }}>
                        Shot {shot.order}
                      </Badge>
                    </div>
                    
                    {/* Duration */}
                    <div className="absolute top-3 right-3">
                      <Badge className="text-sm" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', color: 'var(--game-soft-white)' }}>
                        {shot.duration}s
                      </Badge>
                    </div>
                    
                    {/* Camera Angle */}
                    <div className="absolute bottom-3 right-3">
                      <Badge className="text-sm" style={{ backgroundColor: 'var(--game-orange)', color: 'var(--game-soft-white)' }}>
                        <Camera className="w-3 h-3 mr-1" />
                        {shot.cameraAngle}
                      </Badge>
                    </div>
                    
                    {/* Shot Title & Description */}
                    <div className="absolute bottom-3 left-3 right-32">
                      <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--game-soft-white)' }}>{shot.title}</h4>
                      <p className="text-sm line-clamp-2" style={{ color: 'rgba(254, 252, 247, 0.8)' }}>{shot.description}</p>
                    </div>
                    
                    {/* Character Count */}
                    {shot.characters.length > 0 && (
                      <div className="absolute top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="text-sm" style={{ backgroundColor: 'var(--game-warm-orange)', color: 'var(--game-soft-white)' }}>
                          <Users className="w-3 h-3 mr-1" />
                          {shot.characters.length}
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* Hover Metadata Dropdown */}
                  {hoveredShot === shot.id && (
                    <div className="absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl z-50 p-4" style={{ backgroundColor: 'var(--game-charcoal)', border: '2px solid var(--game-light-gray)' }}>
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">{shot.title}</h4>
                          <p className="text-xs text-slate-300">{shot.description}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 font-medium">Duration:</span>
                            <p className="text-slate-200">{shot.duration}s</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Camera:</span>
                            <p className="text-slate-200">{shot.cameraAngle}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Characters:</span>
                            <p className="text-slate-200">{shot.characters.length > 0 ? shot.characters.join(', ') : 'None'}</p>
                          </div>
                          <div>
                            <span className="text-slate-400 font-medium">Setting:</span>
                            <p className="text-slate-200">{shot.setting}</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-slate-400 font-medium">Shot Order:</span>
                            <p className="text-slate-200">Shot {shot.order} of {shots.length}</p>
                          </div>
                        </div>
                        
                        {/* Scene Metadata */}
                        {scene.metadata && (
                          <div className="border-t border-slate-600 pt-3 mt-3">
                            <h5 className="text-xs font-semibold text-slate-300 mb-2">Scene Details</h5>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-slate-400 font-medium">Location:</span>
                                <p className="text-slate-200">{scene.metadata.location}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Mood:</span>
                                <p className="text-slate-200">{scene.metadata.mood}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Camera Work:</span>
                                <p className="text-slate-200">{scene.metadata.cameraWork}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Lighting:</span>
                                <p className="text-slate-200">{scene.metadata.lighting}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Sound Design:</span>
                                <p className="text-slate-200">{scene.metadata.soundDesign}</p>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Visual Effects:</span>
                                <p className="text-slate-200">{scene.metadata.visualEffects}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Side Panel with Tabs */}
          <div className="col-span-3">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                <TabsTrigger value="assets" className="text-xs">Assets</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-6">
                {/* Scene Overview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Scene Overview</h3>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  
                  {isEditingPrompt ? (
                    <div className="space-y-3">
                      <Textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the overall scene..."
                        className="min-h-[120px]"
                        style={{ backgroundColor: 'var(--game-soft-white)', border: '2px solid var(--game-light-gray)', color: 'var(--game-charcoal)' }}
                      />
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={handleRegenerate}
                          disabled={isRegenerating}
                          className="transition-all"
                          style={{ backgroundColor: 'var(--game-orange)', color: 'var(--game-soft-white)', border: '2px solid var(--game-orange)' }}
                          onMouseEnter={(e) => {
                            if (!isRegenerating) {
                              e.currentTarget.style.backgroundColor = 'rgba(246, 183, 142, 0.8)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isRegenerating) {
                              e.currentTarget.style.backgroundColor = 'var(--game-orange)';
                            }
                          }}
                        >
                          Apply Changes
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setIsEditingPrompt(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {prompt}
                    </p>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="assets" className="space-y-6">
                <Tabs defaultValue="characters" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="characters" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      Cast
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="text-xs">
                      <Settings className="w-3 h-3 mr-1" />
                      Sets
                    </TabsTrigger>
                    <TabsTrigger value="audio" className="text-xs">
                      <Volume2 className="w-3 h-3 mr-1" />
                      Audio
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="characters" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Characters</h4>
                      <Button variant="ghost" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {characters.map(character => (
                        <div key={character.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            <ImageWithFallback
                              src={character.imageUrl}
                              alt={character.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{character.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{character.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="settings" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Settings</h4>
                      <Button variant="ghost" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {settings.map(setting => (
                        <div key={setting.id} className="p-3 bg-muted/30 rounded-lg">
                          <div className="aspect-video rounded-md bg-muted mb-2 overflow-hidden">
                            <ImageWithFallback
                              src={setting.imageUrl}
                              alt={setting.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <p className="text-sm font-medium">{setting.name}</p>
                          <p className="text-xs text-muted-foreground">{setting.description}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="audio" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Audio Tracks</h4>
                      <Button variant="ghost" size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {audioTracks.map(track => (
                        <div key={track.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className={`w-2 h-2 rounded-full ${
                            track.type === 'dialogue' ? 'bg-blue-400' :
                            track.type === 'music' ? 'bg-green-400' : 'bg-yellow-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{track.name}</p>
                            <p className="text-xs text-muted-foreground">{track.type} • {track.duration}s</p>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Play className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <style jsx>{`
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
