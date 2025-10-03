import chalk from 'chalk';
import { CaptureDaemon } from '../lib/capture-daemon.js';
import { PromptStore } from '../lib/prompt-store.js';
import fs from 'fs-extra';
import path from 'path';

/**
 * Start the capture daemon
 */
export async function startDaemon() {
  const store = new PromptStore();

  if (!await store.exists()) {
    console.error(chalk.red('No prompts repository found. Run "prompt init" first.'));
    process.exit(1);
  }

  const daemon = new CaptureDaemon();

  console.log(chalk.cyan('Starting Git for Prompts daemon...'));

  // Setup event listeners
  daemon.on('started', () => {
    console.log(chalk.green('✓ Daemon started'));
    console.log(chalk.gray('  Watching for AI tool activity...'));
  });

  daemon.on('session-created', (session) => {
    console.log(chalk.blue(`→ New session: ${session.id} (${session.tool})`));
  });

  daemon.on('session-saved', (sessionId, promptId) => {
    console.log(chalk.green(`✓ Session saved: ${sessionId} → ${promptId}`));
  });

  daemon.on('error', (error) => {
    console.error(chalk.red(`✗ Error: ${error.message}`));
  });

  daemon.on('log', (message) => {
    console.log(chalk.gray(`  ${message}`));
  });

  await daemon.start();

  // Keep process alive
  console.log(chalk.yellow('\nPress Ctrl+C to stop the daemon'));

  process.on('SIGINT', async () => {
    console.log(chalk.cyan('\n\nStopping daemon...'));
    await daemon.stop();
    console.log(chalk.green('✓ Daemon stopped'));
    process.exit(0);
  });
}

/**
 * Show daemon status
 */
export async function daemonStatus() {
  const daemon = new CaptureDaemon();
  const sessions = daemon.getActiveSessions();
  const config = daemon.getConfig();

  console.log(chalk.bold.cyan('Daemon Status\n'));

  console.log(chalk.yellow('Configuration:'));
  console.log(`  Auto-capture: ${config.autoCapture.enabled ? chalk.green('enabled') : chalk.red('disabled')}`);
  console.log(`  Tools:`);
  console.log(`    - Claude Code: ${config.autoCapture.tools['claude-code'] ? chalk.green('✓') : chalk.gray('✗')}`);
  console.log(`    - Cursor: ${config.autoCapture.tools.cursor ? chalk.green('✓') : chalk.gray('✗')}`);
  console.log(`    - ChatGPT: ${config.autoCapture.tools.chatgpt ? chalk.green('✓') : chalk.gray('✗')}`);

  console.log(chalk.yellow('\nActive Sessions:'));
  if (sessions.length === 0) {
    console.log(chalk.gray('  No active sessions'));
  } else {
    for (const session of sessions) {
      console.log(chalk.blue(`  ${session.id}`));
      console.log(chalk.gray(`    Tool: ${session.tool}`));
      console.log(chalk.gray(`    Messages: ${session.messages.length}`));
      console.log(chalk.gray(`    Code changes: ${session.codeChanges.length}`));
      console.log(chalk.gray(`    Started: ${session.startTime.toLocaleString()}`));
    }
  }

  console.log(chalk.yellow('\nPrivacy Settings:'));
  console.log(`  Mask sensitive data: ${config.privacy.maskSensitiveData ? chalk.green('yes') : chalk.red('no')}`);
  console.log(`  Exclude patterns: ${config.privacy.excludePatterns.join(', ')}`);
}

/**
 * Configure daemon settings
 */
export async function configureDaemon(options: any) {
  const daemon = new CaptureDaemon();
  const currentConfig = daemon.getConfig();

  console.log(chalk.cyan('Configuring daemon...\n'));

  // Update configuration based on options
  const newConfig: any = { ...currentConfig };

  if (options.enableAutoCapture !== undefined) {
    newConfig.autoCapture.enabled = options.enableAutoCapture;
  }

  if (options.enableClaudeCode !== undefined) {
    newConfig.autoCapture.tools['claude-code'] = options.enableClaudeCode;
  }

  if (options.enableCursor !== undefined) {
    newConfig.autoCapture.tools.cursor = options.enableCursor;
  }

  if (options.enableChatGpt !== undefined) {
    newConfig.autoCapture.tools.chatgpt = options.enableChatGpt;
  }

  if (options.maskSensitive !== undefined) {
    newConfig.privacy.maskSensitiveData = options.maskSensitive;
  }

  // Save configuration
  await daemon.saveConfig(newConfig);

  console.log(chalk.green('✓ Configuration saved'));
  console.log(chalk.gray('\nCurrent settings:'));
  console.log(JSON.stringify(newConfig, null, 2));
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
