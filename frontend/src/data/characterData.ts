// scribble storage for character gallary

export type ScribbleLine = { points: number[]; color: string; size: number; erase?: boolean };

const scribbleMap: Record<string, ScribbleLine[]> = {};
let currentIndex = 0;

export function getScribblesForImage(imageSrc: string): ScribbleLine[] {
  return scribbleMap[imageSrc] || [];
}

export function setScribblesForImage(imageSrc: string, lines: ScribbleLine[]): void {
  scribbleMap[imageSrc] = lines || [];
}

export function getCurrentCharacterGallaryIndex(): number {
  return currentIndex;
}

export function setCurrentCharacterGallaryIndex(index: number): void {
  currentIndex = index;
}

// character gallery data

export type GalleryCategory = "characters" | "objects" | "scenes";

export const characterGallaryData: Record<GalleryCategory, characterGallaryDataEntry[]> = {
  characters: [
  {
    image: "/images/images.jpg",
    description:
      "A misty shoreline at dawn. The first light reveals hidden shapes and quiet motion in the waves.",
  },
  {
    image: "/images/images.jpg",
    description:
      "An old workshop desk with scattered notes and brass instruments, paused mid-experiment.",
  },
  {
    image: "/images/images.jpg",
    description:
      "A city alley glowing with neon. Reflections ripple across puddles after a sudden rain.",
  },
  {
    image: "/images/cat1.jpg",
    description:
      "A mountain pass under a violet sky. Thin air, long echoes, and the distant sound of wind.",
  },
],
  objects: [
    {
      image: "/images/cat1.jpg",
      description: "A vintage camera resting on a wooden shelf, its lens reflecting soft window light.",
    },
    {
      image: "/images/images.jpg",
      description: "A brass pocket watch with intricate engravings, stopped at midnight.",
    },
  ],
  scenes: [
    {
      image: "/images/images.jpg",
      description: "A quiet library aisle, dust motes dancing in the projector beam.",
    },
    {
      image: "/images/cat1.jpg",
      description: "A roadside diner at dusk, neon sign buzzing against a pink sky.",
    },
  ],
};



export type characterGallaryDataEntry = {
  image: string;
  description: string;
  loading?: boolean;
};


export function updateCharacterGalleryData(category: GalleryCategory, index: number, filePath: string, description: string) {
  (characterGallaryData as any)[category][index] = { image: filePath, description, loading: false };
}

export function setEntryLoading(category: GalleryCategory, index: number, value: boolean) {
  (characterGallaryData as any)[category][index] = { ...characterGallaryData[category][index], loading: value };
}

export function initializeAllLoadingFalse() {
  (Object.keys(characterGallaryData) as GalleryCategory[]).forEach((cat) => {
    for (let i = 0; i < characterGallaryData[cat].length; i++) {
      (characterGallaryData as any)[cat][i] = { ...characterGallaryData[cat][i], loading: false };
    }
  });
}
