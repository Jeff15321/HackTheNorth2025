import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  const { nodeId } = params;

  // Mock data for each scene
  const mockNodeData: Record<string, any> = {
    "scene-1": {
      node: {
        id: "scene-1",
        kind: "scene" as const,
        title: "The Awakening",
        isStale: false,
        version: 1
      },
      children: [],
      artifacts: [
        {
          id: "frame-1",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-2", 
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-3",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-4",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-5",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        }
      ],
      latestGenerations: [
        {
          id: "gen-1",
          type: "frame_generation",
          status: "completed"
        }
      ]
    },
    "scene-2": {
      node: {
        id: "scene-2",
        kind: "scene" as const,
        title: "First Contact",
        isStale: false,
        version: 1
      },
      children: [],
      artifacts: [
        {
          id: "frame-6",
          kind: "frame_image",
          mimeType: "image/jpeg", 
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-7",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg", 
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-8",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-9",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-10",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-11",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        }
      ],
      latestGenerations: [
        {
          id: "gen-2",
          type: "frame_generation",
          status: "completed"
        }
      ]
    },
    "scene-3": {
      node: {
        id: "scene-3",
        kind: "scene" as const,
        title: "The Revelation",
        isStale: true,
        version: 1
      },
      children: [],
      artifacts: [
        {
          id: "frame-12",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-13",
          kind: "frame_image", 
          mimeType: "image/jpeg",
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-14",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-15",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-16",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-17",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/cat1.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        },
        {
          id: "frame-18",
          kind: "frame_image",
          mimeType: "image/jpeg",
          storageUrl: "/images/images.jpg",
          width: 1920,
          height: 1080,
          duration_sec: null
        }
      ],
      latestGenerations: [
        {
          id: "gen-3",
          type: "frame_generation",
          status: "in_progress"
        }
      ]
    }
  };

  const nodeData = mockNodeData[nodeId];
  
  if (!nodeData) {
    return NextResponse.json(
      { error: "Node not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(nodeData);
}
