"use client";

import { useEffect, useRef, useState } from "react";
import { useSceneStore } from "@/store/useSceneStore";
import { themeCharacter1, colors } from "@/styles/colors";
import { songCategories, addSelectedId, removeSelectedId, isSelectedId } from "@/data/songData";
import { selectSong, removeSong } from "@/lib/songsClient";

export default function Character4Page() {
  const reset = useSceneStore((s) => s.resetSelectionAndCamera);

  const textColor = themeCharacter1.text;
  const borderColor = themeCharacter1.border;
  const backgroundColor = themeCharacter1.background;

  const [activeCategoryId, setActiveCategoryId] = useState<string>(songCategories[0]?.id || "");
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const listenersBoundRef = useRef(false);
  const [, setAudioUiVersion] = useState(0); // bump to force rerender on audio events

  const activeCategory = songCategories.find((c) => c.id === activeCategoryId) || songCategories[0];

  useEffect(() => {
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
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: "28rem",
        background: backgroundColor,
        borderLeft: "1px solid rgba(0,0,0,0.08)",
        boxShadow: `-8px 0 24px ${colors.shadow}`,
        padding: 16,
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        color: textColor,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>character_4</h2>
        <button style={{ border: `1px solid ${colors.borderLight}`, padding: "6px 10px", borderRadius: 6, background: colors.white }} onClick={reset}>
          Close
        </button>
      </div>

      {/* Tabs - horizontal scroll */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {songCategories.map((cat) => {
          const selected = cat.id === activeCategoryId;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
              style={{
                border: `1px solid ${selected ? borderColor : colors.borderLight}`,
                padding: "6px 10px",
                borderRadius: 16,
                background: selected ? colors.white : "transparent",
                color: selected ? borderColor : textColor,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{
        flex: 1,
        border: `1px solid ${colors.borderLight}`,
        borderRadius: 6,
        background: colors.white,
        color: borderColor,
        overflow: "auto",
      }}>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {activeCategory?.songs.map((s) => (
            <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderBottom: `1px solid ${colors.cardBorder}` }}>
              <button
                aria-label={isPlaying(s.id) ? "Pause" : "Play"}
                onClick={() => togglePlay(s.id, s.file)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  border: `1px solid ${colors.borderLight}`,
                  background: isPlaying(s.id) ? themeCharacter1.button : colors.white,
                  color: isPlaying(s.id) ? colors.white : borderColor,
                  cursor: "pointer",
                }}
              >
                {isPlaying(s.id) ? "❚❚" : "▶"}
              </button>
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
                <div style={{ fontSize: 12, opacity: 0.8, display: "flex", gap: 8 }}>
                  <span>{s.author}</span>
                  <span>•</span>
                  <span>{s.duration}</span>
                </div>
              </div>
              <SongSelectButton songId={s.id} title={s.title} file={s.file} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

type SongSelectButtonProps = { songId: string; title: string; file: string };
function SongSelectButton({ songId, title, file }: SongSelectButtonProps) {
  const [selected, setSelected] = useState<boolean>(isSelectedId(songId));

  async function handleClick() {
    try {
      if (!selected) {
        await selectSong({ songId, title, file });
        addSelectedId(songId, { title, file });
        setSelected(true);
      } else {
        await removeSong({ songId });
        removeSelectedId(songId);
        setSelected(false);
      }
    } catch (e) {
      // no-op; backend not implemented
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        border: `1px solid ${colors.borderLight}`,
        padding: "6px 10px",
        borderRadius: 6,
        background: selected ? themeCharacter1.button : colors.white,
        color: selected ? "#fff" : themeCharacter1.border,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {selected ? "Deselect" : "Select"}
    </button>
  );
}


