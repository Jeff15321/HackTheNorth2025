import { useMemo } from "react";
import { useBackendStore } from "@/store/backendStore";
import { createApiClient } from "@/lib/apiClient";

export function useBackendApi() {
  const baseUrl = useBackendStore((s) => s.apiBaseUrl);
  return useMemo(() => createApiClient({ baseUrl }), [baseUrl]);
}


