import type { ScribbleLine } from "@/components/ScribbleEditor";

export type ImageAgentRequest = {
  prompt: string;
  imageSrc: string;
  lines: ScribbleLine[];
};

export type ImageAgentResponse = {
  file_path: string;
  description: string;
};

export async function sendImageWithScribbles(_req: ImageAgentRequest): Promise<ImageAgentResponse> {
  // Placeholder for future API call
  // const res = await fetch('/api/your-endpoint', { ... })
  // const json = await res.json();
  // return json as ImageAgentResponse;

  return {
    file_path: "/images/cat1.jpg",
    description: "Dummy processed result: a calm feline gazes into the distance with quiet curiosity.",
  };
}


