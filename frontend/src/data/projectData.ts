import { projectApi } from '../utils/api';
import { setCurrentProject } from './characterData';
import { setCurrentProject as setScriptProject, loadProjectScript } from './scriptData';
import { setDirectorProject, loadConversationHistory, loadConversationContext } from './directorData';
import type { Project } from '../types/backend';

// Global project state
const projectState = {
  currentProject: null as Project | null,
  isLoading: false,
  projects: [] as Project[],
};

// Project creation and management
export async function createNewProject(data: {
  title: string;
  summary: string;
  plot?: string;
}): Promise<Project> {
  try {
    projectState.isLoading = true;
    const project = await projectApi.create(data);

    // Set as current project across all stores
    await setActiveProject(project);

    return project;
  } finally {
    projectState.isLoading = false;
  }
}

export async function setActiveProject(project: Project | string): Promise<Project> {
  const projectData = typeof project === 'string'
    ? await projectApi.getById(project)
    : project;

  projectState.currentProject = projectData;

  // Initialize all stores with the new project
  setCurrentProject(projectData.id);
  setScriptProject(projectData.id);
  setDirectorProject(projectData.id);

  // Load existing data
  await Promise.allSettled([
    loadProjectScript(projectData.id),
    loadConversationHistory(),
    loadConversationContext(),
  ]);

  return projectData;
}

export function getCurrentProject(): Project | null {
  return projectState.currentProject;
}

export function getCurrentProjectId(): string | null {
  return projectState.currentProject?.id || null;
}

export async function updateCurrentProject(updates: Partial<Project>): Promise<Project> {
  if (!projectState.currentProject) {
    throw new Error('No project selected');
  }

  const updatedProject = await projectApi.update(projectState.currentProject.id, updates);
  projectState.currentProject = updatedProject;

  return updatedProject;
}

// Project workflow helpers
export async function startNewFilmProject(): Promise<{
  project: Project;
  workflow: {
    step: number;
    description: string;
    nextActions: string[];
  };
}> {
  const project = await createNewProject({
    title: `Film Project ${new Date().toLocaleString()}`,
    summary: 'Created from frontend interface',
    plot: ''
  });

  return {
    project,
    workflow: {
      step: 1,
      description: 'Director Conversation',
      nextActions: [
        'Chat with the director about your film idea',
        'Develop characters and plot points',
        'Complete the conversation to generate characters'
      ]
    }
  };
}

export function getProjectWorkflowStatus(): {
  step: number;
  stepName: string;
  description: string;
  isComplete: boolean;
  nextActions: string[];
} {
  if (!projectState.currentProject) {
    return {
      step: 0,
      stepName: 'No Project',
      description: 'Create a new project to begin',
      isComplete: false,
      nextActions: ['Create New Project']
    };
  }

  // Determine workflow step based on project state
  const hasPlot = Boolean(projectState.currentProject.plot?.trim());

  if (!hasPlot) {
    return {
      step: 1,
      stepName: 'Director Conversation',
      description: 'Develop your film concept with the AI director',
      isComplete: false,
      nextActions: [
        'Chat with the director',
        'Define characters and plot',
        'Complete the conversation'
      ]
    };
  }

  return {
    step: 2,
    stepName: 'Script Enhancement & Production',
    description: 'Enhance script and generate scenes',
    isComplete: false,
    nextActions: [
      'Enhance the script',
      'Generate characters',
      'Generate scenes',
      'Create final video'
    ]
  };
}

// Scene generation workflow
export async function generateAllScenesWorkflow(): Promise<{
  success: boolean;
  jobIds: string[];
  message: string;
}> {
  if (!projectState.currentProject) {
    throw new Error('No project selected');
  }

  const { generateAllScenes } = await import('./characterData');

  try {
    const jobIds = await generateAllScenes();

    return {
      success: true,
      jobIds,
      message: `Started generation of 3 scenes (${jobIds.length} jobs created)`
    };
  } catch (error) {
    return {
      success: false,
      jobIds: [],
      message: error instanceof Error ? error.message : 'Failed to start scene generation'
    };
  }
}

// Character generation workflow
export async function generateCharactersWorkflow(characters: Array<{
  name: string;
  description: string;
  role?: string;
}>): Promise<{
  success: boolean;
  jobIds: string[];
  message: string;
}> {
  if (!projectState.currentProject) {
    throw new Error('No project selected');
  }

  const { generateAllCharacters } = await import('./characterData');

  try {
    const jobIds = await generateAllCharacters(characters);

    return {
      success: true,
      jobIds,
      message: `Started generation of ${characters.length} characters`
    };
  } catch (error) {
    return {
      success: false,
      jobIds: [],
      message: error instanceof Error ? error.message : 'Failed to start character generation'
    };
  }
}

// Video generation workflow
export async function generateVideoWorkflow(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!projectState.currentProject) {
    throw new Error('No project selected');
  }

  try {
    const result = await projectApi.confirmVideo(projectState.currentProject.id);

    return {
      success: true,
      message: `Video assembly started (Job ID: ${result.job_id})`
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to start video generation'
    };
  }
}

// Complete project status
export async function getCompleteProjectStatus(): Promise<{
  scenes: any[];
  characters: any[];
  objects: any[];
  frames: any[];
  completion_status: string;
}> {
  if (!projectState.currentProject) {
    throw new Error('No project selected');
  }

  return projectApi.getComplete(projectState.currentProject.id);
}

export function isProjectLoading(): boolean {
  return projectState.isLoading;
}

// Cleanup
export function resetProjectState() {
  projectState.currentProject = null;
  projectState.isLoading = false;
  projectState.projects = [];

  // Reset all related stores
  const { cleanup: cleanupCharacters } = require('./characterData');
  const { resetDirectorState } = require('./directorData');

  cleanupCharacters();
  resetDirectorState();
}