import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { startupGenerationEngine } from '../lib/startup-generation-engine';
import { getDb } from '../utils/dbConfig';
import { StartupGenerationJobs, ContactResearchJobs } from '../utils/schema';
import { eq } from 'drizzle-orm';

// Redis connection
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true, // Don't connect immediately
});

// Worker for startup generation
let _startupGenerationWorker: Worker | null = null;

export const startupGenerationWorker = (() => {
  if (!_startupGenerationWorker) {
    try {
      _startupGenerationWorker = new Worker(
        'startup-generation',
        async (job: Job) => {
          const { userId, numStartups } = job.data;

          try {
            console.log(`Starting startup generation for user ${userId}, count: ${numStartups}`);

            // Update job status to processing
            const db = getDb();
            await db
              .update(StartupGenerationJobs)
              .set({ status: 'processing', progress: 10 })
              .where(eq(StartupGenerationJobs.id, job.data.jobId));

            // Generate startups
            const startups = await startupGenerationEngine.generateStartupData(userId, numStartups);

            // Update progress
            await db
              .update(StartupGenerationJobs)
              .set({ progress: 50 })
              .where(eq(StartupGenerationJobs.id, job.data.jobId));

            // Save to database
            await startupGenerationEngine.saveStartupsToDatabase(startups, userId);

            // Update job as completed
            await db
              .update(StartupGenerationJobs)
              .set({
                status: 'completed',
                progress: 100,
                result: { startupsGenerated: startups.length },
                completedAt: new Date().toISOString().split('T')[0]
              })
              .where(eq(StartupGenerationJobs.id, job.data.jobId));

            console.log(`Completed startup generation for user ${userId}`);

            return { success: true, startupsGenerated: startups.length };

          } catch (error) {
            console.error('Error in startup generation worker:', error);

            // Update job as failed
            const db = getDb();
            await db
              .update(StartupGenerationJobs)
              .set({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                completedAt: new Date().toISOString().split('T')[0]
              })
              .where(eq(StartupGenerationJobs.id, job.data.jobId));

            throw error;
          }
        },
        {
          connection: redisConnection,
          concurrency: 2, // Process 2 jobs concurrently
          removeOnComplete: { count: 50 }, // Keep last 50 completed jobs
          removeOnFail: { count: 100 }, // Keep last 100 failed jobs
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to create startup generation worker:', errorMessage);
      if (errorMessage.includes('Redis version needs to be greater or equal than')) {
        console.error('Redis version is incompatible. Please upgrade Redis to version 5.0 or later.');
      }
      _startupGenerationWorker = null;
    }
  }
  return _startupGenerationWorker;
})();

// Worker for contact research
let _contactResearchWorker: Worker | null = null;

export const contactResearchWorker = (() => {
  if (!_contactResearchWorker) {
    try {
      _contactResearchWorker = new Worker(
        'contact-research',
        async (job: Job) => {
          const { userId, startupId, startupName, website } = job.data;

          try {
            console.log(`Starting contact research for startup ${startupName}`);

            // Update job status to processing
            const db = getDb();
            await db
              .update(ContactResearchJobs)
              .set({ status: 'processing' })
              .where(eq(ContactResearchJobs.id, job.data.jobId));

            // Research contacts using web scraping
            const contactInfo = await researchContactsWithScraping(startupName, website);

            // Update startup with contact info
            await startupGenerationEngine.updateStartupContacts(startupId, contactInfo, userId);

            // Update job as completed
            await db
              .update(ContactResearchJobs)
              .set({
                status: 'completed',
                result: { contactInfo },
                completedAt: new Date().toISOString().split('T')[0]
              })
              .where(eq(ContactResearchJobs.id, job.data.jobId));

            console.log(`Completed contact research for startup ${startupName}`);

            return { success: true, contactInfo };

          } catch (error) {
            console.error('Error in contact research worker:', error);

            // Update job as failed
            const db = getDb();
            await db
              .update(ContactResearchJobs)
              .set({
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                completedAt: new Date().toISOString().split('T')[0]
              })
              .where(eq(ContactResearchJobs.id, job.data.jobId));

            throw error;
          }
        },
        {
          connection: redisConnection,
          concurrency: 3, // Process 3 contact research jobs concurrently
          removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
          removeOnFail: { count: 200 }, // Keep last 200 failed jobs
        }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to create contact research worker:', errorMessage);
      if (errorMessage.includes('Redis version needs to be greater or equal than')) {
        console.error('Redis version is incompatible. Please upgrade Redis to version 5.0 or later.');
      }
      _contactResearchWorker = null;
    }
  }
  return _contactResearchWorker;
})();

// Error handling
if (startupGenerationWorker) {
  startupGenerationWorker.on('error', (error) => {
    console.error('Startup generation worker error:', error);
  });
}

if (contactResearchWorker) {
  contactResearchWorker.on('error', (error) => {
    console.error('Contact research worker error:', error);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...');
  if (startupGenerationWorker) {
    await startupGenerationWorker.close();
  }
  if (contactResearchWorker) {
    await contactResearchWorker.close();
  }
  await redisConnection.quit();
});

process.on('SIGINT', async () => {
  console.log('Shutting down workers...');
  if (startupGenerationWorker) {
    await startupGenerationWorker.close();
  }
  if (contactResearchWorker) {
    await contactResearchWorker.close();
  }
  await redisConnection.quit();
});

export { redisConnection };
function researchContactsWithScraping(startupName: any, website: any) {
  throw new Error('Function not implemented.');
}

