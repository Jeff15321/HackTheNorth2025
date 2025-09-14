import { api } from "@/lib/apiClient";
import { z } from "zod";
import { ProjectSchema, type Project } from "@/types/backend";

export const CreateProjectRequest = z.object({
  title: z.string().min(1),
  summary: z.string().default(""),
  plot: z.string().optional(),
});

export async function createProject(input: z.infer<typeof CreateProjectRequest>): Promise<Project> {
  const res = await api.post<any>(`/api/projects`, input);
  return ProjectSchema.parse(res);
}

export async function getProject(id: string): Promise<Project | null> {
  try {
    const res = await api.get<any>(`/api/projects/${id}`);
    return ProjectSchema.parse(res);
  } catch {
    return null;
  }
}


