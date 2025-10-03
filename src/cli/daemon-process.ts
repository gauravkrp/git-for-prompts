#!/usr/bin/env node

/**
 * Daemon Process - Background daemon entry point
 *
 * This script is spawned as a detached process to run the daemon server
 * in the background, independent of any terminal session.
 */

import { DaemonServer } from '../lib/daemon-server.js';

async function main() {
  const server = new DaemonServer();

  try {
    await server.startServer();

    const paths = server.getPaths();
    console.log('Daemon started successfully');
    console.log(`Socket: ${paths.socket}`);
    console.log(`PID: ${paths.pid}`);
    console.log(`Log: ${paths.log}`);

    // Keep process running
    process.on('SIGINT', async () => {
      await server.stop();
    });

    process.on('SIGTERM', async () => {
      await server.stop();
    });

  } catch (error) {
    console.error('Failed to start daemon:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
