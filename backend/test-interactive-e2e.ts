import { spawn } from 'child_process';
import * as readline from 'readline';
import { configDotenv } from 'dotenv';

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
  dialogue: string;
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
          } else if (sanitized[key].includes('supabase')) {
            sanitized[key] = '[SUPABASE_URL: truncated]';
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

      return await response.json() as APIResponse;
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
    const startTime = Date.now();

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

      // Log total duration
      const endTime = Date.now();
      const totalDuration = (endTime - startTime) / 1000; // Convert to seconds
      InteractiveLogger.success(`⏱️  TOTAL E2E TEST DURATION: ${totalDuration.toFixed(2)} seconds`);

    } catch (error) {
      const endTime = Date.now();
      const totalDuration = (endTime - startTime) / 1000; // Convert to seconds
      InteractiveLogger.error('Test failed', error);
      InteractiveLogger.error(`⏱️  TEST DURATION BEFORE FAILURE: ${totalDuration.toFixed(2)} seconds`);
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

    while (!conversationComplete) {
      InteractiveLogger.prompt('Talk to the AI Director about your film idea');
      const userInput = await this.console.ask('Your message');

      const directorResponse = await this.api.call('POST', '/api/director/converse', {
        project_id: this.results.projectId,
        message: userInput
      });

      InteractiveLogger.info('Director says:');
      console.log(`\n${colors.magenta}${directorResponse.response}${colors.reset}\n`);

      // Show generated plot points and characters
      if (directorResponse.plot_points && directorResponse.plot_points.length > 0) {
        InteractiveLogger.success('📖 Current Plot Points:');
        directorResponse.plot_points.forEach((point: string, i: number) => {
          console.log(`  ${colors.cyan}${i + 1}.${colors.reset} ${point}`);
        });
        console.log();
      }

      if (directorResponse.characters && directorResponse.characters.length > 0) {
        InteractiveLogger.success('👥 Current Characters:');
        directorResponse.characters.forEach((char: any, i: number) => {
          console.log(`  ${colors.cyan}${i + 1}. ${char.name}${colors.reset}`);
          console.log(`     Role: ${char.role || 'Not specified'}`);
          console.log(`     Description: ${char.description}`);
          if (char.age && char.age > 0) {
            console.log(`     Age: ${char.age}`);
          }
          if (char.personality) {
            console.log(`     Personality: ${char.personality}`);
          }
          if (char.backstory) {
            console.log(`     Backstory: ${char.backstory}`);
          }
          console.log();
        });
      }

      // Check if conversation is complete
      if (directorResponse.is_complete && directorResponse.characters && directorResponse.characters.length > 0) {
        InteractiveLogger.success('🎬 Film concept is complete!');
        console.log(`\n${colors.green}Next step: ${directorResponse.next_step}${colors.reset}\n`);

        const proceed = await this.console.confirm('Proceed with character generation?');
        if (proceed) {
          conversationComplete = true;
        }
      } else if (directorResponse.is_complete && (!directorResponse.characters || directorResponse.characters.length === 0)) {
        InteractiveLogger.info('🎬 Plot is complete, but no characters generated yet.');
        console.log(`\n${colors.yellow}Status: ${directorResponse.next_step}${colors.reset}\n`);
        console.log(`${colors.cyan}Ask the director to generate characters for your film.${colors.reset}\n`);
      } else {
        console.log(`\n${colors.yellow}Status: ${directorResponse.next_step}${colors.reset}\n`);
      }
    }
  }

  private async testCharacterGeneration() {
    InteractiveLogger.heading('👥 LEVEL 2: CHARACTER GENERATION');

    // Get conversation context from Redis to get character metadata
    const conversationId = `project_${this.results.projectId}`;
    const contextResponse = await this.api.call('GET', `/api/director/conversations/${conversationId}`);


    if (!contextResponse || !contextResponse.character_suggestions) {
      InteractiveLogger.error('No conversation context found. Please complete the director conversation first.');
      return;
    }

    const characters = contextResponse.character_suggestions || [];

    if (characters.length === 0) {
      InteractiveLogger.error('No characters found in context. Please complete the director conversation first.');
      return;
    }

    InteractiveLogger.info(`Found ${characters.length} characters to generate`);

    for (const charData of characters) {
      InteractiveLogger.info(`Generating character: ${charData.name}`);

      // Build a detailed prompt with all available character data
      let characterPrompt = `${charData.name}: ${charData.description}`;
      if (charData.role) characterPrompt += `. Role: ${charData.role}`;
      if (charData.age && charData.age > 0) characterPrompt += `. Age: ${charData.age}`;
      if (charData.personality) characterPrompt += `. Personality: ${charData.personality}`;
      if (charData.backstory) characterPrompt += `. Backstory: ${charData.backstory}`;

      const jobResponse = await this.api.call('POST', '/api/jobs/character-generation', {
        project_id: this.results.projectId,
        prompt: characterPrompt,
        context: {
          plot: contextResponse.plot_outline || '',
          character_metadata: charData
        }
      });

      if (!jobResponse.job_id) {
        InteractiveLogger.error(`Failed to create job for character: ${charData.name}`);
        continue;
      }
      const jobResult = await this.monitor.waitForCompletion(jobResponse.job_id);

      if (jobResult.output_data?.character_id) {
        const character = {
          id: jobResult.output_data.character_id,
          ...jobResult.output_data.character_data
        };
        this.results.characters.push(character);
        
        InteractiveLogger.success(`Character generated: ${character.name}`);
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
          const char = this.results.characters[charIndex]!;
          console.log('\n📝 Character Details:');
          console.log(`  Name: ${char.name}`);
          console.log(`  Description: ${char.description}`);
          console.log(`  Personality: ${char.personality}`);
          console.log(`  Age: ${char.age}`);
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

    const projectResponse = await this.api.call('GET', `/api/projects/${this.results.projectId}`);

    if (!projectResponse.plot) {
      InteractiveLogger.error('No plot found in project. Please complete the director conversation first.');
      return;
    }

    InteractiveLogger.info('Plot from director conversation:');
    console.log(`\n${colors.cyan}${projectResponse.plot}${colors.reset}\n`);
    
    // Generate multiple scenes in parallel
    InteractiveLogger.info('Generating multiple scenes in parallel...');
    
    const numScenes = 3; // Generate 3 scenes in parallel
    const scenePromises = [];
    
    for (let i = 0; i < numScenes; i++) {
      const scenePromise = this.generateSingleScene(projectResponse.plot, i);
      scenePromises.push(scenePromise);
    }
    
    // Wait for all scenes to complete
    const sceneResults = await Promise.allSettled(scenePromises);
    
    // Process results
    let successCount = 0;
    for (const result of sceneResults) {
      if (result.status === 'fulfilled' && result.value) {
        this.results.scenes.push(result.value);
        successCount++;
        InteractiveLogger.success(`Scene created: ${result.value.title}`);
      } else {
        InteractiveLogger.error('Failed to generate scene:', result.status === 'rejected' ? result.reason : 'Unknown error');
      }
    }

    InteractiveLogger.success(`Generated ${successCount} scenes successfully`);
  }

  private async generateSingleScene(plot: string, sceneIndex: number): Promise<Scene | null> {
    try {
      const sceneJobResponse = await this.api.call('POST', '/api/jobs/scene-generation', {
        project_id: this.results.projectId,
        scene_description: `Generate scene ${sceneIndex + 1} for the following plot: ${plot}`,
        characters_context: JSON.stringify(this.results.characters),
        plot_context: plot
      });

      if (!sceneJobResponse.job_id) {
        InteractiveLogger.error(`Failed to create scene generation job for scene ${sceneIndex + 1}`);
        return null;
      }

      const sceneJobResult = await this.monitor.waitForCompletion(sceneJobResponse.job_id);

      // Handle the actual output structure from scene generation
      if (sceneJobResult.output_data?.scene_id && sceneJobResult.output_data?.scene_data) {
        const sceneData = sceneJobResult.output_data.scene_data;
        const sceneTitle = sceneData.title || `Scene ${sceneIndex + 1}`;
        
        // Generate scene image using object-generation endpoint
        const imageJobResponse = await this.api.call('POST', '/api/jobs/object-generation', {
          project_id: this.results.projectId,
          scene_id: sceneJobResult.output_data.scene_id,
          prompt: sceneData.detailed_plot || sceneData.concise_plot,
          object_type: 'scene',
          environmental_context: sceneData.detailed_plot || sceneData.concise_plot,
          context: sceneData
        });

        if (!imageJobResponse.job_id) {
          InteractiveLogger.error(`Failed to create image job for scene: ${sceneTitle}`);
          return null;
        }

        const imageJobResult = await this.monitor.waitForCompletion(imageJobResponse.job_id);

        if (imageJobResult.output_data?.object_id) {
          return {
            id: sceneJobResult.output_data.scene_id,
            title: sceneTitle,
            description: sceneData.detailed_plot || sceneData.concise_plot,
            concise_plot: sceneData.concise_plot,
            detailed_plot: sceneData.detailed_plot,
            dialogue: sceneData.dialogue,
            scene_order: sceneData.scene_order || sceneIndex
          };
        }
      }
      
      return null;
    } catch (error) {
      InteractiveLogger.error(`Error generating scene ${sceneIndex + 1}:`, error);
      return null;
    }
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
    const objectJobResponse = await this.api.call('POST', '/api/jobs/object-generation', {
      project_id: this.results.projectId,
      scene_id: scene.id,
      prompt: scene.description,
      object_type: 'scene_objects',
      environmental_context: scene.description,
      context: {
        characters: this.results.characters
      }
    });

    if (!objectJobResponse.job_id) {
      InteractiveLogger.error('Failed to create object generation job');
      return;
    }
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

      if (!jobResponse.job_id) {
        console.error(`Failed to create object generation job for: ${objData.description}`);
        return null;
      }
      return this.monitor.waitForCompletion(jobResponse.job_id);
    });

    const objectResults = await Promise.all(objectPromises);
    const sceneObjects = objectResults
      .filter(r => r && r.output_data?.object_id)
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
    const frameJobResponse = await this.api.call('POST', '/api/jobs/frame-generation', {
      project_id: this.results.projectId,
      scene_id: scene.id,
      scene_description: scene.description,
      scene_plot: scene.detailed_plot,
      context: {
        characters: this.results.characters,
        objects: this.results.objectsByScene.get(scene.id) || []
      }
    });

    if (!frameJobResponse.job_id) {
      InteractiveLogger.error('Failed to create frame analysis job');
      return;
    }
    const frameJobResult = await this.monitor.waitForCompletion(frameJobResponse.job_id);
    const framesToGenerate = frameJobResult.output_data?.frames || [];

    InteractiveLogger.info(`Generating ${framesToGenerate.length} frames...`);

    const frames = [];
    for (let i = 0; i < framesToGenerate.length; i++) {
      const frameData = framesToGenerate[i];
      InteractiveLogger.info(`Generating frame ${i + 1}/${framesToGenerate.length}`);

      // Generate frame image using object-generation endpoint
      const imageJobResponse = await this.api.call('POST', '/api/jobs/object-generation', {
        project_id: this.results.projectId,
        scene_id: scene.id,
        prompt: frameData.veo3_prompt,
        object_type: 'frame',
        environmental_context: `Frame ${i + 1} of scene: ${scene.description}`,
        context: {
          ...frameData,
          frame_order: i
        }
      });

      if (!imageJobResponse.job_id) {
        InteractiveLogger.error(`Failed to create image job for frame ${i + 1}`);
        continue;
      }
      const imageJobResult = await this.monitor.waitForCompletion(imageJobResponse.job_id);

      if (imageJobResult.output_data?.object_id) {
        const frame = {
          id: imageJobResult.output_data.object_id,
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
          prompt: frame.veo3_prompt
        });

        if (!videoJobResponse.job_id) {
          InteractiveLogger.error('Failed to create video generation job');
          continue;
        }
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
      // Log all server output for debugging
      console.log('🔍 [SERVER]', output.trim());
    });

    this.server.stderr.on('data', (data: Buffer) => {
      const error = data.toString();
      console.error('❌ [SERVER ERROR]', error.trim());
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
