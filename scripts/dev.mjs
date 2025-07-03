#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting development servers...');

// Start Socket.IO server
const socketServer = spawn('bun', ['run', join(projectRoot, 'src/server/socket/server.ts')], {
  stdio: 'pipe',
  cwd: projectRoot,
});

socketServer.stdout.on('data', (data) => {
  console.log(`[SOCKET] ${data.toString().trim()}`);
});

socketServer.stderr.on('data', (data) => {
  console.error(`[SOCKET ERROR] ${data.toString().trim()}`);
});

// Start Next.js dev server
const nextServer = spawn('next', ['dev', '--turbo'], {
  stdio: 'pipe',
  cwd: projectRoot,
});

nextServer.stdout.on('data', (data) => {
  console.log(`[NEXT] ${data.toString().trim()}`);
});

nextServer.stderr.on('data', (data) => {
  console.error(`[NEXT ERROR] ${data.toString().trim()}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️  Shutting down development servers...');
  socketServer.kill('SIGINT');
  nextServer.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️  Shutting down development servers...');
  socketServer.kill('SIGTERM');
  nextServer.kill('SIGTERM');
  process.exit(0);
});

// Keep the process alive
socketServer.on('close', (code) => {
  console.log(`[SOCKET] Process exited with code ${code}`);
});

nextServer.on('close', (code) => {
  console.log(`[NEXT] Process exited with code ${code}`);
});
