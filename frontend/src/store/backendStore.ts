import { create } from "zustand";

type BackendState = {
  apiBaseUrl: string;
  projectId: string | null;
  conversationId: string | null;
  setApiBaseUrl: (url: string) => void;
  setProjectId: (id: string | null) => void;
  setConversationId: (id: string | null) => void;
};

export const useBackendStore = create<BackendState>((set) => ({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000",
  projectId: null,
  conversationId: null,
  setApiBaseUrl: (url) => set({ apiBaseUrl: url }),
  setProjectId: (id) => set({ projectId: id }),
  setConversationId: (id) => set({ conversationId: id }),
}));


