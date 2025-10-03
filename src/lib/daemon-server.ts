import { CaptureDaemon } from './capture-daemon.js';
import net from 'net';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';

/**
 * DaemonServer - Persistent background daemon with IPC
 *
 * This server runs as a detached background process and accepts
 * connections from multiple terminals/processes via Unix socket.
 *
 * Features:
 * - Runs independently of terminal session
 * - Survives terminal close
 * - Multiple clients can connect
 * - PID file for process tracking
 * - Unix socket for IPC
 */

export class DaemonServer {
  private daemon: CaptureDaemon;
  private server: net.Server | null = null;
  private socketPath: string;
  private pidPath: string;
  private logPath: string;

  constructor() {
    this.daemon = new CaptureDaemon();

    const runtimeDir = path.join(os.tmpdir(), 'gitify-prompt');
    this.socketPath = path.join(runtimeDir, 'daemon.sock');
    this.pidPath = path.join(runtimeDir, 'daemon.pid');
    this.logPath = path.join(runtimeDir, 'daemon.log');
  }

  /**
   * Start the daemon server in the current process
   */
  async startServer(): Promise<void> {
    // Ensure runtime directory exists
    await fs.ensureDir(path.dirname(this.socketPath));

    // Check if daemon is already running
    if (await this.isRunning()) {
      throw new Error('Daemon is already running');
    }

    // Clean up old socket file if it exists
    if (await fs.pathExists(this.socketPath)) {
      await fs.unlink(this.socketPath);
    }

    // Start the capture daemon
    await this.daemon.start();

    // Create Unix socket server
    this.server = net.createServer((socket) => {
      this.handleClient(socket);
    });

    this.server.listen(this.socketPath);

    // Write PID file
    await fs.writeFile(this.pidPath, process.pid.toString());

    // Setup cleanup on exit
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());

    this.log('Daemon server started');
  }

  /**
   * Handle client connection
   */
  private handleClient(socket: net.Socket): void {
    this.log('Client connected');

    socket.on('data', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const response = await this.handleMessage(message);
        socket.write(JSON.stringify(response) + '\n');
      } catch (error) {
        socket.write(JSON.stringify({
          error: error.message
        }) + '\n');
      }
    });

    socket.on('error', (err) => {
      this.log(`Socket error: ${err.message}`);
    });

    socket.on('end', () => {
      this.log('Client disconnected');
    });
  }

  /**
   * Handle messages from clients
   */
  private async handleMessage(message: any): Promise<any> {
    const { command, ...args } = message;

    switch (command) {
      case 'createSession':
        const sessionId = this.daemon.createSession(args.tool, args.metadata);
        return { sessionId };

      case 'addMessage':
        this.daemon.addMessage(args.sessionId, args.role, args.content);
        return { success: true };

      case 'addCodeChange':
        this.daemon.addCodeChange(
          args.sessionId,
          args.filePath,
          args.beforeContent,
          args.afterContent
        );
        return { success: true };

      case 'saveSession':
        const session = this.daemon.getSession(args.sessionId);
        if (session) {
          await this.daemon.saveSession(session, args.commitSha);
        }
        return { success: true };

      case 'saveSessionsForRepo':
        // Save all sessions for a specific repo
        const repoPath = args.repoPath;
        const commitSha = args.commitSha;
        const sessionsForRepo = this.daemon.getActiveSessions();

        // Filter sessions that belong to this repo
        const repoSessions = sessionsForRepo.filter(s =>
          s.metadata.cwd === repoPath ||
          s.metadata.repoPath === repoPath
        );

        this.log(`Saving ${repoSessions.length} sessions for repo ${repoPath}`);

        for (const session of repoSessions) {
          await this.daemon.saveSession(session, commitSha);
        }

        return {
          success: true,
          sessionsSaved: repoSessions.length
        };

      case 'getActiveSessions':
        // Optionally filter by repo
        let sessions = this.daemon.getActiveSessions();
        if (args.repoPath) {
          sessions = sessions.filter(s =>
            s.metadata.cwd === args.repoPath ||
            s.metadata.repoPath === args.repoPath
          );
        }
        return { sessions };

      case 'getConfig':
        return { config: this.daemon.getConfig() };

      case 'status':
        const allSessions = this.daemon.getActiveSessions();

        // Group sessions by repo
        const sessionsByRepo: Record<string, number> = {};
        allSessions.forEach(s => {
          const repo = s.metadata.cwd || s.metadata.repoPath || 'unknown';
          sessionsByRepo[repo] = (sessionsByRepo[repo] || 0) + 1;
        });

        return {
          running: true,
          activeSessions: allSessions.length,
          sessionsByRepo,
          config: this.daemon.getConfig()
        };

      case 'ping':
        return { pong: true };

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  }

  /**
   * Stop the daemon server
   */
  async stop(): Promise<void> {
    this.log('Stopping daemon server...');

    // Stop the capture daemon
    await this.daemon.stop();

    // Close the server
    if (this.server) {
      this.server.close();
    }

    // Clean up socket and PID files
    try {
      if (await fs.pathExists(this.socketPath)) {
        await fs.unlink(this.socketPath);
      }
      if (await fs.pathExists(this.pidPath)) {
        await fs.unlink(this.pidPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }

    this.log('Daemon server stopped');
    process.exit(0);
  }

  /**
   * Check if daemon is running
   */
  async isRunning(): Promise<boolean> {
    try {
      if (!await fs.pathExists(this.pidPath)) {
        return false;
      }

      const pid = parseInt(await fs.readFile(this.pidPath, 'utf-8'));

      // Check if process exists
      try {
        process.kill(pid, 0); // Signal 0 checks existence without killing
        return true;
      } catch (error) {
        // Process doesn't exist, clean up stale PID file
        await fs.unlink(this.pidPath);
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Log to daemon log file
   */
  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(this.logPath, logMessage);
  }

  /**
   * Get paths for debugging
   */
  getPaths(): { socket: string; pid: string; log: string } {
    return {
      socket: this.socketPath,
      pid: this.pidPath,
      log: this.logPath
    };
  }
}

/**
 * Start daemon as detached background process
 */
export async function startDaemonBackground(): Promise<void> {
  // In ESM, __dirname doesn't exist, use import.meta.url
  // But since we're CommonJS in compiled output, use __dirname
  const scriptPath = path.join(__dirname, '..', 'cli', 'daemon-process.js');

  const child = spawn(
    process.execPath,
    [scriptPath],
    {
      detached: true,
      stdio: 'ignore'
    }
  );

  child.unref(); // Allow parent to exit

  // Wait a bit to ensure it started
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * DaemonClient - Client to communicate with daemon server
 */
export class DaemonClient {
  private socketPath: string;

  constructor() {
    const runtimeDir = path.join(os.tmpdir(), 'gitify-prompt');
    this.socketPath = path.join(runtimeDir, 'daemon.sock');
  }

  /**
   * Send command to daemon and get response
   */
  async send(command: string, args: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = net.connect(this.socketPath);

      client.on('connect', () => {
        const message = JSON.stringify({ command, ...args });
        client.write(message);
      });

      client.on('data', (data) => {
        try {
          const response = JSON.parse(data.toString());
          client.end();

          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(error);
        }
      });

      client.on('error', (err) => {
        reject(new Error(`Cannot connect to daemon: ${err.message}`));
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        client.destroy();
        reject(new Error('Request timeout'));
      }, 5000);
    });
  }

  /**
   * Check if daemon is running
   */
  async isRunning(): Promise<boolean> {
    try {
      await this.send('ping');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get daemon status
   */
  async getStatus(): Promise<any> {
    return await this.send('status');
  }

  /**
   * Create a new capture session
   */
  async createSession(tool: string, metadata: any = {}): Promise<string> {
    const result = await this.send('createSession', { tool, metadata });
    return result.sessionId;
  }

  /**
   * Add a message to a session
   */
  async addMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await this.send('addMessage', { sessionId, role, content });
  }

  /**
   * Add a code change to a session
   */
  async addCodeChange(
    sessionId: string,
    filePath: string,
    beforeContent: string,
    afterContent: string
  ): Promise<void> {
    await this.send('addCodeChange', { sessionId, filePath, beforeContent, afterContent });
  }

  /**
   * Save a session
   */
  async saveSession(sessionId: string, commitSha?: string): Promise<void> {
    await this.send('saveSession', { sessionId, commitSha });
  }

  /**
   * Save all sessions for a specific repo
   */
  async saveSessionsForRepo(repoPath: string, commitSha: string): Promise<number> {
    const result = await this.send('saveSessionsForRepo', { repoPath, commitSha });
    return result.sessionsSaved;
  }

  /**
   * Get active sessions (optionally filter by repo)
   */
  async getActiveSessions(repoPath?: string): Promise<any[]> {
    const result = await this.send('getActiveSessions', { repoPath });
    return result.sessions;
  }

  /**
   * Get daemon configuration
   */
  async getConfig(): Promise<any> {
    const result = await this.send('getConfig');
    return result.config;
  }
}
