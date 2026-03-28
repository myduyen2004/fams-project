package com.fams.backend.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fams.backend.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import jakarta.annotation.PreDestroy;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * High-Performance Email Queue Service using Redis as Message Broker.
 * Supports parallel workers for ultra-fast email dispatch.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailQueueService {

    private final StringRedisTemplate redisTemplate;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String EMAIL_QUEUE_KEY = "fams:email:queue";
    private static final String CANCELLED_JOBS_KEY = "fams:jobs:cancelled";
    private static final int WORKER_COUNT = 1; // Reduced from 10 to 1 for Gmail compatibility (security/rate limits)

    private ExecutorService workerPool;
    private volatile boolean running = true;
    private final AtomicInteger processedCount = new AtomicInteger(0);
    private final AtomicInteger totalQueued = new AtomicInteger(0);

    @EventListener(ApplicationReadyEvent.class)
    public void init() {
        // Create Virtual Thread Pool for I/O-bound email sending
        workerPool = Executors.newVirtualThreadPerTaskExecutor();

        // Start worker threads
        for (int i = 0; i < WORKER_COUNT; i++) {
            final int workerId = i;
            workerPool.submit(() -> runWorker(workerId));
        }
        log.info("EmailQueueService initialized with {} parallel workers using Virtual Threads", WORKER_COUNT);
    }

    @PreDestroy
    public void shutdown() {
        log.info("Stopping EmailQueueService workers...");
        running = false;
        if (workerPool != null) {
            workerPool.shutdown();
        }
        log.info("EmailQueueService workers stopped.");
    }

    /**
     * Clear the email queue and stop current batch.
     */
    public void clearQueue() {
        redisTemplate.delete(EMAIL_QUEUE_KEY);
        log.info("Email queue cleared manually.");
    }

    /**
     * Mark a job as cancelled so workers skip its emails.
     */
    public void cancelJobEmails(String jobId) {
        if (jobId != null) {
            redisTemplate.opsForSet().add(CANCELLED_JOBS_KEY, jobId);
            log.info("Job {} emails cancelled.", jobId);
        }
    }

    /**
     * Push an email task to the Redis queue.
     * This method returns instantly - email is sent by background workers.
     */
    public void pushEmailTask(String jobId, String to, String fullName, String username, String rawPassword) {
        try {
            EmailTask task = new EmailTask(jobId, to, fullName, username, rawPassword);
            String json = objectMapper.writeValueAsString(task);
            redisTemplate.opsForList().leftPush(EMAIL_QUEUE_KEY, json);
            totalQueued.incrementAndGet();
        } catch (Exception e) {
            log.error("Failed to push email task to queue: {}", e.getMessage());
        }
    }

    /**
     * Push multiple email tasks in a batch (optimized for bulk operations).
     */
    public void pushEmailTasks(java.util.List<EmailTask> tasks) {
        try {
            String[] jsonArray = tasks.stream()
                    .map(task -> {
                        try {
                            return objectMapper.writeValueAsString(task);
                        } catch (Exception e) {
                            return null;
                        }
                    })
                    .filter(java.util.Objects::nonNull)
                    .toArray(String[]::new);

            if (jsonArray.length > 0) {
                redisTemplate.opsForList().leftPushAll(EMAIL_QUEUE_KEY, jsonArray);
                totalQueued.addAndGet(jsonArray.length);
                log.info("Pushed {} email tasks to queue", jsonArray.length);
            }
        } catch (Exception e) {
            log.error("Failed to push batch email tasks: {}", e.getMessage());
        }
    }

    /**
     * Worker thread that continuously polls the queue and processes emails.
     */
    private void runWorker(int workerId) {
        log.info("Email Worker {} started", workerId);
        while (running) {
            try {
                // Blocking pop with 1 second timeout
                String json = redisTemplate.opsForList().rightPop(EMAIL_QUEUE_KEY, 1, TimeUnit.SECONDS);
                if (json != null) {
                    EmailTask task = objectMapper.readValue(json, EmailTask.class);

                    // Check if job was cancelled
                    if (task.jobId != null && Boolean.TRUE
                            .equals(redisTemplate.opsForSet().isMember(CANCELLED_JOBS_KEY, task.jobId))) {
                        log.debug("Skipping email for cancelled job: {}", task.jobId);
                        continue;
                    }

                    emailService.sendAccountInfo(task.to, task.fullName, task.username, task.rawPassword);
                    int count = processedCount.incrementAndGet();
                    if (count % 100 == 0) {
                        log.info("Email queue progress: {}/{} processed", count, totalQueued.get());
                    }

                    // Moderate delay to avoid overloading SMTP and Gmail anti-spam filters
                    Thread.sleep(1000);
                }
            } catch (Exception e) {
                if (!running)
                    break;
                log.error("Worker {} error: {}", workerId, e.getMessage());
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException ie) {
                    break;
                }
            }
        }
        log.info("Email Worker {} stopped", workerId);
    }

    /**
     * Get current queue statistics.
     */
    public QueueStats getStats() {
        Long queueSize = redisTemplate.opsForList().size(EMAIL_QUEUE_KEY);
        return new QueueStats(
                queueSize != null ? queueSize : 0,
                processedCount.get(),
                totalQueued.get());
    }

    /**
     * Reset statistics (for new activation batch).
     */
    public void resetStats() {
        processedCount.set(0);
        totalQueued.set(0);
    }

    // DTO for email task
    public static class EmailTask {
        public String jobId;
        public String to;
        public String fullName;
        public String username;
        public String rawPassword;

        public EmailTask() {
        }

        public EmailTask(String jobId, String to, String fullName, String username, String rawPassword) {
            this.jobId = jobId;
            this.to = to;
            this.fullName = fullName;
            this.username = username;
            this.rawPassword = rawPassword;
        }
    }

    // DTO for queue statistics
    public record QueueStats(long pending, int processed, int total) {
    }
}
