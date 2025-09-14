import { projectApi, jobApi } from '../utils/api';

export const scriptStore = {
  scriptData: "",
  shouldAnimateScriptData: true,
  currentProject: null as string | null,
  isEnhancing: false,
  enhancedPlot: "",
  enhancedSummary: "",
};

export function setScriptDataValue(value: string) {
  scriptStore.scriptData = value;
}

export function setShouldAnimateScriptData(value: boolean) {
  scriptStore.shouldAnimateScriptData = value;
}

export function setCurrentProject(projectId: string | null) {
  scriptStore.currentProject = projectId;
}

export function setEnhancedContent(plot: string, summary: string) {
  scriptStore.enhancedPlot = plot;
  scriptStore.enhancedSummary = summary;
  scriptStore.scriptData = plot; // Update the main script data
}

export async function enhanceScript(
  basePlot: string,
  characters: any[],
  targetScenes: number = 3
): Promise<{
  success: boolean;
  enhanced_plot: string;
  enhanced_summary: string;
}> {
  if (!scriptStore.currentProject) {
    throw new Error('No project selected');
  }

  try {
    scriptStore.isEnhancing = true;

    const result = await jobApi.enhanceScript({
      project_id: scriptStore.currentProject,
      base_plot: basePlot,
      characters_context: characters,
      target_scenes: targetScenes
    });

    if (result.success) {
      setEnhancedContent(result.enhanced_plot, result.enhanced_summary);
    }

    return result;
  } finally {
    scriptStore.isEnhancing = false;
  }
}

export async function loadProjectScript(projectId: string): Promise<string> {
  try {
    const project = await projectApi.getById(projectId);
    const plot = project.plot || '';

    scriptStore.scriptData = plot;
    scriptStore.enhancedPlot = plot;
    scriptStore.currentProject = projectId;

    return plot;
  } catch (error) {
    console.error('Failed to load project script:', error);
    throw error;
  }
}

export function isEnhancing(): boolean {
  return scriptStore.isEnhancing;
}

export function getEnhancedPlot(): string {
  return scriptStore.enhancedPlot;
}

export function getEnhancedSummary(): string {
  return scriptStore.enhancedSummary;
}

export function getCurrentProjectId(): string | null {
  return scriptStore.currentProject;
}