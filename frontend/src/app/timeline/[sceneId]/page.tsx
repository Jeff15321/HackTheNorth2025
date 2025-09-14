"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { SceneStoryboard } from "@/components/scene-storyboard";
import { Scene } from "@/components/project-timeline";
import { fetchSceneDetails } from "@/lib/timelineApi";

export default function ScenePage() {
  const params = useParams();
  const router = useRouter();
  const [scene, setScene] = useState<Scene | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const sceneId = params.sceneId as string;

  useEffect(() => {
    const loadSceneData = async () => {
      try {
        setLoading(true);
        const sceneData = await fetchSceneDetails(sceneId);
        if (sceneData) {
          setScene(sceneData);
        } else {
          setError('Scene not found');
        }
      } catch (err) {
        setError('Failed to load scene data');
        console.error('Error loading scene:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSceneData();
  }, [sceneId]);

  const handleBack = () => {
    router.push('/timeline');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading scene...</p>
        </div>
      </div>
    );
  }

  if (error || !scene) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-destructive">Scene not found</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors"
          >
            Back to Timeline
          </button>
        </div>
      </div>
    );
  }

  return <SceneStoryboard scene={scene} onBack={handleBack} />;
}
