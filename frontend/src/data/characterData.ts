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

export let characterGallaryData: Record<GalleryCategory, characterGallaryDataEntry[]> = {
  // Use assets under /public. Paths are absolute from the web root
  characters: [
    {
      image: "/images/cat1.jpg",
      description: "A mischievous alley cat with bright eyes and plenty of attitude.",
      loading: false,
    },
    {
      image: "/images/images.jpg",
      description: "Portrait of a curious character, ready for a new adventure.",
      loading: false,
    },
  ],
  
  scenes: [
    {
      image: "/background/background3.png",
      description: "A rehearsal room with acoustic foam panels and studio vibes.",
      loading: false,
    },
    {
      image: "/background/map.png",
      description: "Map board for planning chase sequences across the city.",
      loading: false,
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

export function setCharacterGallaryData(data: Record<GalleryCategory, characterGallaryDataEntry[]>) {
  characterGallaryData = data;
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
