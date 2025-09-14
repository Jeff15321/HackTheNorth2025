import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { stitchVideos, addMusicToVideo } from './ffmpeg';

const testAssetsDir = join(process.cwd(), 'test-assets');
const sample1Path = join(testAssetsDir, 'sample1.mp4');
const sample1DuplicatePath = join(testAssetsDir, 'sample1_duplicate.mp4');
const sample2Path = join(testAssetsDir, 'sample2.mp4');
const musicPath = join(testAssetsDir, 'music.mp3');
const outputDir = join(testAssetsDir, 'output');

beforeAll(() => {
  if (!existsSync(outputDir)) {
    require('fs').mkdirSync(outputDir, { recursive: true });
  }
});

afterAll(() => {
  console.log(`\n🎬 Output files created in: ${outputDir}`);
  console.log('Files will remain for inspection. Delete manually if needed.');
});

describe('stitchVideos', () => {
  test('stitches same codec videos together (fast concat)', async () => {
    if (!existsSync(sample1Path) || !existsSync(sample1DuplicatePath)) {
      return;
    }

    const stitchedPath = join(outputDir, 'stitched_fast_same_codec.mp4');
    
    await stitchVideos([sample1Path, sample1DuplicatePath], stitchedPath, {
      fastConcat: true
    });
    
    expect(existsSync(stitchedPath)).toBe(true);
    console.log(`✅ Fast concat video created at: ${stitchedPath}`);
  }, 120000);

  test('stitches different videos with scaling/re-encoding', async () => {
    if (!existsSync(sample1Path) || !existsSync(sample2Path)) {
      return;
    }

    const stitchedPath = join(outputDir, 'stitched_scaled_different.mp4');
    
    await stitchVideos([sample1Path, sample2Path], stitchedPath, {
      width: 640,
      height: 480,
      fps: 24,
      bitrate: '1000k'
    });
    
    expect(existsSync(stitchedPath)).toBe(true);
    console.log(`✅ Scaled/re-encoded video created at: ${stitchedPath}`);
  }, 120000);

  test('stitches same videos without scaling (re-encoding)', async () => {
    if (!existsSync(sample1Path) || !existsSync(sample1DuplicatePath)) {
      return;
    }

    const stitchedPath = join(outputDir, 'stitched_reencoded_same.mp4');
    
    await stitchVideos([sample1Path, sample1DuplicatePath], stitchedPath, {
      fps: 30,
      bitrate: '2000k'
    });
    
    expect(existsSync(stitchedPath)).toBe(true);
    console.log(`✅ Re-encoded (no scale) video created at: ${stitchedPath}`);
  }, 120000);

  test('throws error for empty video array', async () => {
    const stitchedPath = join(outputDir, 'empty.mp4');
    
    await expect(stitchVideos([], stitchedPath)).rejects.toThrow('No videos to stitch');
  });

  test('throws error for non-existent videos', async () => {
    const stitchedPath = join(outputDir, 'invalid.mp4');
    
    await expect(stitchVideos(['non-existent1.mp4', 'non-existent2.mp4'], stitchedPath)).rejects.toThrow();
  });
});

describe('addMusicToVideo', () => {
  test('adds music to video with default settings', async () => {
    if (!existsSync(sample1Path) || !existsSync(musicPath)) {
      return;
    }

    const outputPath = join(outputDir, 'with_music.mp4');
    
    await addMusicToVideo(sample1Path, musicPath, outputPath);
    
    expect(existsSync(outputPath)).toBe(true);
  }, 60000);

  test('adds music with custom volume settings', async () => {
    if (!existsSync(sample1Path) || !existsSync(musicPath)) {
      return;
    }

    const outputPath = join(outputDir, 'with_music_custom.mp4');
    
    await addMusicToVideo(sample1Path, musicPath, outputPath, {
      videoVolume: 0.8,
      musicVolume: 0.3,
      fadeInDuration: 2,
      fadeOutDuration: 2
    });
    
    expect(existsSync(outputPath)).toBe(true);
    
    if (existsSync(outputPath)) {
      unlinkSync(outputPath);
    }
  }, 60000);

  test('throws error for non-existent video', async () => {
    const outputPath = join(outputDir, 'invalid_music.mp4');
    
    await expect(addMusicToVideo('non-existent.mp4', musicPath, outputPath)).rejects.toThrow();
  });

  test('throws error for non-existent music', async () => {
    if (!existsSync(sample1Path)) {
      return;
    }

    const outputPath = join(outputDir, 'invalid_music2.mp4');
    
    await expect(addMusicToVideo(sample1Path, 'non-existent.mp3', outputPath)).rejects.toThrow();
  });
});
