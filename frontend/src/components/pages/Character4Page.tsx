"use client";

import { useEffect, useRef, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { songCategories, addSelectedId, removeSelectedId, isSelectedId, selected_id } from "@/data/songData";
import { selectSong, removeSong } from "@/lib/songsClient";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Play, Pause, Music, Trash2 } from "lucide-react";

export default function Character4Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);

  const [activeCategoryId, setActiveCategoryId] = useState<string>(songCategories[0]?.id || "");
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [selectionVersion, setSelectionVersion] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenersBoundRef = useRef(false);
  const [, setAudioUiVersion] = useState(0); // bump to force rerender on audio events

  const activeCategory = songCategories.find((c) => c.id === activeCategoryId) || songCategories[0];

  useEffect(() => {
    // Temporary: mark this page as completed on open until API is wired
    // In the future, move this to run only after a successful API call.
    useSceneStore.getState().setCompleted("character_4", true);
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  function bindAudioEventsOnce(audio: HTMLAudioElement) {
    if (listenersBoundRef.current) return;
    const bump = () => setAudioUiVersion((v) => v + 1);
    audio.addEventListener("play", bump);
    audio.addEventListener("pause", bump);
    audio.addEventListener("ended", bump);
    listenersBoundRef.current = true;
  }

  function togglePlay(songId: string, file: string) {
    const audio = audioRef.current || new Audio();
    if (!audioRef.current) {
      audioRef.current = audio;
      bindAudioEventsOnce(audio);
    } else if (!listenersBoundRef.current) {
      bindAudioEventsOnce(audioRef.current);
    }

    // If clicking the same song
    if (currentSongId === songId) {
      if (!audio.paused) {
        audio.pause();
      } else {
        audio.play();
      }
      setAudioUiVersion((v) => v + 1);
      return;
    }

    // Switching to another song: pause current, load new, and play
    audio.pause();
    audio.src = file;
    audio.currentTime = 0;
    audio.play();
    setCurrentSongId(songId);
    setAudioUiVersion((v) => v + 1);
  }

  function isPlaying(songId: string) {
    const audio = audioRef.current;
    return !!audio && !audio.paused && currentSongId === songId;
  }

  return (
    <div
      className="font-game"
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "80%",
        background: "var(--game-soft-white)",
        borderLeft: "1px solid var(--game-light-gray)",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.1)",
        padding: 20,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        color: "var(--game-charcoal)",
        borderRadius: "16px 0 0 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 className="font-game-bold" style={{ fontSize: 24, color: "var(--game-charcoal)" }}>MUSIC SELECTOR</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={reset}
          className="text-var(--game-charcoal) hover:bg-var(--game-orange) hover:text-var(--game-soft-white)"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs using shadcn Tabs component */}
      <Tabs value={activeCategoryId} onValueChange={setActiveCategoryId} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-4 rounded-xl" style={{ backgroundColor: 'var(--game-cream)', border: '2px solid var(--game-light-gray)' }}>
          {songCategories.slice(0, 6).map((cat, index) => {
            const colors = [
              'var(--game-orange)',      // Sci-Fi
              'var(--game-error)',       // Horror - red
              'var(--game-success)',     // Movies - green
              'var(--game-warning)',     // Action - orange
              'var(--game-orange)',      // Drama
              'var(--game-warm-orange)'  // Comedy
            ];
            const hoverColor = colors[index] || 'var(--game-orange)';
            
            return (
              <TabsTrigger 
                key={cat.id} 
                value={cat.id}
                className="font-game border-0 rounded-xl transition-all duration-200"
                style={{ 
                  color: 'var(--game-charcoal)',
                  backgroundColor: activeCategoryId === cat.id ? 'var(--game-orange)' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (activeCategoryId !== cat.id) {
                    e.currentTarget.style.backgroundColor = hoverColor;
                    e.currentTarget.style.color = 'var(--game-soft-white)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeCategoryId !== cat.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--game-charcoal)';
                  }
                }}
              >
                {cat.name}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {songCategories.length > 6 && (
          <TabsList className="grid w-full grid-cols-6 mb-4 rounded-xl" style={{ backgroundColor: 'var(--game-cream)', border: '2px solid var(--game-light-gray)' }}>
            {songCategories.slice(6, 12).map((cat, index) => {
              const colors = [
                'var(--game-warm-orange)', // Romance
                'var(--game-error)',       // Thriller - red
                'var(--game-success)',     // Documentary - green
                'var(--game-orange)',      // Fantasy
                'var(--game-warning)',     // Animation - orange
                'var(--game-orange)'       // Adventure
              ];
              const hoverColor = colors[index] || 'var(--game-orange)';
              
              return (
                <TabsTrigger 
                  key={cat.id} 
                  value={cat.id}
                  className="font-game border-0 rounded-xl transition-all duration-200"
                  style={{ 
                    color: 'var(--game-charcoal)',
                    backgroundColor: activeCategoryId === cat.id ? 'var(--game-orange)' : 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (activeCategoryId !== cat.id) {
                      e.currentTarget.style.backgroundColor = hoverColor;
                      e.currentTarget.style.color = 'var(--game-soft-white)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeCategoryId !== cat.id) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--game-charcoal)';
                    }
                  }}
                >
                  {cat.name}
                </TabsTrigger>
              );
            })}
          </TabsList>
        )}

        {/* Two-column: Left list, Right selected */}
        <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>
          {/* Left: list */}
          <div style={{
            flex: 1,
            border: "2px solid var(--game-light-gray)",
            borderRadius: 16,
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
            overflow: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {activeCategory?.songs.map((s) => (
                <li key={s.id} className="font-game" style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 12, 
                  padding: 16, 
                  borderBottom: "2px solid var(--game-light-gray)",
                  transition: "background 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--game-soft-white)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={isPlaying(s.id) ? "Pause" : "Play"}
                    onClick={() => togglePlay(s.id, s.file)}
                    className="font-game"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      background: isPlaying(s.id) ? "var(--game-orange)" : "var(--game-soft-white)",
                      color: isPlaying(s.id) ? "var(--game-soft-white)" : "var(--game-charcoal)",
                      border: "2px solid var(--game-light-gray)",
                    }}
                  >
                    {isPlaying(s.id) ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                    <div className="font-game-bold" style={{ fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                    <div className="font-game" style={{ fontSize: 14, color: "var(--game-dark-gray)", display: "flex", gap: 8 }}>
                      <span>{s.author}</span>
                      <span>•</span>
                      <span>{s.duration}</span>
                    </div>
                  </div>
                  <SongSelectButton songId={s.id} title={s.title} file={s.file} version={selectionVersion} onChange={() => setSelectionVersion((v) => v + 1)} />
                </li>
              ))}
            </ul>
          </div>

          {/* Right: selected songs */}
          <div style={{
            width: "40%",
            border: "2px solid var(--game-light-gray)",
            borderRadius: 16,
            background: "var(--game-cream)",
            color: "var(--game-charcoal)",
            overflow: "auto",
            padding: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}>
            <div className="font-game-bold" style={{ fontSize: 18, marginBottom: 16, color: "var(--game-charcoal)" }}>Selected Songs</div>
            {selected_id.length === 0 ? (
              <div className="font-game" style={{ opacity: 0.7, color: "var(--game-dark-gray)", textAlign: "center", padding: 20 }}>No songs selected yet.</div>
            ) : (
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {selected_id.map((entry) => (
                  <li key={String(entry.id)} className="font-game" style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 12, 
                    border: "2px solid var(--game-light-gray)", 
                    padding: 16, 
                    borderRadius: 12,
                    background: "var(--game-soft-white)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                  }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={isPlaying(String(entry.id)) ? "Pause" : "Play"}
                      onClick={() => togglePlay(String(entry.id), String((entry as any).file || ""))}
                      className="font-game"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        background: isPlaying(String(entry.id)) ? "var(--game-orange)" : "var(--game-cream)",
                        color: isPlaying(String(entry.id)) ? "var(--game-soft-white)" : "var(--game-charcoal)",
                        border: "2px solid var(--game-light-gray)",
                      }}
                    >
                      {isPlaying(String(entry.id)) ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </Button>
                    <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                      <div className="font-game-bold" style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{String((entry as any).title ?? entry.id)}</div>
                      {(entry as any).file && <div className="font-game" style={{ fontSize: 12, color: "var(--game-dark-gray)" }}>{String((entry as any).file)}</div>}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await removeSong({ songId: String(entry.id) });
                        } catch {}
                        removeSelectedId(String(entry.id));
                        setSelectionVersion((v) => v + 1);
                      }}
                      className="font-game text-var(--game-error) hover:bg-var(--game-error) hover:text-var(--game-soft-white)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Tabs>
    </div>
  );
}

type SongSelectButtonProps = { songId: string; title: string; file: string; onChange?: () => void; version?: number };
function SongSelectButton({ songId, title, file, onChange, version }: SongSelectButtonProps) {
  const [selected, setSelected] = useState<boolean>(isSelectedId(songId));

  // Sync local selected with global selected_id whenever version changes
  useEffect(() => {
    setSelected(isSelectedId(songId));
  }, [version, songId]);

  async function handleClick() {
    try {
      if (!selected) {
        await selectSong({ songId, title, file });
        addSelectedId(songId, { title, file });
        setSelected(true);
        // Mark this page as completed once any song is selected
        try { useSceneStore.getState().setCompleted("character_4", true); } catch {}
        onChange?.();
      } else {
        await removeSong({ songId });
        removeSelectedId(songId);
        setSelected(false);
        onChange?.();
      }
    } catch (e) {
      // no-op; backend not implemented
    }
  }

  return (
    <Button
      onClick={handleClick}
      variant={selected ? "default" : "outline"}
      className="font-game"
      style={{
        height: 40,
        padding: "0 16px",
        borderRadius: 12,
        background: selected ? "var(--game-orange)" : "var(--game-soft-white)",
        color: selected ? "var(--game-soft-white)" : "var(--game-charcoal)",
        border: selected ? "2px solid var(--game-orange)" : "2px solid var(--game-light-gray)",
        fontSize: 14,
        fontWeight: 500,
        whiteSpace: "nowrap",
        boxShadow: selected ? "0 4px 12px rgba(246, 183, 142, 0.3)" : "0 2px 8px rgba(0,0,0,0.1)",
        transition: "all 0.2s ease",
      }}
    >
      {selected ? "Deselect" : "Select"}
    </Button>
  );
}


