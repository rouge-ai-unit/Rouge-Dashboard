#!/usr/bin/env node

/**
 * Agritech Universities Worker Script
 *
 * This script starts the BullMQ worker that processes agritech university extraction jobs.
 * Run this in a separate process or container from your main Next.js application.
 *
 * Usage:
 * npm run worker:agritech
 *
 * Environment Variables Required:
 * - REDIS_URL or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD
 * - OPENAI_API_KEY
 * - DATABASE_URL
 */

// Load environment variables from .env files
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the worker
const require = createRequire(import.meta.url);
const workerPath = join(__dirname, '../worker/agritech-universities-worker.ts');

// For ES modules, we need to use dynamic import
const startWorker = async () => {
  try {
    console.log('🚀 Starting Agritech Universities Worker...');

    // Check for required environment variables
    const requiredEnvVars = [
      'DEEPSEEK_API_KEY',
      'DATABASE_URL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:');
      missingVars.forEach(varName => console.error(`   - ${varName}`));
      process.exit(1);
    }

    // Redis configuration check
    const hasRedisUrl = process.env.REDIS_URL;
    const hasRedisHost = process.env.REDIS_HOST;

    if (!hasRedisUrl && !hasRedisHost) {
      console.error('❌ Redis configuration missing. Set either:');
      console.error('   - REDIS_URL');
      console.error('   - REDIS_HOST, REDIS_PORT, REDIS_PASSWORD (optional)');
      process.exit(1);
    }

    console.log('✅ Environment variables validated');
    console.log('✅ Redis configuration found');

    // Import and start the worker using ts-node
    const { spawn } = await import('child_process');
    
    console.log('✅ Worker module loaded successfully');

    // Start the worker using ts-node as a child process
    const workerProcess = spawn('npx', ['ts-node', '--esm', 'worker/agritech-universities-worker.ts'], {
      stdio: 'inherit',
      cwd: join(__dirname, '..'),
      env: process.env
    });

    // Handle child process events
    workerProcess.on('close', (code) => {
      console.log(`Worker process exited with code ${code}`);
      process.exit(code);
    });

    workerProcess.on('error', (error) => {
      console.error('Failed to start worker process:', error);
      process.exit(1);
    });
    console.log('🎯 Agritech Universities Worker is now running and listening for jobs!');
    console.log('📋 Queue: agritech-extraction');
    console.log('🔄 Concurrency: 2 jobs');
    console.log('⏰ Press Ctrl+C to stop the worker');

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start worker:', error);
    process.exit(1);
  }
};

// Start the worker
startWorker();
