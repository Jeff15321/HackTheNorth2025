import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Project, Character, Scene, Object, Frame, CreateProject } from '../models/schemas';

let supabase: SupabaseClient;

export function initDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    }
  });

  console.log('🗄️  Database connection initialized');
  return supabase;
}

export function getDatabase() {
  if (!supabase) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return supabase;
}

export async function createProject(data: CreateProject): Promise<Project> {
  const db = getDatabase();
  const projectData = {
    ...data,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: project, error } = await db
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating project:', error);
    throw new Error(`Failed to create project: ${error.message}`);
  }

  console.log(`📁 Created project: ${project.title} (${project.id})`);
  return project;
}

export async function getProject(id: string): Promise<Project | null> {
  const db = getDatabase();
  const { data: project, error } = await db
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('❌ Error fetching project:', error);
    throw new Error(`Failed to fetch project: ${error.message}`);
  }

  return project;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const db = getDatabase();
  const { data: project, error } = await db
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating project:', error);
    throw new Error(`Failed to update project: ${error.message}`);
  }

  console.log(`✏️  Updated project: ${id}`);
  return project;
}

export async function createCharacter(character: Omit<Character, 'id'>): Promise<Character> {
  const db = getDatabase();
  const characterData = {
    ...character,
    id: crypto.randomUUID()
  };

  const { data, error } = await db
    .from('characters')
    .insert(characterData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating character:', error);
    throw new Error(`Failed to create character: ${error.message}`);
  }

  console.log(`👤 Created character: ${data.metadata.name} (${data.id})`);
  return data;
}

export async function getCharactersByProject(projectId: string): Promise<Character[]> {
  const db = getDatabase();
  const { data, error } = await db
    .from('characters')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('❌ Error fetching characters:', error);
    throw new Error(`Failed to fetch characters: ${error.message}`);
  }

  return data || [];
}

export async function createScene(scene: Omit<Scene, 'id'>): Promise<Scene> {
  const db = getDatabase();
  const sceneData = {
    ...scene,
    id: crypto.randomUUID()
  };

  const { data, error } = await db
    .from('scenes')
    .insert(sceneData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating scene:', error);
    throw new Error(`Failed to create scene: ${error.message}`);
  }

  console.log(`🎬 Created scene: ${data.id}`);
  return data;
}

export async function updateScene(sceneId: string, updates: Partial<Omit<Scene, 'id'>>): Promise<Scene> {
  const db = getDatabase();
  const { data, error } = await db
    .from('scenes')
    .update(updates)
    .eq('id', sceneId)
    .select()
    .single();

  if (error) {
    console.error('❌ Error updating scene:', error);
    throw new Error(`Failed to update scene: ${error.message}`);
  }

  console.log(`🎬 Updated scene: ${data.id}`);
  return data;
}

export async function getScenesByProject(projectId: string): Promise<Scene[]> {
  const db = getDatabase();
  const { data, error } = await db
    .from('scenes')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('❌ Error fetching scenes:', error);
    throw new Error(`Failed to fetch scenes: ${error.message}`);
  }

  return data || [];
}

export async function createObject(object: Omit<Object, 'id'>): Promise<Object> {
  const db = getDatabase();
  const objectData = {
    ...object,
    id: crypto.randomUUID()
  };

  const { data, error } = await db
    .from('objects')
    .insert(objectData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating object:', error);
    throw new Error(`Failed to create object: ${error.message}`);
  }

  console.log(`📦 Created object: ${data.metadata.type} (${data.id})${object.scene_id ? ` for scene ${object.scene_id}` : ''}`);
  return data;
}

export async function getObjectsByProject(projectId: string): Promise<Object[]> {
  const db = getDatabase();
  const { data, error } = await db
    .from('objects')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('❌ Error fetching objects:', error);
    throw new Error(`Failed to fetch objects: ${error.message}`);
  }

  return data || [];
}

export async function createFrame(frame: Omit<Frame, 'id'>): Promise<Frame> {
  const db = getDatabase();
  const frameData = {
    ...frame,
    id: crypto.randomUUID()
  };

  const { data, error } = await db
    .from('frames')
    .insert(frameData)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating frame:', error);
    throw new Error(`Failed to create frame: ${error.message}`);
  }

  console.log(`🎞️  Created frame: ${data.id}${frame.scene_id ? ` for scene ${frame.scene_id}` : ''}`);
  return data;
}

export async function getFramesByProject(projectId: string): Promise<Frame[]> {
  const db = getDatabase();
  const { data, error } = await db
    .from('frames')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('❌ Error fetching frames:', error);
    throw new Error(`Failed to fetch frames: ${error.message}`);
  }

  return data || [];
}

export async function getObjectsByScene(sceneId: string): Promise<Object[]> {
  const db = getDatabase();
  const { data, error } = await db
    .from('objects')
    .select('*')
    .eq('scene_id', sceneId);

  if (error) {
    console.error('❌ Error fetching objects by scene:', error);
    throw new Error(`Failed to fetch objects by scene: ${error.message}`);
  }

  return data || [];
}

export async function getFramesByScene(sceneId: string): Promise<Frame[]> {
  const db = getDatabase();
  const { data, error } = await db
    .from('frames')
    .select('*')
    .eq('scene_id', sceneId)
    .order('metadata->frame_order', { ascending: true });

  if (error) {
    console.error('❌ Error fetching frames by scene:', error);
    throw new Error(`Failed to fetch frames by scene: ${error.message}`);
  }

  return data || [];
}