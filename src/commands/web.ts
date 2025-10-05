import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { PromptReader } from '../lib/prompt-reader.js';

export interface WebOptions {
  open?: boolean;
  output?: string;
}

export async function webCommand(options: WebOptions) {
  const reader = new PromptReader();

  // Check if .prompts directory exists
  if (!reader.exists()) {
    console.log(chalk.yellow('No .prompts directory found in current repository.'));
    console.log(chalk.gray('Run `gitify-prompt init` to initialize.'));
    return;
  }

  const prompts = reader.listAll();

  if (prompts.length === 0) {
    console.log(chalk.yellow('No prompts found to generate.'));
    console.log(chalk.gray('Capture some prompts first by using Claude Code with gitify-prompt enabled.'));
    return;
  }

  console.log(chalk.cyan('Generating web dashboard...'));
  console.log(chalk.gray(`Found ${prompts.length} prompt(s)`));

  const outputDir = options.output || path.join(process.cwd(), '.prompts', 'web');
  const promptsDir = path.join(outputDir, 'prompts');
  const assetsDir = path.join(outputDir, 'assets');

  // Create directories
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(promptsDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });

  // Generate data.json
  const allPromptsData = prompts.map(p => reader.getBySha(p.sha));
  fs.writeFileSync(
    path.join(outputDir, 'data.json'),
    JSON.stringify(allPromptsData, null, 2)
  );
  console.log(chalk.green('✓') + ' Generated data.json');

  // Generate styles.css
  fs.writeFileSync(path.join(assetsDir, 'styles.css'), generateCSS());
  console.log(chalk.green('✓') + ' Generated styles.css');

  // Generate app.js
  fs.writeFileSync(path.join(assetsDir, 'app.js'), generateJS());
  console.log(chalk.green('✓') + ' Generated app.js');

  // Generate individual prompt pages
  for (const promptMeta of prompts) {
    const prompt = reader.getBySha(promptMeta.sha);
    if (prompt) {
      const html = generatePromptPage(prompt);
      fs.writeFileSync(path.join(promptsDir, `${promptMeta.sha}.html`), html);
    }
  }
  console.log(chalk.green('✓') + ` Generated ${prompts.length} prompt page(s)`);

  // Generate index.html
  const indexHtml = generateIndexPage(prompts);
  fs.writeFileSync(path.join(outputDir, 'index.html'), indexHtml);
  console.log(chalk.green('✓') + ' Generated index.html');

  console.log();
  console.log(chalk.bold.green('Dashboard created successfully!'));
  console.log();
  console.log(chalk.white('Location: ') + chalk.cyan(outputDir));
  console.log();
  console.log(chalk.white('Open in browser:'));
  console.log(chalk.gray('  file://' + path.join(outputDir, 'index.html')));
  console.log();
  console.log(chalk.white('Or commit to use with GitHub Pages:'));
  console.log(chalk.gray('  git add .prompts/web/'));
  console.log(chalk.gray('  git commit -m "Update prompt dashboard"'));
  console.log(chalk.gray('  git push'));
  console.log();

  if (options.open) {
    // Try to open in browser
    const { default: open } = await import('open');
    await open(path.join(outputDir, 'index.html'));
  }
}

/**
 * Generate index.html
 */
function generateIndexPage(prompts: any[]): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gitify Prompt Dashboard</title>
  <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>🎯 Gitify Prompt Dashboard</h1>
      <p class="subtitle">Captured Claude Code conversations</p>
    </header>

    <div class="filters">
      <input type="text" id="search" placeholder="Search prompts..." />
      <select id="branchFilter">
        <option value="">All branches</option>
        ${[...new Set(prompts.map(p => p.branch).filter(Boolean))].map(b =>
          `<option value="${b}">${b}</option>`
        ).join('\n        ')}
      </select>
      <select id="authorFilter">
        <option value="">All authors</option>
        ${[...new Set(prompts.map(p => p.author?.name).filter(Boolean))].map(a =>
          `<option value="${a}">@${a}</option>`
        ).join('\n        ')}
      </select>
    </div>

    <div id="promptList" class="prompt-list">
      ${prompts.map(p => generatePromptCard(p)).join('\n      ')}
    </div>
  </div>

  <script src="assets/app.js"></script>
  <script>
    const prompts = ${JSON.stringify(prompts)};
    initDashboard(prompts);
  </script>
</body>
</html>`;
}

/**
 * Generate a prompt card for the list
 */
function generatePromptCard(prompt: any): string {
  const branchDisplay = prompt.parentBranch && prompt.branch !== prompt.parentBranch
    ? `${prompt.branch} ← ${prompt.parentBranch}`
    : prompt.branch || 'unknown';

  const author = prompt.author?.name || 'Unknown';
  const date = new Date(prompt.timestamp).toLocaleString();

  return `<div class="prompt-card" data-sha="${prompt.sha}" data-branch="${prompt.branch || ''}" data-author="${author}">
    <div class="card-header">
      <div class="sha">${prompt.sha.substring(0, 7)}</div>
      <div class="date">${date}</div>
    </div>
    <div class="card-body">
      <div class="branch">${branchDisplay}</div>
      <div class="author">@${author}</div>
    </div>
    <div class="card-footer">
      <span class="badge">💬 ${prompt.messageCount} messages</span>
      <span class="badge">📝 ${prompt.fileCount} files</span>
      <a href="prompts/${prompt.sha}.html" class="view-link">View →</a>
    </div>
  </div>`;
}

/**
 * Generate individual prompt page
 */
function generatePromptPage(prompt: any): string {
  const messages = prompt.messages || [];
  const files = prompt.filesModified || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompt ${prompt.metadata.commitSha?.substring(0, 7) || 'Unknown'}</title>
  <link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="../index.html">← Back to dashboard</a>
    </nav>

    <header class="prompt-header">
      <h1>Commit: ${prompt.metadata.commitSha || 'unknown'}</h1>
      <div class="metadata">
        ${prompt.metadata.branch ? `<div><strong>Branch:</strong> ${prompt.metadata.branch}${prompt.metadata.parentBranch && prompt.metadata.branch !== prompt.metadata.parentBranch ? ` ← ${prompt.metadata.parentBranch}` : ''}</div>` : ''}
        ${prompt.author ? `<div><strong>Author:</strong> ${prompt.author.name} &lt;${prompt.author.email}&gt;</div>` : ''}
        <div><strong>Date:</strong> ${new Date(prompt.startTime).toLocaleString()}</div>
        <div><strong>Messages:</strong> ${messages.length} • <strong>Files:</strong> ${files.length}</div>
      </div>
    </header>

    <section class="conversation">
      <h2>💬 Conversation</h2>
      ${messages.length === 0
        ? '<p class="no-data">No conversation messages captured.</p>'
        : messages.map((msg: any) => `
          <div class="message ${msg.role}">
            <div class="message-header">
              <span class="role-icon">${msg.role === 'user' ? '👤' : '🤖'}</span>
              <span class="role-name">${msg.role === 'user' ? 'You' : 'Claude'}</span>
              <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content)}</div>
          </div>
        `).join('\n      ')}
    </section>

    <section class="files">
      <h2>📝 Files Modified (${files.length})</h2>
      ${files.length === 0
        ? '<p class="no-data">No files were modified.</p>'
        : `<ul class="file-list">
          ${files.map((file: any) => `
            <li>
              <span class="timestamp">${new Date(file.timestamp).toLocaleTimeString()}</span>
              <span class="file-path">${file.file.replace(process.cwd(), '.')}</span>
            </li>
          `).join('\n          ')}
        </ul>`}
    </section>
  </div>
</body>
</html>`;
}

/**
 * Generate CSS
 */
function generateCSS(): string {
  return `/* Gitify Prompt Dashboard Styles */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #2d3748;
  line-height: 1.6;
  min-height: 100vh;
  padding: 2rem 1rem;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  padding: 2rem;
}

header {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
}

header h1 {
  font-size: 2.5rem;
  color: #667eea;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #718096;
  font-size: 1.1rem;
}

/* Filters */
.filters {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.filters input,
.filters select {
  padding: 0.75rem 1rem;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.filters input {
  flex: 1;
  min-width: 200px;
}

.filters input:focus,
.filters select:focus {
  outline: none;
  border-color: #667eea;
}

/* Prompt List */
.prompt-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.prompt-card {
  background: #f7fafc;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 1.25rem;
  transition: all 0.2s;
  cursor: pointer;
}

.prompt-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sha {
  font-family: 'Monaco', 'Courier New', monospace;
  background: #667eea;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: bold;
}

.date {
  color: #718096;
  font-size: 0.875rem;
}

.card-body {
  margin-bottom: 1rem;
}

.branch {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.author {
  color: #4a5568;
  font-size: 0.875rem;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.badge {
  font-size: 0.875rem;
  color: #4a5568;
}

.view-link {
  margin-left: auto;
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.view-link:hover {
  color: #764ba2;
}

/* Prompt Page */
.breadcrumb {
  margin-bottom: 1.5rem;
}

.breadcrumb a {
  color: #667eea;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.breadcrumb a:hover {
  color: #764ba2;
}

.prompt-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid #e2e8f0;
}

.prompt-header h1 {
  font-size: 1.75rem;
  color: #2d3748;
  margin-bottom: 1rem;
  word-break: break-all;
}

.metadata {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
  color: #4a5568;
  font-size: 0.95rem;
}

.metadata strong {
  color: #2d3748;
}

/* Conversation */
.conversation,
.files {
  margin-bottom: 2rem;
}

.conversation h2,
.files h2 {
  font-size: 1.5rem;
  color: #2d3748;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.message {
  background: #f7fafc;
  border-left: 4px solid #cbd5e0;
  border-radius: 8px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.message.user {
  border-left-color: #667eea;
  background: #edf2f7;
}

.message.assistant {
  border-left-color: #48bb78;
  background: #f0fff4;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #2d3748;
}

.role-icon {
  font-size: 1.25rem;
}

.timestamp {
  margin-left: auto;
  font-size: 0.875rem;
  color: #718096;
  font-weight: normal;
}

.message-content {
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #4a5568;
  line-height: 1.7;
}

/* Files */
.file-list {
  list-style: none;
  background: #f7fafc;
  border-radius: 8px;
  padding: 1rem;
}

.file-list li {
  padding: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.file-list li:last-child {
  border-bottom: none;
}

.file-path {
  font-family: 'Monaco', 'Courier New', monospace;
  color: #2d3748;
  font-size: 0.9rem;
}

.no-data {
  color: #718096;
  font-style: italic;
  padding: 2rem;
  text-align: center;
  background: #f7fafc;
  border-radius: 8px;
}

/* Responsive */
@media (max-width: 768px) {
  .prompt-list {
    grid-template-columns: 1fr;
  }

  header h1 {
    font-size: 2rem;
  }

  .filters {
    flex-direction: column;
  }

  .filters input,
  .filters select {
    width: 100%;
  }
}
`;
}

/**
 * Generate JavaScript for client-side filtering
 */
function generateJS(): string {
  return `// Gitify Prompt Dashboard JavaScript

function initDashboard(prompts) {
  const searchInput = document.getElementById('search');
  const branchFilter = document.getElementById('branchFilter');
  const authorFilter = document.getElementById('authorFilter');
  const promptList = document.getElementById('promptList');

  function filterPrompts() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedBranch = branchFilter.value;
    const selectedAuthor = authorFilter.value;

    const cards = promptList.querySelectorAll('.prompt-card');

    cards.forEach(card => {
      const sha = card.dataset.sha.toLowerCase();
      const branch = card.dataset.branch;
      const author = card.dataset.author;
      const text = card.textContent.toLowerCase();

      const matchesSearch = !searchTerm || text.includes(searchTerm) || sha.includes(searchTerm);
      const matchesBranch = !selectedBranch || branch === selectedBranch;
      const matchesAuthor = !selectedAuthor || author === selectedAuthor;

      if (matchesSearch && matchesBranch && matchesAuthor) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  }

  searchInput.addEventListener('input', filterPrompts);
  branchFilter.addEventListener('change', filterPrompts);
  authorFilter.addEventListener('change', filterPrompts);
}
`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\n/g, '<br>');
}
