"use client";

import { useMemo, useState } from "react";
import { DuoButton, DuoEditOverlay } from "@/components/duolingo";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AnimatePresence, motion } from "framer-motion";

type SceneCard = {
  id: string;
  title: string;
  date: string;
  image: string;
  durationSec: number;
  frames: { title: string; description: string }[];
};

export default function DuoScenesPage() {
  const scenes: SceneCard[] = useMemo(
    () => [
      {
        id: "s1",
        title: "Scene 1",
        date: "2025-09-14",
        image: "/images/cat1.jpg",
        durationSec: 8,
        frames: [
          { title: "Frame A", description: "Establishing shot." },
          { title: "Frame B", description: "Character enters." },
          { title: "Frame C", description: "Dialogue starts." },
        ],
      },
      {
        id: "s2",
        title: "Scene 2",
        date: "2025-09-14",
        image: "/public/background/background1.png",
        durationSec: 10,
        frames: [
          { title: "Frame A", description: "Close-up reaction." },
          { title: "Frame B", description: "Wide pan." },
        ],
      },
      {
        id: "s3",
        title: "Scene 3",
        date: "2025-09-14",
        image: "/public/background/background2.png",
        durationSec: 12,
        frames: [
          { title: "Frame A", description: "Cutaway details." },
        ],
      },
    ],
    []
  );

  const [tab, setTab] = useState<"visual" | "chapters">("visual");
  const [selected, setSelected] = useState<{ sceneId: string; frameIndex: number } | null>(
    scenes.length ? { sceneId: scenes[0].id, frameIndex: 0 } : null
  );
  const selectedScene = scenes.find((s) => s.id === selected?.sceneId) ?? null;
  const [overlayOpen, setOverlayOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f1b20] text-white">
      {/* Breadcrumb + Title */}
      <div className="mx-auto max-w-6xl px-6 pt-6">
        <div className="mb-4 text-white/70 font-feather">Script › Characters › <span className="text-white">Scenes</span></div>
        <div className="font-feather text-[28px]">movie title</div>
      </div>

      {/* Tabs */}
      <div className="mx-auto mt-6 max-w-6xl px-6">
        <div className="flex gap-4">
          <button
            onClick={() => setTab("visual")}
            className={`font-feather rounded-[18px] px-5 py-3 text-[18px] ${
              tab === "visual" ? "bg-white/10 border border-white/20" : "bg-transparent border border-white/10 text-white/70"
            }`}
          >
            Visual
          </button>
          <button
            onClick={() => setTab("chapters")}
            className={`font-feather rounded-[18px] px-5 py-3 text-[18px] ${
              tab === "chapters" ? "bg-white/10 border border-white/20" : "bg-transparent border border-white/10 text-white/70"
            }`}
          >
            Chapters
          </button>
        </div>
      </div>

      {/* Content Card */}
      <div className="mx-auto mt-6 max-w-6xl rounded-[28px] border border-white/10 bg-white/5 p-6">
        {/* Selection banner - smooth, no layout jank */}
        {selectedScene && selected && (
          <div className="mb-4 sticky top-[76px] z-10">
            <motion.div
              layout
              initial={false}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="flex items-center justify-between rounded-[18px] border border-white/15 bg-[#1a2328] p-4 will-change-transform backdrop-blur-md"
            >
              <div className="flex items-center gap-4">
                <div className="h-16 w-24 overflow-hidden rounded-[12px] bg-black/40" />
                <div>
                  <div className="font-feather text-[22px]">{selectedScene.title} • {selectedScene.frames[selected.frameIndex]?.title ?? `Frame ${selected.frameIndex + 1}`}</div>
                  <div className="text-white/60">{selectedScene.date}</div>
                </div>
              </div>
              <DuoButton size="md" onClick={() => setOverlayOpen(true)}>Edit</DuoButton>
            </motion.div>
          </div>
        )}

        {tab === "visual" ? (
          <div className="space-y-10">
            {scenes.map((s, idx) => (
              <section key={s.id}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-feather text-[20px]">Scene {idx + 1}</div>
                  <div className="text-sm text-white/60">00:00 - {`00:${String(s.durationSec).padStart(2, "0")}`}</div>
                </div>
                <div className="h-px w-full bg-white/10 mb-4" />
                <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] gap-6 overflow-x-auto pb-2">
                  {s.frames.map((f, i) => (
                    <button
                      key={i}
                      onClick={() => setSelected({ sceneId: s.id, frameIndex: i })}
                      className={`rounded-[22px] border p-3 text-left ${
                        selected?.sceneId === s.id && selected.frameIndex === i
                          ? "border-[#2aa3ff] bg-white/8"
                          : "border-white/12 bg-white/5"
                      }`}
                    >
                      <div className="aspect-video w-full overflow-hidden rounded-[14px] bg-black/40" />
                      <div className="mt-2 font-feather text-[18px]">{f.title}</div>
                      <div className="mt-2 h-3 w-full rounded-full bg-white/10">
                        <div
                          className="h-3 rounded-full bg-[#8de21d]"
                          style={{ width: `${Math.min(100, (s.durationSec / 12) * 100)}%` }}
                        />
                      </div>
                      <div className="mt-1 text-sm text-white/60">00:00 - {`00:${String(s.durationSec).padStart(2, "0")}`}</div>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div>
            <Accordion type="single" collapsible className="w-full">
              {scenes.map((s) => (
                <AccordionItem key={s.id} value={s.id}>
                  <AccordionTrigger
                    onClick={() => setSelected({ sceneId: s.id, frameIndex: 0 })}
                    className="font-feather text-[20px]"
                  >
                    {s.title}
                    <span className="ml-2 text-sm text-white/60">00:00 - {`00:${String(s.durationSec).padStart(2, "0")}`}</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-3 gap-6">
                      {s.frames.map((f, i) => (
                        <button
                          key={i}
                          onClick={() => setSelected({ sceneId: s.id, frameIndex: i })}
                          className={`rounded-[18px] border p-4 text-left ${
                            selected?.sceneId === s.id && selected.frameIndex === i
                              ? "border-[#2aa3ff] bg-white/8"
                              : "border-white/12 bg-white/5"
                          }`}
                        >
                          <div className="mb-2 h-28 w-full rounded-[12px] bg-black/30" />
                          <div className="font-feather text-[18px]">{f.title}</div>
                          <div className="text-white/70 text-sm">{f.description}</div>
                        </button>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
      {selectedScene && (
        <DuoEditOverlay
          src={selectedScene.image}
          open={overlayOpen}
          onClose={() => setOverlayOpen(false)}
        />
      )}
    </div>
  );
}


