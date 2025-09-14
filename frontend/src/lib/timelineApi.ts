export type Scene = {
  id: string;
  title: string;
  order: number;
  status: string;
  thumbnailUrl?: string;
  duration?: number;
  description?: string;
};

export async function fetchTimelineData(): Promise<{ title: string; totalDuration: number; scenes: Scene[] }> {
  // Placeholder: backend does not expose a timeline endpoint yet
  return { title: 'Project Timeline', totalDuration: 0, scenes: [] };
}

export async function fetchSceneDetails(_sceneId: string): Promise<Scene | null> {
  // Placeholder until backend exposes scenes endpoint
  return null;
}
