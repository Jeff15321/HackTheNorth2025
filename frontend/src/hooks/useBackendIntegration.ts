'use client';

import { useState, useCallback } from 'react';
import {
  getCurrentProject,
  setActiveProject,
  startNewFilmProject,
  getProjectWorkflowStatus,
  generateAllScenesWorkflow,
  generateCharactersWorkflow,
  generateVideoWorkflow,
  getCompleteProjectStatus,
} from '../data/projectData';
import {
  sendToDirector,
  getConversationHistory,
  getConversationStatus,
  isDirectorLoading,
  generateCharactersFromDirector,
} from '../data/directorData';
import {
  enhanceScript,
  isEnhancing,
  getEnhancedPlot,
  getEnhancedSummary,
} from '../data/scriptData';
import {
  getCurrentCharacters,
  getCurrentScenes,
  loadCharacters,
  loadScenes,
  isLoadingData,
} from '../data/characterData';
import type { Project } from '../types/backend';
import type { DirectorMessage, ConversationStatus } from '../data/directorData';
import type { BackendCharacter, BackendScene } from '../data/characterData';

// Project management hook
export function useProject() {
  const [currentProject, setCurrentProject] = useState<Project | null>(getCurrentProject());
  const [isLoading, setIsLoading] = useState(false);

  const createProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await startNewFilmProject();
      setCurrentProject(result.project);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProject = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      const project = await setActiveProject(projectId);
      setCurrentProject(project);
      return project;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getWorkflowStatus = useCallback(() => {
    return getProjectWorkflowStatus();
  }, []);

  return {
    currentProject,
    isLoading,
    createProject,
    loadProject,
    getWorkflowStatus,
  };
}

// Director conversation hook
export function useDirector() {
  const [messages, setMessages] = useState<DirectorMessage[]>(getConversationHistory());
  const [status, setStatus] = useState<ConversationStatus>(getConversationStatus());
  const [isLoading, setIsLoading] = useState(isDirectorLoading());

  const sendMessage = useCallback(async (message: string, context?: any) => {
    setIsLoading(true);
    try {
      const response = await sendToDirector(message, context);

      // Update local state
      setMessages(getConversationHistory());
      setStatus(getConversationStatus());

      return response;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateCharacters = useCallback(async () => {
    return generateCharactersFromDirector();
  }, []);

  return {
    messages,
    status,
    isLoading,
    sendMessage,
    generateCharacters,
  };
}

// Script enhancement hook
export function useScript() {
  const [isEnhancingScript, setIsEnhancingScript] = useState(isEnhancing());
  const [enhancedPlot, setEnhancedPlot] = useState(getEnhancedPlot());
  const [enhancedSummary, setEnhancedSummary] = useState(getEnhancedSummary());

  const enhance = useCallback(async (basePlot: string, characters: any[]) => {
    setIsEnhancingScript(true);
    try {
      const result = await enhanceScript(basePlot, characters);

      setEnhancedPlot(getEnhancedPlot());
      setEnhancedSummary(getEnhancedSummary());

      return result;
    } finally {
      setIsEnhancingScript(false);
    }
  }, []);

  return {
    isEnhancing: isEnhancingScript,
    enhancedPlot,
    enhancedSummary,
    enhance,
  };
}

// Characters and scenes data hook
export function useProjectData() {
  const [characters, setCharacters] = useState<BackendCharacter[]>(getCurrentCharacters());
  const [scenes, setScenes] = useState<BackendScene[]>(getCurrentScenes());
  const [isLoading, setIsLoading] = useState(isLoadingData());

  const refreshCharacters = useCallback(async () => {
    setIsLoading(true);
    try {
      const chars = await loadCharacters();
      setCharacters(chars);
      return chars;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshScenes = useCallback(async () => {
    setIsLoading(true);
    try {
      const scns = await loadScenes();
      setScenes(scns);
      return scns;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateCharacters = useCallback(async (characterData: Array<{
    name: string;
    description: string;
    role?: string;
  }>) => {
    return generateCharactersWorkflow(characterData);
  }, []);

  const generateScenes = useCallback(async () => {
    return generateAllScenesWorkflow();
  }, []);

  const generateVideo = useCallback(async () => {
    return generateVideoWorkflow();
  }, []);

  const getCompleteStatus = useCallback(async () => {
    return getCompleteProjectStatus();
  }, []);

  // Removed auto-refresh to prevent excessive polling
  // The Character3Page component now handles its own polling

  return {
    characters,
    scenes,
    isLoading,
    refreshCharacters,
    refreshScenes,
    generateCharacters,
    generateScenes,
    generateVideo,
    getCompleteStatus,
  };
}

// Image editing hook
export function useImageEditing() {
  const [activeJobs, setActiveJobs] = useState<Map<string, any>>(new Map());

  const editImage = useCallback(async (params: {
    projectId: string;
    sourceUrl: string;
    editPrompt: string;
    metadata?: any;
  }) => {
    const { editImage } = await import('../utils/imageEditing');
    const jobId = await editImage(params);

    // Start polling for this job
    const { imageEditingRefreshManager } = await import('../utils/imageEditing');
    imageEditingRefreshManager.startPolling(jobId, (job) => {
      setActiveJobs(prev => new Map(prev.set(jobId, job)));
    });

    return jobId;
  }, []);

  const editCharacterImage = useCallback(async (params: {
    projectId: string;
    characterId: string;
    sourceUrl: string;
    editPrompt: string;
    metadata?: any;
  }) => {
    const { editCharacterImage } = await import('../utils/imageEditing');
    const jobId = await editCharacterImage(params);

    // Start polling for this job
    const { imageEditingRefreshManager } = await import('../utils/imageEditing');
    imageEditingRefreshManager.startPolling(jobId, (job) => {
      setActiveJobs(prev => new Map(prev.set(jobId, job)));
    });

    return jobId;
  }, []);

  const refreshJob = useCallback(async (jobId: string) => {
    const { checkEditingJobStatus } = await import('../utils/imageEditing');
    const job = await checkEditingJobStatus(jobId);
    setActiveJobs(prev => new Map(prev.set(jobId, job)));
    return job;
  }, []);

  const getJob = useCallback((jobId: string) => {
    return activeJobs.get(jobId);
  }, [activeJobs]);

  return {
    activeJobs: Array.from(activeJobs.values()),
    editImage,
    editCharacterImage,
    refreshJob,
    getJob,
  };
}

// Combined hook for complete backend integration
export function useBackendIntegration() {
  const project = useProject();
  const director = useDirector();
  const script = useScript();
  const projectData = useProjectData();
  const imageEditing = useImageEditing();

  return {
    project,
    director,
    script,
    projectData,
    imageEditing,
  };
}