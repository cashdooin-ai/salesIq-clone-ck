import { Queue, Worker, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config/index.js';
import { emailService, EmailOptions } from '../services/email.js';

// Redis connection for BullMQ
const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
});

// Job data types
export interface EmailJob {
  type: 'single' | 'template';
  emailOptions: EmailOptions;
  metadata?: Record<string, any>;
}

// Create the email queue
export const emailQueue = new Queue<EmailJob>('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Queue events for monitoring
const queueEvents = new QueueEvents('emails', { connection });

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log('[Email Queue] Job completed:', { jobId, returnvalue });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error('[Email Queue] Job failed:', { jobId, failedReason });
});

queueEvents.on('progress', ({ jobId, data }) => {
  console.log('[Email Queue] Job progress:', { jobId, data });
});

// Worker to process email jobs
export const emailWorker = new Worker<EmailJob>(
  'emails',
  async (job) => {
    const { emailOptions, metadata } = job.data;

    console.log('[Email Worker] Processing email job:', {
      jobId: job.id,
      to: emailOptions.to,
      subject: emailOptions.subject,
      metadata,
    });

    // Update job progress
    await job.updateProgress(10);

    try {
      // Send the email
      const result = await emailService.sendEmail(emailOptions);

      await job.updateProgress(100);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send email');
      }

      console.log('[Email Worker] Email sent successfully:', {
        jobId: job.id,
        messageId: result.messageId,
      });

      return {
        success: true,
        messageId: result.messageId,
        sentAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Email Worker] Failed to send email:', {
        jobId: job.id,
        error: errorMessage,
        attempt: job.attemptsMade,
      });

      // Re-throw to trigger retry
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 emails concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // Per second (rate limiting)
    },
  }
);

// Worker event handlers
emailWorker.on('completed', (job) => {
  console.log('[Email Worker] Completed job:', job.id);
});

emailWorker.on('failed', (job, err) => {
  console.error('[Email Worker] Failed job:', {
    jobId: job?.id,
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });
});

emailWorker.on('error', (err) => {
  console.error('[Email Worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Email Queue] Shutting down gracefully...');
  await emailWorker.close();
  await emailQueue.close();
  await connection.quit();
});

// Helper functions to queue emails
export async function queueEmail(
  emailOptions: EmailOptions,
  metadata?: Record<string, any>,
  jobOptions?: {
    delay?: number;
    priority?: number;
    jobId?: string;
  }
) {
  const job = await emailQueue.add(
    'send-email',
    {
      type: 'single',
      emailOptions,
      metadata,
    },
    jobOptions
  );

  console.log('[Email Queue] Email queued:', {
    jobId: job.id,
    to: emailOptions.to,
    subject: emailOptions.subject,
  });

  return job;
}

export async function queueBulkEmails(
  emails: Array<{
    emailOptions: EmailOptions;
    metadata?: Record<string, any>;
  }>,
  jobOptions?: {
    delay?: number;
    priority?: number;
  }
) {
  const jobs = emails.map((email, index) => ({
    name: 'send-email',
    data: {
      type: 'single' as const,
      emailOptions: email.emailOptions,
      metadata: email.metadata,
    },
    opts: {
      ...jobOptions,
      jobId: `bulk-${Date.now()}-${index}`,
    },
  }));

  const addedJobs = await emailQueue.addBulk(jobs);

  console.log('[Email Queue] Bulk emails queued:', {
    count: addedJobs.length,
  });

  return addedJobs;
}

// Get queue stats
export async function getEmailQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

// Clean up old jobs
export async function cleanEmailQueue(
  grace: number = 24 * 3600 * 1000 // 24 hours
) {
  await emailQueue.clean(grace, 1000, 'completed');
  await emailQueue.clean(grace * 7, 1000, 'failed'); // Keep failed jobs longer

  console.log('[Email Queue] Cleaned up old jobs');
}

console.log('[Email Queue] Queue and worker initialized');
