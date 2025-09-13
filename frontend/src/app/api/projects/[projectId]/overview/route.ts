import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const { projectId } = params;

  // Mock data based on the sample timeline
  const mockOverview = {
    project: {
      id: projectId,
      title: "The Digital Awakening"
    },
    nodes: [
      {
        id: "scene-1",
        kind: "scene" as const,
        parentId: null,
        orderIndex: 1,
        title: "The Awakening",
        isStale: false,
        version: 1
      },
      {
        id: "scene-2", 
        kind: "scene" as const,
        parentId: null,
        orderIndex: 2,
        title: "First Contact",
        isStale: false,
        version: 1
      },
      {
        id: "scene-3",
        kind: "scene" as const,
        parentId: null,
        orderIndex: 3,
        title: "The Revelation",
        isStale: true,
        version: 1
      }
    ],
    artifacts: [
      {
        id: "artifact-1",
        nodeId: "scene-1",
        kind: "frame_image",
        storageUrl: "/images/cat1.jpg"
      },
      {
        id: "artifact-2",
        nodeId: "scene-2", 
        kind: "frame_image",
        storageUrl: "/images/images.jpg"
      },
      {
        id: "artifact-3",
        nodeId: "scene-3",
        kind: "frame_image", 
        storageUrl: "/images/cat1.jpg"
      }
    ],
    stats: {
      totalScenes: 3,
      totalDuration: 1800
    }
  };

  return NextResponse.json(mockOverview);
}
