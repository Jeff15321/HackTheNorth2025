import { fal } from '@fal-ai/client';

export function initFal() {
  const apiKey = process.env.FAL_KEY;

  if (!apiKey) {
    throw new Error('FAL_KEY environment variable is required');
  }

  fal.config({
    credentials: apiKey
  });

  console.log('🎬 fal.ai initialized');
}

export interface VideoGenerationOptions {
  aspect_ratio?: 'auto' | '16:9' | '9:16';
  duration?: '8s';
  generate_audio?: boolean;
  resolution?: '720p' | '1080p';
}

export async function generateVideoFromImage(
  imageUrl: string,
  prompt: string,
  options: VideoGenerationOptions = {}
): Promise<string> {
  try {
    console.log(`🎬 Generating video from image: ${prompt.substring(0, 50)}...`);

    const result = await fal.subscribe("fal-ai/veo3/fast/image-to-video", {
      input: {
        prompt: prompt,
        image_url: imageUrl,
        aspect_ratio: options.aspect_ratio || 'auto',
        duration: options.duration || '8s',
        generate_audio: options.generate_audio ?? true,
        resolution: options.resolution || '720p'
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs?.map((log: any) => log.message).forEach(console.log);
        }
      },
    });

    const videoUrl = result.data?.video?.url;
    
    if (!videoUrl) {
      console.error('API Response structure:', JSON.stringify(result.data, null, 2));
      throw new Error('No video URL found in result - check console for response structure');
    }

    console.log(`✅ Video generated: ${videoUrl}`);
    return videoUrl;
  } catch (error) {
    console.error('❌ Error generating video from image:', error);
    throw new Error(`Video generation from image failed: ${error}`);
  }
}

export async function generateVideoFromText(
  prompt: string,
  options: VideoGenerationOptions = {}
): Promise<string> {
  try {
    console.log(`🎬 Generating text-to-video: ${prompt.substring(0, 50)}...`);

    // Note: Veo 3 documentation only shows image-to-video
    // For text-to-video, we might need to use a different model or endpoint
    // Let's try the text-to-video endpoint first
    const result = await fal.subscribe("fal-ai/veo3/fast/text-to-video", {
      input: {
        prompt: prompt,
        aspect_ratio: options.aspect_ratio || 'auto',
        duration: options.duration || '8s',
        generate_audio: options.generate_audio ?? true,
        resolution: options.resolution || '720p'
      } as any,
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs?.map((log: any) => log.message).forEach(console.log);
        }
      },
    });

    const videoUrl = result.data?.video?.url;
    
    if (!videoUrl) {
      console.error('API Response structure:', JSON.stringify(result.data, null, 2));
      throw new Error('No video URL found in result - check console for response structure');
    }

    console.log(`✅ Video generated: ${videoUrl}`);
    return videoUrl;
  } catch (error) {
    console.error('❌ Error generating text-to-video:', error);
    throw new Error(`Text-to-video generation failed: ${error}`);
  }
}

async function waitForVideoResult(requestId: string, endpoint: string): Promise<string> {
  const maxWaitTime = 300000; // 5 minutes
  const pollInterval = 3000; // 3 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await fal.queue.status(endpoint, {
        requestId,
        logs: true,
      });

      console.log(`🔍 Job ${requestId} status: ${status.status}`);

      if (status.status === 'COMPLETED') {
        const result = await fal.queue.result(endpoint, {
          requestId
        });

    console.log('Full result:', JSON.stringify(result, null, 2));
    
    // According to Veo 3 documentation, video should be at result.data.video.url
    const videoUrl = result.data?.video?.url;
    
    if (!videoUrl) {
      console.error('API Response structure:', JSON.stringify(result.data, null, 2));
      throw new Error('No video URL found in result - check console for response structure');
    }

        console.log(`✅ Video generated: ${videoUrl}`);
        return videoUrl;
      }

      if ((status as any).error) {
        throw new Error(`Video generation failed: ${(status as any).error}`);
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.error('❌ Error polling for result:', error);
      throw error;
    }
  }

  throw new Error('Video generation timed out');
}

export async function generateVideoAsync(
  prompt: string,
  options: {
    imageUrl?: string;
    webhookUrl?: string;
  } & VideoGenerationOptions = {}
): Promise<string> {
  try {
    const { imageUrl, webhookUrl, ...videoOptions } = options;
    
    console.log(`🎬 Submitting async video generation: ${prompt.substring(0, 50)}...`);

    const endpoint = imageUrl ? "fal-ai/veo3/fast/image-to-video" : "fal-ai/veo3/fast/text-to-video";
    
    const input: any = {
      prompt: prompt,
      aspect_ratio: videoOptions.aspect_ratio || 'auto',
      duration: videoOptions.duration || '8s',
      generate_audio: videoOptions.generate_audio ?? true,
      resolution: videoOptions.resolution || '720p'
    };

    if (imageUrl) {
      input.image_url = imageUrl;
    }

    const { request_id } = await fal.queue.submit(endpoint, {
      input: input as any,
      webhookUrl
    });

    console.log(`✅ Video generation job submitted: ${request_id}`);
    return request_id;
  } catch (error) {
    console.error('❌ Error submitting video generation:', error);
    throw new Error(`Failed to submit video generation: ${error}`);
  }
}

export async function getVideoStatus(requestId: string, hasImage: boolean = false) {
  try {
    console.log(`🔍 Getting status for request: ${requestId}`);
    
    const endpoint = hasImage ? "fal-ai/veo3/fast/image-to-video" : "fal-ai/veo3/fast/text-to-video";
    
    const status = await fal.queue.status(endpoint, {
      requestId,
      logs: true
    });

    return {
      status: status.status,
      queue_position: (status as any).queue_position,
      logs: (status as any).logs || []
    };
  } catch (error) {
    console.error('❌ Error getting video status:', error);
    throw new Error(`Failed to get video status: ${error}`);
  }
}

export async function getVideoResult(requestId: string, hasImage: boolean = false): Promise<string> {
  try {
    console.log(`📥 Getting result for request: ${requestId}`);
    
    const endpoint = hasImage ? "fal-ai/veo3/fast/image-to-video" : "fal-ai/veo3/fast/text-to-video";
    
    const result = await fal.queue.result(endpoint, {
      requestId
    });

    console.log('Full result:', JSON.stringify(result, null, 2));
    
    // According to Veo 3 documentation, video should be at result.data.video.url
    const videoUrl = result.data?.video?.url;
    
    if (!videoUrl) {
      console.error('API Response structure:', JSON.stringify(result.data, null, 2));
      throw new Error('No video URL found in result - check console for response structure');
    }

    console.log(`✅ Video result retrieved: ${videoUrl}`);
    return videoUrl;
  } catch (error) {
    console.error('❌ Error getting video result:', error);
    throw new Error(`Failed to get video result: ${error}`);
  }
}

export async function downloadVideo(videoUrl: string): Promise<Buffer> {
  try {
    console.log(`⬇️  Downloading video from: ${videoUrl}`);

    const response = await fetch(videoUrl);

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`✅ Video downloaded: ${buffer.length} bytes`);

    return buffer;
  } catch (error) {
    console.error('❌ Error downloading video:', error);
    throw new Error(`Video download failed: ${error}`);
  }
}

export async function uploadFile(file: File | Buffer | Blob, fileName?: string): Promise<string> {
  try {
    console.log(`⬆️  Uploading file: ${fileName || 'unknown'}`);

    let fileToUpload: File;
    
    if (file instanceof Buffer) {
      // Convert Buffer to File for fal.ai upload
      const blob = new Blob([file], { type: 'application/octet-stream' });
      fileToUpload = new File([blob], fileName || 'file', { type: 'application/octet-stream' });
    } else if (file instanceof Blob) {
      // Convert Blob to File
      fileToUpload = new File([file], fileName || 'file', { type: file.type || 'application/octet-stream' });
    } else {
      // Already a File
      fileToUpload = file as unknown as File;
    }

    const url = await fal.storage.upload(fileToUpload);
    console.log(`✅ File uploaded: ${url}`);

    return url;
  } catch (error) {
    console.error('❌ Error uploading file:', error);
    throw new Error(`File upload failed: ${error}`);
  }
}

export async function testAvailableModels(): Promise<void> {
  console.log('🧪 Testing available video generation models...');
  
  const modelsToTest = [
    'fal-ai/veo3/fast/text-to-video',
    'fal-ai/veo3/fast/image-to-video',
    'fal-ai/minimax-video-01', 
    'fal-ai/runway-gen3',
    'fal-ai/stable-video-diffusion'
  ];

  for (const model of modelsToTest) {
    try {
      console.log(`Testing model: ${model}`);
      const result = await fal.queue.submit(model, {
        input: { prompt: 'test video generation' }
      });
      console.log(`✅ ${model}: Available (request_id: ${result.request_id})`);
    } catch (error: any) {
      console.log(`❌ ${model}: ${error.message}`);
    }
  }
}

export async function generateVideo(
  prompt: string, 
  imageUrl?: string, 
  options: VideoGenerationOptions = {}
): Promise<string> {
  try {
    if (imageUrl) {
      return await generateVideoFromImage(imageUrl, prompt, options);
    } else {
      return await generateVideoFromText(prompt, options);
    }
  } catch (error) {
    console.error('❌ Primary video generation failed:', error);
    throw error;
  }
}