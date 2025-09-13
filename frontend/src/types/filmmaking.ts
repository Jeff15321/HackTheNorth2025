export interface StoryboardFrame {
  id: string;
  imageUrl: string;
  description: string;
  duration: number; // in seconds
  cameraAngle?: string;
  lighting?: string;
  mood?: string;
}

export interface Dialogue {
  id: string;
  character: string;
  text: string;
  timestamp: number; // in seconds
  emotion?: string;
}

export interface Storyboard {
  id: string;
  title: string;
  description: string;
  frames: StoryboardFrame[];
  dialogues: Dialogue[];
  totalDuration: number; // in seconds
  thumbnail: string;
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  order: number;
  thumbnail: string;
  storyboard: Storyboard;
  status: 'draft' | 'in_progress' | 'completed' | 'review';
  tags: string[];
}

export interface Timeline {
  id: string;
  title: string;
  description: string;
  scenes: Scene[];
  totalDuration: number; // in seconds
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'production' | 'post_production' | 'completed';
}
