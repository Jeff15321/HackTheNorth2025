import ffmpeg from 'fluent-ffmpeg';

export async function stitchVideos(
  videoPaths: string[],
  outputPath: string,
  options?: {
    width?: number;
    height?: number;
    fps?: number;
    bitrate?: string;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (videoPaths.length === 0) {
      reject(new Error('No videos to stitch'));
      return;
    }

    console.log(`🎞️  Stitching ${videoPaths.length} videos...`);

    let command = ffmpeg();

    videoPaths.forEach(videoPath => {
      command = command.input(videoPath);
    });

    command
      .on('start', (commandLine) => {
        console.log(`🎞️  FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        console.log(`🎞️  Stitching progress: ${Math.round(progress.percent || 0)}%`);
      })
      .on('end', () => {
        console.log(`✅ Video stitching completed: ${outputPath}`);
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ FFmpeg error:', error);
        reject(new Error(`Video stitching failed: ${error.message}`));
      })
      .complexFilter([
        {
          filter: 'concat',
          options: {
            n: videoPaths.length,
            v: 1,
            a: 1
          }
        }
      ])
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-preset fast',
        '-crf 23'
      ]);

    if (options?.width && options?.height) {
      command = command.size(`${options.width}x${options.height}`);
    }

    if (options?.fps) {
      command = command.fps(options.fps);
    }

    if (options?.bitrate) {
      command = command.videoBitrate(options.bitrate);
    }

    command.save(outputPath);
  });
}

export async function convertVideo(
  inputPath: string,
  outputPath: string,
  options?: {
    format?: string;
    width?: number;
    height?: number;
    fps?: number;
    bitrate?: string;
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`🔄 Converting video: ${inputPath} -> ${outputPath}`);

    let command = ffmpeg(inputPath);

    if (options?.width && options?.height) {
      command = command.size(`${options.width}x${options.height}`);
    }

    if (options?.fps) {
      command = command.fps(options.fps);
    }

    if (options?.bitrate) {
      command = command.videoBitrate(options.bitrate);
    }

    if (options?.format) {
      command = command.format(options.format);
    }

    command
      .on('start', (commandLine) => {
        console.log(`🔄 FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        console.log(`🔄 Conversion progress: ${Math.round(progress.percent || 0)}%`);
      })
      .on('end', () => {
        console.log(`✅ Video conversion completed: ${outputPath}`);
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ FFmpeg conversion error:', error);
        reject(new Error(`Video conversion failed: ${error.message}`));
      })
      .save(outputPath);
  });
}

export async function getVideoInfo(videoPath: string): Promise<{
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (error, metadata) => {
      if (error) {
        console.error('❌ Error getting video info:', error);
        reject(new Error(`Failed to get video info: ${error.message}`));
        return;
      }

      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');

      if (!videoStream) {
        reject(new Error('No video stream found'));
        return;
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps: videoStream.r_frame_rate ? parseFloat(videoStream.r_frame_rate.split('/')[0] || '0') / parseFloat(videoStream.r_frame_rate.split('/')[1] || '1') : 0,
        bitrate: metadata.format.bit_rate ? parseInt(String(metadata.format.bit_rate)) : 0
      });
    });
  });
}

export async function extractFrameFromVideo(
  videoPath: string,
  outputPath: string,
  timeSeconds: number = 0
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`📸 Extracting frame at ${timeSeconds}s from ${videoPath}`);

    ffmpeg(videoPath)
      .seekInput(timeSeconds)
      .frames(1)
      .output(outputPath)
      .on('start', (commandLine) => {
        console.log(`📸 FFmpeg command: ${commandLine}`);
      })
      .on('end', () => {
        console.log(`✅ Frame extracted: ${outputPath}`);
        resolve();
      })
      .on('error', (error) => {
        console.error('❌ Frame extraction error:', error);
        reject(new Error(`Frame extraction failed: ${error.message}`));
      })
      .run();
  });
}