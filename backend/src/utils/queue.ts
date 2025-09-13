import { Queue, QueueEvents, Job } from 'bullmq';
import { createClient } from 'redis';
import type { JobType, Job as JobData } from '../models/schemas';

let redisClient: ReturnType<typeof createClient>;
const queues: Map<JobType, Queue> = new Map();
const queueEvents: Map<JobType, QueueEvents> = new Map();

export async function initRedis() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err);
  });

  redisClient.on('connect', () => {
    console.log('📡 Redis connected');
  });

  await redisClient.connect();
  return redisClient;
}

export function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call initRedis() first.');
  }
  return redisClient;
}

export function createQueues() {
  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    db: parseInt(process.env.REDIS_DB || '0')
  };

  const jobTypes: JobType[] = [
    'character-generation',
    'object-generation',
    'scene-generation',
    'frame-generation',
    'video-generation',
    'video-stitching',
    'script-generation',
    'image-editing'
  ];

  for (const jobType of jobTypes) {
    const queue = new Queue(jobType, {
      connection,
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      }
    });

    const events = new QueueEvents(jobType, { connection });

    queues.set(jobType, queue);
    queueEvents.set(jobType, events);

    console.log(`🏭 Queue created: ${jobType}`);
  }

  return { queues, queueEvents };
}

export function getQueue(jobType: JobType): Queue {
  const queue = queues.get(jobType);
  if (!queue) {
    throw new Error(`Queue not found for job type: ${jobType}`);
  }
  return queue;
}

export function getQueueEvents(jobType: JobType): QueueEvents {
  const events = queueEvents.get(jobType);
  if (!events) {
    throw new Error(`Queue events not found for job type: ${jobType}`);
  }
  return events;
}

export async function addJob(jobType: JobType, jobData: JobData): Promise<Job> {
  const queue = getQueue(jobType);

  const job = await queue.add(jobType, jobData, {
    jobId: jobData.id,
    priority: getJobPriority(jobType),
    delay: getJobDelay(jobType)
  });

  console.log(`➕ Added job: ${jobType} (${job.id})`);
  await updateJobStatus(jobData.id, 'pending', 0);

  return job;
}

export async function updateJobStatus(
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,
  outputData?: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  const redis = getRedisClient();
  const key = `job:${jobId}:status`;

  console.log(`Updating job ${jobId} status to ${status} with outputData:`, outputData);

  const statusData = {
    status,
    progress,
    updated_at: new Date().toISOString(),
    ...(outputData && { output_data: JSON.stringify(outputData) }),
    ...(errorMessage && { error_message: errorMessage })
  };

  console.log(`Status data being written to Redis:`, statusData);

  await redis.hSet(key, statusData);
  console.log(`Job ${jobId}: ${status} (${progress}%)`);
}

export async function getJobStatus(jobId: string) {
  const redis = getRedisClient();
  const key = `job:${jobId}:status`;

  const status = await redis.hGetAll(key);

  if (!status.status) {
    return null;
  }

  let output_data = undefined;
  if (status.output_data) {
    try {
      output_data = JSON.parse(status.output_data);
      console.log('✅ Successfully parsed output_data, keys:', Object.keys(output_data));
    } catch (error) {
      console.error('❌ Failed to parse output_data:', error);
      console.error('Raw output_data value:', status.output_data);
    }
  }

  const result = {
    status: status.status,
    progress: parseInt(status.progress || '0'),
    updated_at: status.updated_at,
    output_data,
    error_message: status.error_message || undefined
  };

  console.log('Final result object output_data keys:', Object.keys(result.output_data || {}));
  return result;
}

export async function cancelJob(jobType: JobType, jobId: string): Promise<void> {
  const queue = getQueue(jobType);
  const job = await queue.getJob(jobId);

  if (job) {
    await job.remove();
    await updateJobStatus(jobId, 'failed', 0, undefined, 'Job cancelled');
    console.log(`❌ Cancelled job: ${jobId}`);
  }
}

export async function getQueueInfo(jobType: JobType) {
  const queue = getQueue(jobType);
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaiting(),
    queue.getActive(),
    queue.getCompleted(),
    queue.getFailed()
  ]);

  return {
    jobType,
    counts: {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length
    }
  };
}

export function setupJobEventListeners() {
  for (const [jobType, events] of queueEvents.entries()) {
    events.on('completed', ({ jobId, returnvalue }) => {
      console.log(`Job completed: ${jobType} (${jobId})`);
      console.log('Return value type:', typeof returnvalue);
      console.log('Return value:', JSON.stringify(returnvalue, null, 2));

      let outputData: Record<string, unknown>;
      if (typeof returnvalue === 'string') {
        outputData = { result: returnvalue };
      } else if (returnvalue && typeof returnvalue === 'object') {
        outputData = returnvalue as Record<string, unknown>;
      } else {
        console.log('Warning: returnvalue is null, undefined, or unexpected type');
        outputData = { raw_return: returnvalue };
      }

      console.log('Processed output data:', JSON.stringify(outputData, null, 2));
      updateJobStatus(jobId, 'completed', 100, outputData);
    });

    events.on('failed', ({ jobId, failedReason }) => {
      console.log(`❌ Job failed: ${jobType} (${jobId}) - ${failedReason}`);
      updateJobStatus(jobId, 'failed', 0, undefined, failedReason);
    });

    events.on('progress', ({ jobId, data }) => {
      const progress = typeof data === 'number' ? data : (data && typeof data === 'object' && 'progress' in data) ? Number(data.progress) || 0 : 0;
      console.log(`⏳ Job progress: ${jobType} (${jobId}) - ${progress}%`);
      updateJobStatus(jobId, 'processing', progress);
    });
  }
}

function getJobPriority(jobType: JobType): number {
  const priorities: Record<JobType, number> = {
    'character-generation': 1,
    'object-generation': 2,
    'script-generation': 3,
    'scene-generation': 4,
    'frame-generation': 5,
    'image-editing': 6,
    'video-generation': 7,
    'video-stitching': 8
  };

  return priorities[jobType] || 5;
}

function getJobDelay(jobType: JobType): number {
  if (jobType === 'character-generation') return 0;
  return 1000;
}