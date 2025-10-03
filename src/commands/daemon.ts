import chalk from 'chalk';
import { startDaemonBackground, DaemonClient } from '../lib/daemon-server.js';
import { PromptStore } from '../lib/prompt-store.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

/**
 * Start the capture daemon as a background process
 */
export async function startDaemon() {
  console.log(chalk.cyan('Starting gitify-prompt daemon...'));

  const client = new DaemonClient();

  // Check if already running
  if (await client.isRunning()) {
    console.log(chalk.yellow('⚠ Daemon is already running'));
    console.log(chalk.gray('\nUse "gitify-prompt daemon status" to check status'));
    console.log(chalk.gray('Use "gitify-prompt daemon stop" to stop it'));
    return;
  }

  try {
    // Start daemon as detached background process
    await startDaemonBackground();

    // Wait a bit for daemon to fully start
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify it started
    if (await client.isRunning()) {
      console.log(chalk.green('✓ Daemon started successfully'));
      console.log(chalk.gray('\nThe daemon is now running in the background.'));
      console.log(chalk.gray('It will continue running even if you close this terminal.'));
      console.log(chalk.gray('\nCommands:'));
      console.log(chalk.gray('  gitify-prompt daemon status  - Check daemon status'));
      console.log(chalk.gray('  gitify-prompt daemon stop    - Stop the daemon'));
      console.log(chalk.gray('\nLogs: ' + path.join(os.tmpdir(), 'gitify-prompt', 'daemon.log')));
    } else {
      throw new Error('Daemon failed to start');
    }
  } catch (error) {
    console.error(chalk.red(`✗ Failed to start daemon: ${error.message}`));
    process.exit(1);
  }
}

/**
 * Show daemon status
 */
export async function daemonStatus() {
  const client = new DaemonClient();

  console.log(chalk.bold.cyan('Daemon Status\n'));

  // Check if daemon is running
  const isRunning = await client.isRunning();

  if (!isRunning) {
    console.log(chalk.red('✗ Daemon is not running'));
    console.log(chalk.gray('\nStart it with: gitify-prompt daemon start'));
    return;
  }

  console.log(chalk.green('✓ Daemon is running'));

  try {
    const status = await client.getStatus();
    const config = status.config;

    console.log(chalk.yellow('\nConfiguration:'));
    console.log(`  Auto-capture: ${config.autoCapture.enabled ? chalk.green('enabled') : chalk.red('disabled')}`);
    console.log(`  Tools:`);
    console.log(`    - Claude Code: ${config.autoCapture.tools['claude-code'] ? chalk.green('✓') : chalk.gray('✗')}`);
    console.log(`    - Cursor: ${config.autoCapture.tools.cursor ? chalk.green('✓') : chalk.gray('✗')}`);
    console.log(`    - ChatGPT: ${config.autoCapture.tools.chatgpt ? chalk.green('✓') : chalk.gray('✗')}`);

    console.log(chalk.yellow('\nActive Sessions:'));
    if (status.activeSessions === 0) {
      console.log(chalk.gray('  No active sessions'));
    } else {
      const sessions = await client.getActiveSessions();
      for (const session of sessions) {
        console.log(chalk.blue(`  ${session.id}`));
        console.log(chalk.gray(`    Tool: ${session.tool}`));
        console.log(chalk.gray(`    Messages: ${session.messages.length}`));
        console.log(chalk.gray(`    Code changes: ${session.codeChanges.length}`));
        console.log(chalk.gray(`    Started: ${new Date(session.startTime).toLocaleString()}`));
      }
    }

    console.log(chalk.yellow('\nPrivacy Settings:'));
    console.log(`  Mask sensitive data: ${config.privacy.maskSensitiveData ? chalk.green('yes') : chalk.red('no')}`);
    console.log(`  Exclude patterns: ${config.privacy.excludePatterns.join(', ')}`);

    console.log(chalk.yellow('\nLocations:'));
    const runtimeDir = path.join(os.tmpdir(), 'gitify-prompt');
    console.log(chalk.gray(`  Socket: ${path.join(runtimeDir, 'daemon.sock')}`));
    console.log(chalk.gray(`  PID: ${path.join(runtimeDir, 'daemon.pid')}`));
    console.log(chalk.gray(`  Log: ${path.join(runtimeDir, 'daemon.log')}`));

  } catch (error) {
    console.error(chalk.red(`✗ Error getting status: ${error.message}`));
  }
}

/**
 * Stop the daemon
 */
export async function stopDaemon() {
  const client = new DaemonClient();

  console.log(chalk.cyan('Stopping daemon...'));

  const isRunning = await client.isRunning();

  if (!isRunning) {
    console.log(chalk.yellow('⚠ Daemon is not running'));
    return;
  }

  try {
    // Read PID and kill process
    const pidPath = path.join(os.tmpdir(), 'gitify-prompt', 'daemon.pid');

    if (await fs.pathExists(pidPath)) {
      const pid = parseInt(await fs.readFile(pidPath, 'utf-8'));
      process.kill(pid, 'SIGTERM');

      // Wait for process to exit
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(chalk.green('✓ Daemon stopped'));
    } else {
      console.log(chalk.yellow('⚠ Could not find daemon PID file'));
    }
  } catch (error) {
    console.error(chalk.red(`✗ Failed to stop daemon: ${error.message}`));
  }
}

/**
 * Configure daemon settings
 */
export async function configureDaemon(options: any) {
  console.log(chalk.yellow('⚠ Configuration via daemon is not yet implemented'));
  console.log(chalk.gray('\nTo configure, edit ~/.promptrc.json manually'));
  console.log(chalk.gray('Then restart the daemon: gitify-prompt daemon stop && gitify-prompt daemon start'));

  // TODO: Implement config updates via daemon client
  // const client = new DaemonClient();
  // await client.updateConfig(newConfig);
}

/**
 * Install daemon as a system service (optional)
 */
export async function installDaemonService() {
  console.log(chalk.cyan('Installing daemon service...\n'));

  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS LaunchAgent
    await installMacOSService();
  } else if (platform === 'linux') {
    // Linux systemd service
    await installLinuxService();
  } else if (platform === 'win32') {
    // Windows service
    await installWindowsService();
  } else {
    console.error(chalk.red('Unsupported platform'));
    process.exit(1);
  }
}

async function installMacOSService() {
  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.gitforprompts.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>${process.execPath}</string>
    <string>${process.argv[1]}</string>
    <string>daemon</string>
    <string>start</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/git-prompts-daemon.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/git-prompts-daemon.error.log</string>
</dict>
</plist>`;

  const launchAgentsPath = path.join(process.env.HOME!, 'Library', 'LaunchAgents');
  await fs.ensureDir(launchAgentsPath);

  const plistPath = path.join(launchAgentsPath, 'com.gitforprompts.daemon.plist');
  await fs.writeFile(plistPath, plistContent);

  console.log(chalk.green('✓ LaunchAgent installed'));
  console.log(chalk.gray(`  Plist file: ${plistPath}`));
  console.log(chalk.yellow('\nTo start the service:'));
  console.log(chalk.gray('  launchctl load ~/Library/LaunchAgents/com.gitforprompts.daemon.plist'));
}

async function installLinuxService() {
  const serviceContent = `[Unit]
Description=Git for Prompts Daemon
After=network.target

[Service]
Type=simple
ExecStart=${process.execPath} ${process.argv[1]} daemon start
Restart=always
User=${process.env.USER}

[Install]
WantedBy=multi-user.target
`;

  const servicePath = '/etc/systemd/system/git-prompts-daemon.service';

  console.log(chalk.yellow('Service file content:\n'));
  console.log(serviceContent);
  console.log(chalk.yellow('\nTo install manually:'));
  console.log(chalk.gray(`  1. sudo nano ${servicePath}`));
  console.log(chalk.gray('  2. Paste the content above'));
  console.log(chalk.gray('  3. sudo systemctl enable git-prompts-daemon'));
  console.log(chalk.gray('  4. sudo systemctl start git-prompts-daemon'));
}

async function installWindowsService() {
  console.log(chalk.yellow('Windows service installation:\n'));
  console.log(chalk.gray('1. Install NSSM (Non-Sucking Service Manager):'));
  console.log(chalk.gray('   choco install nssm'));
  console.log(chalk.gray('\n2. Install service:'));
  console.log(chalk.gray(`   nssm install GitPromptsD "${process.execPath}" "${process.argv[1]} daemon start"`));
  console.log(chalk.gray('\n3. Start service:'));
  console.log(chalk.gray('   nssm start GitPromptsD'));
}
