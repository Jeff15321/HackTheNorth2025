export type CharacterDef = {
  label: string;
  pageId: string;
  color: string;
  position: [number, number, number];
  focusedOffset: [number, number];
};

export function getCharacters(spacing: number): CharacterDef[] {
  return [
    { position: [-spacing,  spacing / 2, 0], color: "#34D399", label: "character_1", pageId: "character_1", focusedOffset: [0, -spacing / 2] },
    { position: [0,         spacing / 2, 0], color: "#60A5FA", label: "character_2", pageId: "character_2", focusedOffset: [-spacing, -spacing / 2] },
    { position: [spacing,   spacing / 2, 0], color: "#F472B6", label: "character_3", pageId: "character_3", focusedOffset: [-2 * spacing, -spacing / 2] },
    { position: [-spacing, -spacing / 2, 0], color: "#F59E0B", label: "character_4", pageId: "character_4", focusedOffset: [0, spacing / 2] },
    { position: [0,        -spacing / 2, 0], color: "#A78BFA", label: "character_5", pageId: "character_5", focusedOffset: [-spacing, spacing / 2] },
    { position: [spacing,  -spacing / 2, 0], color: "#10B981", label: "character_6", pageId: "character_6", focusedOffset: [-2 * spacing, spacing / 2] },
  ];
}



