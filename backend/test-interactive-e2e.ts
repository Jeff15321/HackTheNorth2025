import { spawn } from 'child_process';
import * as readline from 'readline';
import fetch, { FormData, File } from 'node-fetch';
import { configDotenv } from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

configDotenv();

// Types
type APIResponse = {
  job_id?: string;
  [key: string]: any;
};

type JobStatus = {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  output_data?: any;
  error_message?: string;
};

type Character = {
  id: string;
  name: string;
  description: string;
  personality: string;
  age: number;
};

type Scene = {
  id: string;
  title: string;
  description: string;
  concise_plot: string;
  detailed_plot: string;
  scene_order: number;
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Interactive console logger
class InteractiveLogger {
  static log(message: string, data?: any) {
    console.log(`${colors.blue}🔵${colors.reset} ${colors.dim}[${new Date().toISOString()}]${colors.reset} ${message}`);
    if (data) {
      // Sanitize data to exclude URLs
      const sanitized = this.sanitizeData(data);
      if (Object.keys(sanitized).length > 0) {
        console.log(JSON.stringify(sanitized, null, 2));
      }
    }
  }

  static success(message: string, data?: any) {
    console.log(`${colors.green}✅${colors.reset} ${colors.dim}[${new Date().toISOString()}]${colors.reset} ${colors.green}${message}${colors.reset}`);
    if (data) {
      const sanitized = this.sanitizeData(data);
      if (Object.keys(sanitized).length > 0) {
        console.log(JSON.stringify(sanitized, null, 2));
      }
    }
  }

  static error(message: string, error?: any) {
    console.log(`${colors.red}❌${colors.reset} ${colors.dim}[${new Date().toISOString()}]${colors.reset} ${colors.red}${message}${colors.reset}`);
    if (error) {
      console.error(error.message || error);
    }
  }

  static info(message: string) {
    console.log(`${colors.cyan}📦${colors.reset} ${colors.dim}[${new Date().toISOString()}]${colors.reset} ${colors.cyan}${message}${colors.reset}`);
  }

  static prompt(message: string) {
    console.log(`\n${colors.yellow}❓${colors.reset} ${colors.bright}${message}${colors.reset}`);
  }

  static heading(message: string) {
    console.log(`\n${colors.bgBlue}${colors.bright}${colors.white} ${message} ${colors.reset}\n`);
  }

  private static sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) return data;
    
    const sanitized = { ...data };
    const urlKeys = ['image_url', 'video_url', 'media_url', 'source_url', 'imageUrl', 'videoUrl'];
    
    for (const key of Object.keys(sanitized)) {
      if (urlKeys.includes(key)) {
        if (typeof sanitized[key] === 'string') {
          if (sanitized[key].startsWith('data:')) {
            sanitized[key] = '[DATA_URL: truncated]';
          } else if (sanitized[key].startsWith('http')) {
            sanitized[key] = '[EXTERNAL_URL: truncated]';
          }
        }
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }
    
    return sanitized;
  }
}

// Interactive console input
class ConsoleInput {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async ask(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(`${question}: `, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async confirm(question: string): Promise<boolean> {
    const answer = await this.ask(`${question} (y/n)`);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  async select(question: string, options: string[]): Promise<number> {
    console.log(`\n${question}`);
    options.forEach((option, index) => {
      console.log(`  ${colors.cyan}${index + 1})${colors.reset} ${option}`);
    });
    
    const answer = await this.ask('Select option');
    const selection = parseInt(answer);
    
    if (isNaN(selection) || selection < 1 || selection > options.length) {
      InteractiveLogger.error('Invalid selection. Please try again.');
      return this.select(question, options);
    }
    
    return selection - 1;
  }

  close() {
    this.rl.close();
  }
}

// API Client
class APIClient {
  constructor(private baseURL: string) {}

  async call(method: string, endpoint: string, body?: any): Promise<APIResponse> {
    const url = `${this.baseURL}${endpoint}`;
    
    InteractiveLogger.log(`${method} ${url}`, body ? { body_keys: Object.keys(body) } : undefined);

    try {
      const response = await fetch(url, {
        method,
        headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      return await response.json();
    } catch (error) {
      InteractiveLogger.error(`API call failed: ${endpoint}`, error);
      throw error;
    }
  }
}

// Job Monitor
class JobMonitor {
  constructor(private api: APIClient) {}

  async waitForCompletion(jobId: string, timeoutMs: number = 120000): Promise<JobStatus> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const status = await this.api.call('GET', `/api/jobs/${jobId}/status`);
      
      if (status.status === 'completed') {
        InteractiveLogger.success(`Job ${jobId} completed`, {
          output_keys: status.output_data ? Object.keys(status.output_data).filter(k => !['image_url', 'video_url'].includes(k)) : [],
          has_output: !!status.output_data
        });
        return status as JobStatus;
      }
      
      if (status.status === 'failed') {
        throw new Error(`Job ${jobId} failed: ${status.error_message}`);
      }
      
      // Show progress
      if (status.progress > 0) {
        process.stdout.write(`\r${colors.cyan}Progress: ${status.progress}%${colors.reset}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
  }
}

// Main Interactive E2E Test
class InteractiveE2ETest {
  private api: APIClient;
  private monitor: JobMonitor;
  private console: ConsoleInput;
  private server: any;
  
  private results = {
    projectId: '',
    characters: [] as Character[],
    scenes: [] as Scene[],
    objectsByScene: new Map<string, any[]>(),
    framesByScene: new Map<string, any[]>(),
    videosByFrame: new Map<string, string>()
  };

  constructor() {
    this.api = new APIClient('http://localhost:3000');
    this.monitor = new JobMonitor(this.api);
    this.console = new ConsoleInput();
  }

  async run() {
    try {
      await this.startServer();
      await this.waitForServerReady();

      InteractiveLogger.heading('🎬 INTERACTIVE FILM GENERATION E2E TEST');

      // Level 1: Director Conversation
      await this.testDirectorConversation();

      // Level 2: Character Generation
      await this.testCharacterGeneration();

      // Level 3: Scene Generation
      await this.testSceneGeneration();

      // Level 4: Object & Frame Generation (per scene)
      for (const scene of this.results.scenes) {
        await this.testSceneAssets(scene);
      }

      InteractiveLogger.heading('✨ FILM GENERATION COMPLETE!');
      this.printSummary();

    } catch (error) {
      InteractiveLogger.error('Test failed', error);
    } finally {
      this.cleanup();
    }
  }

  private async testDirectorConversation() {
    InteractiveLogger.heading('🎭 LEVEL 1: DIRECTOR CONVERSATION');

    // Create project
    InteractiveLogger.info('Creating new project...');
    const projectResponse = await this.api.call('POST', '/api/projects', {
      title: 'Interactive Film Project',
      summary: 'An AI-generated film created through interactive conversation'
    });

    this.results.projectId = projectResponse.id;
    InteractiveLogger.success(`Project created: ${this.results.projectId}`);

    // Director conversation loop
    let conversationComplete = false;
    let context: any = {};

    while (!conversationComplete) {
      InteractiveLogger.prompt('Talk to the AI Director about your film idea');
      const userInput = await this.console.ask('Your message');

      const directorResponse = await this.api.call('POST', '/api/director/converse', {
        project_id: this.results.projectId,
        message: userInput,
        context
      });

      InteractiveLogger.info('Director says:');
      console.log(`\n${colors.magenta}${directorResponse.response}${colors.reset}\n`);

      // Update context
      if (directorResponse.context) {
        context = { ...context, ...directorResponse.context };
      }

      // Check if we have plot and characters
      if (context.plot && context.characters && context.characters.length > 0) {
        InteractiveLogger.success('Plot and characters identified!');
        console.log('\n📖 Plot:', context.plot);
        console.log('\n👥 Characters:');
        context.characters.forEach((char: any, i: number) => {
          console.log(`  ${i + 1}. ${char.name} - ${char.description}`);
        });

        const proceed = await this.console.confirm('\nProceed with character generation?');
        if (proceed) {
          conversationComplete = true;
        }
      }
    }
  }

  private async testCharacterGeneration() {
    InteractiveLogger.heading('👥 LEVEL 2: CHARACTER GENERATION');

    const context = await this.getProjectContext();
    const characters = context.characters || [];

    for (const charData of characters) {
      InteractiveLogger.info(`Generating character: ${charData.name}`);

      const jobResponse = await this.api.call('POST', '/api/jobs/character-generation', {
        project_id: this.results.projectId,
        prompt: charData.description,
        name: charData.name,
        context: {}
      });

      const jobResult = await this.monitor.waitForCompletion(jobResponse.job_id);

      if (jobResult.output_data?.character_id) {
        const character = {
          id: jobResult.output_data.character_id,
          ...jobResult.output_data.character_data
        };
        this.results.characters.push(character);
        
        InteractiveLogger.success(`Character generated: ${character.name}`);
        console.log('\n📝 Character Details:');
        console.log(`  Name: ${character.name}`);
        console.log(`  Description: ${character.description}`);
        console.log(`  Personality: ${character.personality}`);
        console.log(`  Age: ${character.age}`);
      }
    }

    // Review characters
    let reviewing = true;
    while (reviewing) {
      const action = await this.console.select(
        '\nWhat would you like to do?',
        ['View character details', 'Edit a character', 'Continue to scene generation']
      );

      switch (action) {
        case 0: // View details
          const charIndex = await this.console.select(
            'Select character to view:',
            this.results.characters.map(c => c.name)
          );
          const char = this.results.characters[charIndex];
          console.log('\n📝 Character Details:');
          console.log(JSON.stringify(char, null, 2));
          break;

        case 1: // Edit character
          InteractiveLogger.info('Character editing not implemented in this demo');
          break;

        case 2: // Continue
          reviewing = false;
          break;
      }
    }
  }

  private async testSceneGeneration() {
    InteractiveLogger.heading('🎬 LEVEL 3: SCENE GENERATION');

    const context = await this.getProjectContext();
    
    // Generate scenes using AI
    InteractiveLogger.info('Generating scenes based on plot and characters...');
    
    const sceneJobResponse = await this.api.call('POST', '/api/jobs/scene-generation', {
      project_id: this.results.projectId,
      context: {
        plot: context.plot,
        characters: this.results.characters
      }
    });

    const sceneJobResult = await this.monitor.waitForCompletion(sceneJobResponse.job_id);

    if (sceneJobResult.output_data?.scenes) {
      for (const sceneData of sceneJobResult.output_data.scenes) {
        InteractiveLogger.info(`Creating scene: ${sceneData.title}`);

        // Generate scene image
        const imageJobResponse = await this.api.call('POST', '/api/jobs/image-generation', {
          project_id: this.results.projectId,
          prompt: sceneData.visual_description || sceneData.description,
          type: 'scenes',
          metadata: sceneData
        });

        const imageJobResult = await this.monitor.waitForCompletion(imageJobResponse.job_id);

        if (imageJobResult.output_data?.scene_id) {
          const scene = {
            id: imageJobResult.output_data.scene_id,
            ...sceneData
          };
          this.results.scenes.push(scene);

          InteractiveLogger.success(`Scene created: ${scene.title}`);
          console.log(`  📋 Concise Plot: ${scene.concise_plot}`);
          console.log(`  🎥 Scene Order: ${scene.scene_order}`);
        }
      }
    }

    InteractiveLogger.success(`Generated ${this.results.scenes.length} scenes`);
  }

  private async testSceneAssets(scene: Scene) {
    InteractiveLogger.heading(`🎬 PROCESSING SCENE: ${scene.title}`);

    // Generate objects for scene
    await this.generateSceneObjects(scene);

    // Generate frames for scene
    await this.generateSceneFrames(scene);
  }

  private async generateSceneObjects(scene: Scene) {
    InteractiveLogger.info('Determining objects needed for scene...');

    // Use LLM to determine objects
    const objectJobResponse = await this.api.call('POST', '/api/jobs/object-analysis', {
      project_id: this.results.projectId,
      scene_id: scene.id,
      scene_description: scene.description,
      context: {
        characters: this.results.characters
      }
    });

    const objectJobResult = await this.monitor.waitForCompletion(objectJobResponse.job_id);
    const objectsToGenerate = objectJobResult.output_data?.objects || [];

    InteractiveLogger.info(`Generating ${objectsToGenerate.length} objects in parallel...`);

    // Generate all objects in parallel
    const objectPromises = objectsToGenerate.map(async (objData: any) => {
      const jobResponse = await this.api.call('POST', '/api/jobs/object-generation', {
        project_id: this.results.projectId,
        scene_id: scene.id,
        prompt: objData.description,
        object_type: objData.type,
        environmental_context: objData.environmental_context || scene.description,
        context: {}
      });

      return this.monitor.waitForCompletion(jobResponse.job_id);
    });

    const objectResults = await Promise.all(objectPromises);
    const sceneObjects = objectResults
      .filter(r => r.output_data?.object_id)
      .map(r => ({
        id: r.output_data.object_id,
        ...r.output_data.object_data
      }));

    this.results.objectsByScene.set(scene.id, sceneObjects);
    InteractiveLogger.success(`Generated ${sceneObjects.length} objects for scene`);
  }

  private async generateSceneFrames(scene: Scene) {
    InteractiveLogger.info('Determining frames for scene...');

    // Use LLM to determine frames
    const frameJobResponse = await this.api.call('POST', '/api/jobs/frame-analysis', {
      project_id: this.results.projectId,
      scene_id: scene.id,
      scene_description: scene.description,
      scene_plot: scene.detailed_plot,
      context: {
        characters: this.results.characters,
        objects: this.results.objectsByScene.get(scene.id) || []
      }
    });

    const frameJobResult = await this.monitor.waitForCompletion(frameJobResponse.job_id);
    const framesToGenerate = frameJobResult.output_data?.frames || [];

    InteractiveLogger.info(`Generating ${framesToGenerate.length} frames...`);

    const frames = [];
    for (let i = 0; i < framesToGenerate.length; i++) {
      const frameData = framesToGenerate[i];
      InteractiveLogger.info(`Generating frame ${i + 1}/${framesToGenerate.length}`);

      // Generate frame image
      const imageJobResponse = await this.api.call('POST', '/api/jobs/image-generation', {
        project_id: this.results.projectId,
        prompt: frameData.veo3_prompt,
        type: 'frames',
        metadata: {
          ...frameData,
          scene_id: scene.id,
          frame_order: i
        }
      });

      const imageJobResult = await this.monitor.waitForCompletion(imageJobResponse.job_id);

      if (imageJobResult.output_data?.frame_id) {
        const frame = {
          id: imageJobResult.output_data.frame_id,
          ...frameData,
          frame_order: i
        };
        frames.push(frame);

        // Generate video for frame immediately
        InteractiveLogger.info('Generating Veo 3 video for frame...');
        const videoJobResponse = await this.api.call('POST', '/api/jobs/video-generation', {
          project_id: this.results.projectId,
          frame_id: frame.id,
          source_url: imageJobResult.output_data.image_url,
          prompt: frame.veo3_prompt,
          duration_seconds: frame.duration_constraint || 8
        });

        const videoJobResult = await this.monitor.waitForCompletion(videoJobResponse.job_id);
        
        if (videoJobResult.output_data?.video_url) {
          this.results.videosByFrame.set(frame.id, videoJobResult.output_data.video_url);
          InteractiveLogger.success(`Video generated for frame ${i + 1}`);
        }
      }
    }

    this.results.framesByScene.set(scene.id, frames);
    InteractiveLogger.success(`Generated ${frames.length} frames with videos for scene`);
  }

  private async getProjectContext() {
    const response = await this.api.call('GET', `/api/projects/${this.results.projectId}`);
    return response.context || {};
  }

  private printSummary() {
    console.log('\n' + '='.repeat(60));
    console.log(colors.bright + '📊 FILM GENERATION SUMMARY' + colors.reset);
    console.log('='.repeat(60));
    
    console.log(`\n📽️  Project ID: ${this.results.projectId}`);
    console.log(`👥 Characters: ${this.results.characters.length}`);
    console.log(`🎬 Scenes: ${this.results.scenes.length}`);
    
    let totalObjects = 0;
    let totalFrames = 0;
    let totalVideos = 0;

    for (const scene of this.results.scenes) {
      const objects = this.results.objectsByScene.get(scene.id) || [];
      const frames = this.results.framesByScene.get(scene.id) || [];
      totalObjects += objects.length;
      totalFrames += frames.length;
      
      console.log(`\n  Scene: ${scene.title}`);
      console.log(`    📦 Objects: ${objects.length}`);
      console.log(`    🖼️  Frames: ${frames.length}`);
      
      frames.forEach(frame => {
        if (this.results.videosByFrame.has(frame.id)) {
          totalVideos++;
        }
      });
    }

    console.log(`\n📦 Total Objects: ${totalObjects}`);
    console.log(`🖼️  Total Frames: ${totalFrames}`);
    console.log(`🎥 Total Videos: ${totalVideos}`);
    console.log('\n' + '='.repeat(60));
  }

  private async startServer() {
    InteractiveLogger.info('Starting backend server...');
    this.server = spawn('bun', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    this.server.stdout.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Server started on')) {
        InteractiveLogger.success('Server started successfully');
      }
    });

    this.server.stderr.on('data', (data: Buffer) => {
      console.error('Server error:', data.toString());
    });
  }

  private async waitForServerReady(maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await fetch('http://localhost:3000/health');
        return;
      } catch {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Server failed to start');
  }

  private cleanup() {
    InteractiveLogger.info('Cleaning up...');
    this.console.close();
    
    if (this.server) {
      this.server.kill();
      InteractiveLogger.info('Server stopped');
    }
  }
}

// Run the test
const test = new InteractiveE2ETest();
test.run().catch(console.error);
