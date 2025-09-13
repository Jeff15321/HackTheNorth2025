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

export const characterGallaryData: characterGallaryDataEntry[] = [
  {
    image: "/images/images.jpg",
    description:
      "A misty shoreline at dawn. The first light reveals hidden shapes and quiet motion in the waves.",
  },
  {
    image: "/images/cat1.jpg",
    description:
      "An old workshop desk with scattered notes and brass instruments, paused mid-experiment.",
  },
  {
    image: "/images/images.jpg",
    description:
      "A city alley glowing with neon. Reflections ripple across puddles after a sudden rain.",
  },
  {
    image: "/images/example-4.png",
    description:
      "A mountain pass under a violet sky. Thin air, long echoes, and the distant sound of wind.",
  },
];



export type characterGallaryDataEntry = {
  image: string;
  description: string;
};


export function updateCharacterGalleryData(index: number, filePath: string, description: string) {
  (characterGallaryData as any)[index] = { image: filePath, description };
}
