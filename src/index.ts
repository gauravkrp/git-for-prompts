/**
 * Git for Prompts - Main Exports
 *
 * This module exports all public APIs for programmatic use.
 */

// Core storage and LLM interaction
export { PromptStore } from './lib/prompt-store.js';
export { LLMRunner } from './lib/llm-runner.js';

// Automation and capture
export { CaptureDaemon } from './lib/capture-daemon.js';
export { ClaudeCodeIntegration, claudeCodeIntegration } from './lib/claude-code-integration.js';
export { DaemonServer, DaemonClient, startDaemonBackground } from './lib/daemon-server.js';

// Types
export * from './types/index.js';
