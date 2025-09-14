import { api } from "@/lib/apiClient";
import { DirectorInitialResponseSchema } from "@/types/backend";

export async function talkToScriptAgent(prompt: string): Promise<string> {
  const res = await api.post<any>(`/api/director/initial`, {
    user_concept: prompt,
  });
  const parsed = DirectorInitialResponseSchema.safeParse(res);
  if (parsed.success) {
    // Return the director's textual response for display
    return parsed.data.director_response;
  }
  // Fallback to string if backend returns plain text in the future
  if (typeof res === 'string') return res;
  return JSON.stringify(res);
}