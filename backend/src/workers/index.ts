import { createImageWorkers } from './imageWorker.js';
import { createVideoWorker } from './videoWorker.js';
import { createStitchingWorker } from './stitchingWorker.js';
import { createLLMWorker } from './llmWorker.js';

export function initAllWorkers() {
  console.log('🏭 Initializing all workers...');

  const { characterGenerationWorker, objectGenerationWorker, imageEditingWorker } = createImageWorkers();
  const videoWorker = createVideoWorker();
  const stitchingWorker = createStitchingWorker();
  const { llmWorker, sceneWorker, frameWorker } = createLLMWorker();

  const workers = {
    characterGenerationWorker,
    objectGenerationWorker,
    imageEditingWorker,
    videoWorker,
    stitchingWorker,
    llmWorker,
    sceneWorker,
    frameWorker
  };

  setupWorkerErrorHandlers(workers);

  console.log('✅ All workers initialized successfully');
  return workers;
}

function setupWorkerErrorHandlers(workers: Record<string, any>) {
  Object.entries(workers).forEach(([name, worker]) => {
    worker.on('error', (error: Error) => {
      console.error(`❌ Worker error in ${name}:`, error);
    });

    worker.on('failed', (job: any, error: Error) => {
      console.error(`❌ Job failed in ${name} (${job?.id}):`, error);
    });

    worker.on('completed', (job: any) => {
      console.log(`✅ Job completed in ${name} (${job?.id})`);
    });

    worker.on('stalled', (jobId: string) => {
      console.warn(`⚠️  Job stalled in ${name} (${jobId})`);
    });
  });
}