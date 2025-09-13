export type CharacterDef = {
  label: string;
  pageId: string;
  position: [number, number, number];
  glb_path?: string;
};

export function getCharacters(spacing: number): CharacterDef[] {
  return [
    { glb_path: "/glb/character1.glb", position: [0, 0, 0], label: "character_2", pageId: "character_2" },
    { glb_path: "/glb/character1.glb", position: [spacing, 0, 0], label: "character_3", pageId: "character_3" },
    { glb_path: "/glb/character1.glb", position: [-spacing, 0, 0],  label: "character_4", pageId: "character_4" },
  ];
}



