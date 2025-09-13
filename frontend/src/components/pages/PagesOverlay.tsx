"use client";

import { useSceneStore } from "@/store/useSceneStore";
import Character1Page from "@/components/pages/Character1Page";
import Character2Page from "@/components/pages/Character2Page";
import Character3Page from "@/components/pages/Character3Page";
import Character4Page from "@/components/pages/Character4Page";

export default function PagesOverlay() {
  const selectedPageId = useSceneStore((s) => s.selectedPageId);

  return (
    <>
      {selectedPageId === "character_1" && <Character1Page />}
      {selectedPageId === "character_2" && <Character2Page />}
      {selectedPageId === "character_3" && <Character3Page />}
      {selectedPageId === "character_4" && <Character4Page />}
      {selectedPageId === "character_5" && null}
      {selectedPageId === "character_6" && null}
    </>
  );
}
