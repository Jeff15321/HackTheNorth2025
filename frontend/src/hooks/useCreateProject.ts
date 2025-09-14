"use client";

import { useMutation } from "@tanstack/react-query";
import { createProject, CreateProjectRequest } from "@/lib/projectsClient";
import { useBackendStore } from "@/store/backendStore";

export function useCreateProject() {
  const setProjectId = useBackendStore((s) => s.setProjectId);
  return useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      setProjectId(project.id);
    },
  });
}



