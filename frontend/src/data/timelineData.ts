import { Scene } from '@/components/project-timeline';

// Mock data for the timeline
const mockScenes: Scene[] = [
  {
    id: '1',
    title: 'Opening: The Discovery',
    order: 1,
    status: 'generated',
    thumbnailUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=300&fit=crop',
    duration: 8,
    description: 'A scientist discovers a mysterious artifact in a futuristic laboratory. The scene establishes the setting and introduces the main character.',
    metadata: {
      location: 'Quantum Research Lab',
      characters: ['Dr. Elena Vasquez', 'AI Assistant'],
      mood: 'Mysterious, Scientific',
      cameraWork: 'Wide establishing shot, close-up on artifact',
      lighting: 'Cool blue laboratory lighting',
      soundDesign: 'Ambient hum, electronic beeps',
      visualEffects: 'Holographic displays, particle effects'
    }
  },
  {
    id: '2',
    title: 'The Confrontation',
    order: 2,
    status: 'generated',
    thumbnailUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    duration: 8,
    description: 'The scientist confronts a mysterious figure who appears to be watching from the shadows. Tension builds as they exchange words.',
    metadata: {
      location: 'Underground Facility',
      characters: ['Dr. Elena Vasquez', 'Unknown Agent'],
      mood: 'Tense, Suspenseful',
      cameraWork: 'Medium shots, over-shoulder angles',
      lighting: 'Dim, dramatic shadows',
      soundDesign: 'Echoing footsteps, whispered dialogue',
      visualEffects: 'Minimal, focus on character interaction'
    }
  },
  {
    id: '3',
    title: 'Chase Through the City',
    order: 3,
    status: 'generating',
    thumbnailUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
    duration: 8,
    description: 'A high-speed chase through neon-lit city streets. The scientist pursues the mysterious figure through crowded urban environments.',
    metadata: {
      location: 'Neon City Streets',
      characters: ['Dr. Elena Vasquez', 'Pursued Agent'],
      mood: 'Fast-paced, Urgent',
      cameraWork: 'Handheld, dynamic tracking shots',
      lighting: 'Neon city lights, street lamps',
      soundDesign: 'Urban ambience, running footsteps',
      visualEffects: 'Motion blur, neon reflections'
    }
  },
  {
    id: '4',
    title: 'The Revelation',
    order: 4,
    status: 'needs-edits',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    duration: 8,
    description: 'The truth is revealed about the artifact and its connection to a larger conspiracy. The scientist must make a crucial decision.',
    metadata: {
      location: 'Secret Government Facility',
      characters: ['Dr. Elena Vasquez', 'Director Chen', 'Security Guards'],
      mood: 'Revelatory, Dramatic',
      cameraWork: 'Close-ups on faces, wide reveals',
      lighting: 'Harsh fluorescent, dramatic shadows',
      soundDesign: 'Revealing music, tense silence',
      visualEffects: 'Data visualization, holographic projections'
    }
  },
  {
    id: '5',
    title: 'The Escape',
    order: 5,
    status: 'generated',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    duration: 8,
    description: 'The scientist makes a daring escape from the facility, using the artifact\'s power to overcome obstacles.',
    metadata: {
      location: 'Government Facility Corridors',
      characters: ['Dr. Elena Vasquez', 'Security Personnel'],
      mood: 'Action-packed, Desperate',
      cameraWork: 'Dynamic action sequences, POV shots',
      lighting: 'Flashing alarms, emergency lighting',
      soundDesign: 'Alarms, gunfire, running',
      visualEffects: 'Energy blasts, security barriers'
    }
  },
  {
    id: '6',
    title: 'The Final Choice',
    order: 6,
    status: 'generated',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    duration: 8,
    description: 'The climax where the scientist must choose between destroying the artifact or using it to save the world.',
    metadata: {
      location: 'Rooftop Observatory',
      characters: ['Dr. Elena Vasquez', 'Director Chen'],
      mood: 'Climactic, Emotional',
      cameraWork: 'Epic wide shots, intimate close-ups',
      lighting: 'Dawn light, city skyline',
      soundDesign: 'Emotional score, city ambience',
      visualEffects: 'Energy vortex, city-wide effects'
    }
  }
];

export const mockProjectData = {
  title: 'The Quantum Conspiracy',
  totalDuration: 48, // 6 scenes * 8 seconds each
  scenes: mockScenes
};

// Simulate API call with 2-second delay
export const fetchTimelineData = async (): Promise<typeof mockProjectData> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockProjectData);
    }, 2000);
  });
};

// Simulate API call for scene details
export const fetchSceneDetails = async (sceneId: string): Promise<Scene | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const scene = mockScenes.find(s => s.id === sceneId);
      resolve(scene || null);
    }, 2000);
  });
};
