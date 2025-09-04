import { Queue, Worker, JobType } from 'bullmq';
import { createClient } from 'redis';

// Redis connection configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  username: process.env.REDIS_USERNAME,
};

// Queue names
export const QUEUE_NAMES = {
  AGRITECH_EXTRACTION: 'agritech-extraction',
  STARTUP_GENERATION: 'startup-generation',
  CONTACT_RESEARCH: 'contact-research',
} as const;

// Lazy-loaded Redis client
let _redisClient: ReturnType<typeof createClient> | null = null;
let _isConnected = false;

export function getRedisClient(): ReturnType<typeof createClient> | null {
  if (!_redisClient) {
    _redisClient = createClient({
      ...redisConfig,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false, // Disable automatic reconnection
      },
    });
    
    // Set up event handlers - only log actual errors, not connection failures
    _redisClient.on('error', (err: any) => {
      // Only log if it's not a connection error (which is expected when Redis is down)
      if (err.code !== 'ECONNREFUSED' && err.code !== 'ENOTFOUND') {
        console.error('Redis Client Error:', err);
      }
      _isConnected = false;
    });
    
    _redisClient.on('connect', () => {
      _isConnected = true;
    });
    
    _redisClient.on('disconnect', () => {
      _isConnected = false;
    });
    
    _redisClient.on('ready', () => {
      _isConnected = true;
    });
  }
  return _redisClient;
}

// Export redisClient for backward compatibility (lazy-loaded)
export const redisClient = {
  get: async (key: string): Promise<string | null> => {
    try {
      const client = getRedisClient();
      if (!client) return null;
      
      if (!client.isOpen) {
        await client.connect();
      }
      return await client.get(key);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ENOTFOUND')) {
        return null;
      }
      console.error('Redis get failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  },
  setEx: async (key: string, ttl: number, value: string): Promise<string | null> => {
    try {
      const client = getRedisClient();
      if (!client) return null;
      
      if (!client.isOpen) {
        await client.connect();
      }
      return await client.setEx(key, ttl, value);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ENOTFOUND')) {
        return null;
      }
      console.error('Redis setEx failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  },
  del: async (key: string): Promise<number> => {
    try {
      const client = getRedisClient();
      if (!client) return 0;
      
      if (!client.isOpen) {
        await client.connect();
      }
      return await client.del(key);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ENOTFOUND')) {
        return 0;
      }
      console.error('Redis del failed:', error instanceof Error ? error.message : String(error));
      return 0;
    }
  },
  quit: async (): Promise<string> => {
    try {
      const client = getRedisClient();
      if (!client) return 'OK';
      
      if (client.isOpen) {
        await client.quit();
        _isConnected = false;
      }
      return 'OK';
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          ((error as any).code === 'ECONNREFUSED' || (error as any).code === 'ENOTFOUND')) {
        return 'OK';
      }
      console.error('Redis quit failed:', error instanceof Error ? error.message : String(error));
      return 'OK';
    }
  }
};

// Queue configurations
export const queueConfigs = {
  defaultJobOptions: {
    removeOnComplete: 50, // Keep last 50 completed jobs
    removeOnFail: 100, // Keep last 100 failed jobs
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Initial delay 2 seconds
    },
  },
};

// Lazy-loaded queue instances
let _agritechQueue: Queue | null = null;
let _startupGenerationQueue: Queue | null = null;
let _contactResearchQueue: Queue | null = null;

export function getAgritechQueue() {
  if (!_agritechQueue) {
    try {
      _agritechQueue = new Queue(QUEUE_NAMES.AGRITECH_EXTRACTION, {
        connection: redisConfig,
        defaultJobOptions: queueConfigs.defaultJobOptions,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Handle both connection errors and Redis version errors
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') ||
          errorMessage.includes('Redis version needs to be greater or equal than')) {
        // Silently handle Redis connection/version failures
      } else {
        console.error('Failed to create agritech queue:', errorMessage);
      }
      // Return a mock queue that throws errors for all operations
      _agritechQueue = {
        add: async () => { throw new Error('Queue service unavailable'); },
        getJob: async () => null,
        getJobs: async () => [],
        clean: async () => [],
        close: async () => undefined,
      } as any;
    }
  }
  return _agritechQueue;
}

export function getStartupGenerationQueue() {
  if (!_startupGenerationQueue) {
    try {
      _startupGenerationQueue = new Queue(QUEUE_NAMES.STARTUP_GENERATION, {
        connection: redisConfig,
        defaultJobOptions: queueConfigs.defaultJobOptions,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Handle both connection errors and Redis version errors
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') ||
          errorMessage.includes('Redis version needs to be greater or equal than')) {
        // Silently handle Redis connection/version failures
      } else {
        console.error('Failed to create startup generation queue:', errorMessage);
      }
      _startupGenerationQueue = {
        add: async () => { throw new Error('Queue service unavailable'); },
        getJob: async () => null,
        getJobs: async () => [],
        clean: async () => [],
        close: async () => undefined,
      } as any;
    }
  }
  return _startupGenerationQueue;
}

export function getContactResearchQueue() {
  if (!_contactResearchQueue) {
    try {
      _contactResearchQueue = new Queue(QUEUE_NAMES.CONTACT_RESEARCH, {
        connection: redisConfig,
        defaultJobOptions: queueConfigs.defaultJobOptions,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Handle both connection errors and Redis version errors
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') ||
          errorMessage.includes('Redis version needs to be greater or equal than')) {
        // Silently handle Redis connection/version failures
      } else {
        console.error('Failed to create contact research queue:', errorMessage);
      }
      _contactResearchQueue = {
        add: async () => { throw new Error('Queue service unavailable'); },
        getJob: async () => null,
        getJobs: async () => [],
        clean: async () => [],
        close: async () => undefined,
      } as any;
    }
  }
  return _contactResearchQueue;
}

// Export queue instances for backward compatibility (lazy-loaded)
export const agritechQueue = {
  add: async (name: string, data: any, options?: any) => {
    try {
      const queue = getAgritechQueue();
      if (!queue) {
        throw new Error('Queue service unavailable');
      }
      return await queue.add(name, data, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't log connection errors or Redis version errors as they're expected when Redis is incompatible/down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') ||
          errorMessage.includes('Redis version needs to be greater or equal than') ||
          errorMessage.includes('Queue service unavailable')) {
        throw new Error('Queue service unavailable. Please try again later.');
      }
      console.error('Queue add failed:', errorMessage);
      throw new Error('Queue service unavailable. Please try again later.');
    }
  },
  getJob: async (id: string) => {
    try {
      const queue = getAgritechQueue();
      if (!queue) return null;
      return await queue.getJob(id);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return null;
      }
      console.error('Queue getJob failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  },
  getJobs: async (types: JobType[], start?: number, end?: number) => {
    try {
      const queue = getAgritechQueue();
      if (!queue) return [];
      return await queue.getJobs(types, start, end);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return [];
      }
      console.error('Queue getJobs failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  },
  clean: async (grace: number, limit: number, type?: string) => {
    try {
      const queue = getAgritechQueue();
      if (!queue) return [];
      return await queue.clean(grace, limit, type as any);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return [];
      }
      console.error('Queue clean failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  },
  close: async () => {
    try {
      const queue = getAgritechQueue();
      if (!queue) return undefined;
      return await queue.close();
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return undefined;
      }
      console.error('Queue close failed:', error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }
};

export const startupGenerationQueue = {
  add: async (name: string, data: any, options?: any) => {
    try {
      const queue = getStartupGenerationQueue();
      if (!queue) {
        throw new Error('Queue service unavailable');
      }
      return await queue.add(name, data, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't log connection errors or Redis version errors as they're expected when Redis is incompatible/down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') ||
          errorMessage.includes('Redis version needs to be greater or equal than') ||
          errorMessage.includes('Queue service unavailable')) {
        throw new Error('Queue service unavailable. Please try again later.');
      }
      console.error('Startup generation queue add failed:', errorMessage);
      throw new Error('Queue service unavailable. Please try again later.');
    }
  },
  getJob: async (id: string) => {
    try {
      const queue = getStartupGenerationQueue();
      if (!queue) return null;
      return await queue.getJob(id);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return null;
      }
      console.error('Startup generation queue getJob failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  },
  getJobs: async (types: JobType[], start?: number, end?: number) => {
    try {
      const queue = getStartupGenerationQueue();
      if (!queue) return [];
      return await queue.getJobs(types, start, end);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return [];
      }
      console.error('Startup generation queue getJobs failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  },
  clean: async (grace: number, limit: number, type?: string) => {
    try {
      const queue = getStartupGenerationQueue();
      if (!queue) return [];
      return await queue.clean(grace, limit, type as any);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return [];
      }
      console.error('Startup generation queue clean failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  },
  close: async () => {
    try {
      const queue = getStartupGenerationQueue();
      if (!queue) return undefined;
      return await queue.close();
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return undefined;
      }
      console.error('Startup generation queue close failed:', error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }
};

export const contactResearchQueue = {
  add: async (name: string, data: any, options?: any) => {
    try {
      const queue = getContactResearchQueue();
      if (!queue) {
        throw new Error('Queue service unavailable');
      }
      return await queue.add(name, data, options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't log connection errors or Redis version errors as they're expected when Redis is incompatible/down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') ||
          errorMessage.includes('Redis version needs to be greater or equal than') ||
          errorMessage.includes('Queue service unavailable')) {
        throw new Error('Queue service unavailable. Please try again later.');
      }
      console.error('Contact research queue add failed:', errorMessage);
      throw new Error('Queue service unavailable. Please try again later.');
    }
  },
  getJob: async (id: string) => {
    try {
      const queue = getContactResearchQueue();
      if (!queue) return null;
      return await queue.getJob(id);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return null;
      }
      console.error('Contact research queue getJob failed:', error instanceof Error ? error.message : String(error));
      return null;
    }
  },
  getJobs: async (types: JobType[], start?: number, end?: number) => {
    try {
      const queue = getContactResearchQueue();
      if (!queue) return [];
      return await queue.getJobs(types, start, end);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return [];
      }
      console.error('Contact research queue getJobs failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  },
  clean: async (grace: number, limit: number, type?: string) => {
    try {
      const queue = getContactResearchQueue();
      if (!queue) return [];
      return await queue.clean(grace, limit, type as any);
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return [];
      }
      console.error('Contact research queue clean failed:', error instanceof Error ? error.message : String(error));
      return [];
    }
  },
  close: async () => {
    try {
      const queue = getContactResearchQueue();
      if (!queue) return undefined;
      return await queue.close();
    } catch (error) {
      // Don't log connection errors as they're expected when Redis is down
      if (error && typeof error === 'object' && 'code' in error && 
          (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
        return undefined;
      }
      console.error('Contact research queue close failed:', error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }
};

// Note: QueueScheduler is not needed in BullMQ v5+

// Job data types
export interface AgritechExtractionJobData {
  userId: string;
  limit: number;
  session: any; // NextAuth session
}

// Startup generation job data
export interface StartupGenerationJobData {
  userId: string;
  numStartups: number;
  priorityStartups: StartupData[];
}

// Contact research job data
export interface ContactResearchJobData {
  userId: string;
  startupId: string;
  startupName: string;
  website: string;
}

// Job result types
export interface AgritechExtractionJobResult {
  success: boolean;
  results: any[];
  error?: string;
  processedCount: number;
  totalCount: number;
}

// Startup generation result
export interface StartupGenerationJobResult {
  success: boolean;
  results: StartupData[];
  error?: string;
  processedCount: number;
  totalCount: number;
}

// Contact research result
export interface ContactResearchJobResult {
  success: boolean;
  contacts: string;
  error?: string;
}

// Startup data interface
export interface StartupData {
  id?: string;
  name: string;
  city?: string;
  website: string;
  description: string;
  locationScore: number;
  readinessScore: number;
  feasibilityScore: number;
  rougeScore: number;
  justification: string;
  isPriority?: boolean;
  contactInfo?: any;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper functions
export const addAgritechExtractionJob = async (data: AgritechExtractionJobData) => {
  try {
    const job = await agritechQueue.add('extract-universities', data, {
      priority: 1, // High priority for user-initiated jobs
      delay: 0, // Start immediately
    });
    return job;
  } catch (error) {
    console.error('Failed to add agritech extraction job:', error instanceof Error ? error.message : String(error));
    throw new Error('Queue service unavailable. Please try again later.');
  }
};

// Startup generation job helper
export const addStartupGenerationJob = async (data: StartupGenerationJobData) => {
  try {
    const job = await startupGenerationQueue.add('generate-startups', data, {
      priority: 1,
      delay: 0,
    });
    return job;
  } catch (error) {
    console.error('Failed to add startup generation job:', error instanceof Error ? error.message : String(error));
    throw new Error('Queue service unavailable. Please try again later.');
  }
};

// Contact research job helper
export const addContactResearchJob = async (data: ContactResearchJobData) => {
  try {
    const job = await contactResearchQueue.add('research-contacts', data, {
      priority: 2, // Higher priority than generation
      delay: 0,
    });
    return job;
  } catch (error) {
    console.error('Failed to add contact research job:', error instanceof Error ? error.message : String(error));
    throw new Error('Queue service unavailable. Please try again later.');
  }
};

export const getJobStatus = async (jobId: string) => {
  try {
    const job = await agritechQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      state,
      progress,
      result,
      failedReason,
      createdAt: job.opts.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    };
  } catch (error) {
    console.error('Failed to get job status:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

// Get startup generation job status
export const getStartupGenerationJobStatus = async (jobId: string) => {
  try {
    const job = await startupGenerationQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      state,
      progress,
      result,
      failedReason,
      createdAt: job.opts.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    };
  } catch (error) {
    console.error('Failed to get startup generation job status:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

// Get contact research job status
export const getContactResearchJobStatus = async (jobId: string) => {
  try {
    const job = await contactResearchQueue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    return {
      id: job.id,
      state,
      progress,
      result,
      failedReason,
      createdAt: job.opts.timestamp,
      processedAt: job.processedOn,
      finishedAt: job.finishedOn,
    };
  } catch (error) {
    console.error('Failed to get contact research job status:', error instanceof Error ? error.message : String(error));
    return null;
  }
};

// Clean up old jobs (call this periodically)
export const cleanupOldJobs = async () => {
  try {
    await agritechQueue.clean(24 * 60 * 60 * 1000, 50, 'completed'); // Clean completed jobs older than 24 hours
    await agritechQueue.clean(7 * 24 * 60 * 60 * 1000, 100, 'failed'); // Clean failed jobs older than 7 days
  } catch (error) {
    console.error('Failed to cleanup old jobs:', error instanceof Error ? error.message : String(error));
  }
};

// Graceful shutdown
export const closeQueues = async () => {
  try {
    await agritechQueue.close();
    await startupGenerationQueue.close();
    await contactResearchQueue.close();
    await redisClient.quit();
  } catch (error) {
    console.error('Failed to close queues:', error instanceof Error ? error.message : String(error));
  }
};
