export type CharacterDef = {
  label: string;
  pageId: string;
  position: [number, number, number];
  glb_path?: string;
  background_path?: string;
  xRotationLock?: number;
};

export function getCharacters(spacing: number): CharacterDef[] {
  return [
    {
      background_path: "/background/background1.png",
      glb_path: "/glb/character1.glb",
      xRotationLock: -0.1,
      position: [0, -1, -10],
      label: "character_2",
      pageId: "character_2"
    },
    {
      background_path: "/background/background1.png",
      glb_path: "/glb/character1.glb", 
      xRotationLock: -0.1,
      position: [0, 1, -10], 
      label: "character_3", 
      pageId: "character_3"
    },
    { 
      background_path: "/background/background1.png", 
      glb_path: "/glb/character1.glb", 
      xRotationLock: -0.1,
      position: [1, 0, -10], 
      label: "character_4", 
      pageId: "character_4" 
    },
  ];
}



