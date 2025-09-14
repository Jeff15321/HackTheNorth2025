import ffmpeg from 'fluent-ffmpeg';

export async function stitchVideos(
  videoPaths: string[],
  outputPath: string,
  options?: {
    width?: number;
    height?: number;
    fps?: number;
    bitrate?: string;
    fastConcat?: boolean; // for same-codec videos
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (videoPaths.length === 0) {
      reject(new Error('No videos to stitch'));
      return;
    }

    const startTime = Date.now();
    console.log(`🎞️  Stitching ${videoPaths.length} videos...`);
    console.log(`📂 Input videos:`, videoPaths);
    console.log(`📁 Output path:`, outputPath);
    console.log(`⚙️  Options:`, options);

    // Use fast concat for same-codec videos
    if (options?.fastConcat) {
      const concatList = videoPaths.map(path => `file '${path}'`).join('\n');
      const tempListPath = outputPath.replace('.mp4', '_list.txt');
      
      require('fs').writeFileSync(tempListPath, concatList);

      ffmpeg()
        .input(tempListPath)
        .inputOptions(['-f concat', '-safe 0'])
        .outputOptions(['-c copy']) // Copy streams without re-encoding
        .on('start', (commandLine) => {
          console.log(`🎞️  FFmpeg fast concat: ${commandLine}`);
        })
        .on('end', () => {
          const duration = Date.now() - startTime;
          console.log(`✅ Fast video stitching completed: ${outputPath}`);
          console.log(`⏱️  Fast concat duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
          require('fs').unlinkSync(tempListPath);
          resolve();
        })
        .on('error', (error) => {
          console.error('🚨 FFmpeg fast concat error:', error);
          console.error('📊 Error details:', {
            message: error.message,
            stack: error.stack,
            videoPaths,
            outputPath,
            tempListPath
          });
          if (require('fs').existsSync(tempListPath)) {
            require('fs').unlinkSync(tempListPath);
          }
          reject(new Error(`Video stitching failed: ${error.message}`));
        })
        .save(outputPath);
      return;
    }

    let command = ffmpeg();
    
    videoPaths.forEach(videoPath => {
      console.log(`📝 Adding input: ${videoPath}`);
      command = command.input(videoPath);
    });

    let filterComplex = '';
    
    if (options?.width && options?.height) {
      const scaleFilters = videoPaths.map((_, i) => `[${i}:v]scale=${options.width}:${options.height}[v${i}s]`).join(';');
      const concatInputs = videoPaths.map((_, i) => `[v${i}s][${i}:a]`).join('');
      filterComplex = `${scaleFilters};${concatInputs}concat=n=${videoPaths.length}:v=1:a=1[v][a]`;
    } else {
      const concatInputs = videoPaths.map((_, i) => `[${i}:v][${i}:a]`).join('');
      filterComplex = `${concatInputs}concat=n=${videoPaths.length}:v=1:a=1[v][a]`;
    }
    
    console.log(`🔧 Filter complex: ${filterComplex}`);

    command
      .complexFilter(filterComplex)
      .outputOptions([
        '-map [v]',
        '-map [a]',
        '-c:v libx264',
        '-c:a aac',
        '-preset fast',
        '-crf 23'
      ])
      .on('start', (commandLine) => {
        console.log(`🎞️  FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        console.log(`🎞️  Stitching progress: ${Math.round(progress.percent || 0)}%`);
      })
      .on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`✅ Video stitching completed: ${outputPath}`);
        console.log(`⏱️  Re-encoding duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
        resolve();
      })
      .on('error', (error) => {
        console.error('🚨 FFmpeg re-encoding error:', error);
        console.error('📊 Error details:', {
          message: error.message,
          stack: error.stack,
          videoPaths,
          outputPath,
          options,
          filterComplex
        });
        reject(new Error(`Video stitching failed: ${error.message}`));
      });

    if (options?.fps) {
      console.log(`🎬 Setting FPS: ${options.fps}`);
      command = command.fps(options.fps);
    }

    if (options?.bitrate) {
      console.log(`💾 Setting bitrate: ${options.bitrate}`);
      command = command.videoBitrate(options.bitrate);
    }

    command.save(outputPath);
  });
}

export async function addMusicToVideo(
  videoPath: string,
  musicPath: string,
  outputPath: string,
  options?: {
    videoVolume?: number; // 0.0 to 1.0
    musicVolume?: number; // 0.0 to 1.0
    fadeInDuration?: number; // seconds
    fadeOutDuration?: number; // seconds
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    console.log(`🎵 Adding music to video: ${videoPath} + ${musicPath}`);
    console.log(`📂 Video path:`, videoPath);
    console.log(`🎶 Music path:`, musicPath);
    console.log(`📁 Output path:`, outputPath);
    console.log(`⚙️  Music options:`, options);

    const videoVolume = options?.videoVolume ?? 1.0;
    const musicVolume = options?.musicVolume ?? 0.5;
    const fadeIn = options?.fadeInDuration ?? 0;
    const fadeOut = options?.fadeOutDuration ?? 0;
    
    console.log(`🔊 Volume settings - Video: ${videoVolume}, Music: ${musicVolume}`);
    console.log(`🎚️  Fade settings - In: ${fadeIn}s, Out: ${fadeOut}s`);

    let audioFilter = `[1:a]volume=${musicVolume}`;
    
    if (fadeIn > 0) {
      audioFilter += `,afade=t=in:ss=0:d=${fadeIn}`;
    }
    
    if (fadeOut > 0) {
      audioFilter += `,afade=t=out:st=0:d=${fadeOut}`;
    }
    
    audioFilter += `[music];[0:a]volume=${videoVolume}[video];[video][music]amix=inputs=2:duration=first:dropout_transition=2[outa]`;
    
    console.log(`🔧 Audio filter: ${audioFilter}`);

    ffmpeg()
      .input(videoPath)
      .input(musicPath)
      .complexFilter([audioFilter])
      .outputOptions([
        '-map 0:v',
        '-map [outa]',
        '-c:v copy',
        '-c:a aac',
        '-shortest'
      ])
      .on('start', (commandLine) => {
        console.log(`🎵 FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        console.log(`🎵 Music mixing progress: ${Math.round(progress.percent || 0)}%`);
      })
      .on('end', () => {
        const duration = Date.now() - startTime;
        console.log(`✅ Music added to video: ${outputPath}`);
        console.log(`⏱️  Music mixing duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
        resolve();
      })
      .on('error', (error) => {
        console.error('🚨 FFmpeg music error:', error);
        console.error('📊 Music error details:', {
          message: error.message,
          stack: error.stack,
          videoPath,
          musicPath,
          outputPath,
          options,
          audioFilter
        });
        reject(new Error(`Adding music failed: ${error.message}`));
      })
      .save(outputPath);
  });
}