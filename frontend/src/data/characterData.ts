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
  characters: [],
  objects: [],
  scenes: [],
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
