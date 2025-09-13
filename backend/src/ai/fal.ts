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

export async function generateVideoFromImage(
  imageUrl: string,
  prompt: string,
): Promise<string> {
  try {
    console.log(`🎬 Generating video from image: ${prompt.substring(0, 50)}...`);

    const { request_id } = await fal.queue.submit("fal-ai/veo3/fast/image-to-video", {
      input: {
        prompt: prompt,
        image_url: imageUrl
      }
    });

    console.log(`✅ Video generation job submitted: ${request_id}`);
    
    return await waitForVideoResult(request_id, "fal-ai/veo3/fast/image-to-video");
  } catch (error) {
    console.error('❌ Error generating video from image:', error);
    throw new Error(`Video generation from image failed: ${error}`);
  }
}

export async function generateVideoFromText(
  prompt: string,
  duration: number = 8
): Promise<string> {
  try {
    console.log(`🎬 Generating text-to-video: ${prompt.substring(0, 50)}...`);

    const { request_id } = await fal.queue.submit("fal-ai/veo3/fast/text-to-video", {
      input: {
        prompt: prompt
      }
    });

    console.log(`✅ Text-to-video generation job submitted: ${request_id}`);
    
    // Poll for completion
    return await waitForVideoResult(request_id, "fal-ai/veo3/fast/text-to-video");
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
        
        const videoUrl = result.data?.video?.url || 
                        result.data?.video_url || 
                        result.data?.url ||
                        result.data?.video ||
                        result.data?.output?.url ||
                        result.data?.output;
        
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
    duration?: number;
    webhookUrl?: string;
  } = {}
): Promise<string> {
  try {
    const { imageUrl, webhookUrl } = options;
    
    console.log(`🎬 Submitting async video generation: ${prompt.substring(0, 50)}...`);

    const endpoint = imageUrl ? "fal-ai/veo3/fast/image-to-video" : "fal-ai/veo3/fast/text-to-video";
    
    const input: any = {
      prompt: prompt,
    };

    if (imageUrl) {
      input.image_url = imageUrl;
    }

    const { request_id } = await fal.queue.submit(endpoint, {
      input,
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
    
    const videoUrl = result.data?.video?.url || 
                    result.data?.video_url || 
                    result.data?.url ||
                    result.data?.video ||
                    result.data?.output?.url ||
                    result.data?.output;
    
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

export async function generateVideo(prompt: string, imageUrl?: string): Promise<string> {
  try {
    if (imageUrl) {
      return await generateVideoFromImage(imageUrl, prompt);
    } else {
      return await generateVideoFromText(prompt);
    }
  } catch (error) {
    console.error('❌ Primary video generation failed:', error);
    throw error;
  }
}