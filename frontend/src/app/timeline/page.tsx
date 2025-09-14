"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectTimeline, Scene } from '@/components/project-timeline';
import { fetchTimelineData } from '@/lib/timelineApi';
import Link from "next/link";

export default function TimelinePage() {
  const [timelineData, setTimelineData] = useState<{ title: string; totalDuration: number; scenes: Scene[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadTimelineData = async () => {
      try {
        setLoading(true);
        const data = await fetchTimelineData();
        setTimelineData(data);
      } catch (err) {
        setError('Failed to load timeline data');
        console.error('Error loading timeline:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTimelineData();
  }, []);

  const handleSceneClick = (scene: Scene) => {
    router.push(`/timeline/${scene.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error || !timelineData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || 'Failed to load timeline'}</p>
          <Link href="/" className="text-primary hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card/50 backdrop-blur-sm border-b border-border px-4 py-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← Back to Home
        </Link>
      </div>
      <ProjectTimeline
        scenes={timelineData.scenes}
        onSceneClick={handleSceneClick}
        projectTitle={timelineData.title}
        totalDuration={timelineData.totalDuration}
      />
    </div>
  );
}
