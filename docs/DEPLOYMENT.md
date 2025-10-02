# Deployment Guide - Git for Prompts

## Table of Contents
1. [Overview](#overview)
2. [Local Development](#local-development)
3. [Team Deployment](#team-deployment)
4. [CI/CD Integration](#cicd-integration)
5. [Production Deployment](#production-deployment)
6. [Cloud Deployment](#cloud-deployment)
7. [Enterprise Deployment](#enterprise-deployment)
8. [Monitoring & Maintenance](#monitoring--maintenance)

## Overview

Git for Prompts can be deployed in various configurations depending on your needs:

- **Local**: Single developer usage
- **Team**: Shared repository with multiple developers
- **CI/CD**: Automated testing in pipelines
- **Production**: Integration with production applications
- **Cloud**: Hosted solution with API access
- **Enterprise**: On-premise with security controls

## Local Development

### Quick Setup

```bash
# 1. Install globally
npm install -g git-for-prompts

# 2. Initialize repository
prompt init

# 3. Configure environment
cp .env.example .env
echo "OPENAI_API_KEY=sk-your-key" >> .env

# 4. Test installation
prompt list
```

### Development Workflow

```bash
# Start development
git checkout -b feature/new-prompts

# Work on prompts
prompt commit my-prompt -m "Add new prompt"
prompt test my-prompt

# Commit to git
git add .prompts/
git commit -m "feat: add new prompt"
git push origin feature/new-prompts
```

## Team Deployment

### Repository Setup

#### Option 1: Monorepo (Recommended)
```
your-app/
├── .prompts/          # Prompts live with code
├── src/
├── package.json
└── .github/
    └── workflows/
        └── prompt-tests.yml
```

#### Option 2: Separate Repository
```
# Main app repo
your-app/
└── src/

# Prompts repo
your-prompts/
└── .prompts/
```

### Team Configuration

1. **Create shared configuration:**
```yaml
# .prompts/config.yaml
version: '1.0'
defaultModel: gpt-4
testDefaults:
  temperature: 0.7
  maxTokens: 1000
team:
  reviewRequired: true
  autoTest: true
  models:
    - gpt-4
    - gpt-3.5-turbo
```

2. **Set up branch protection:**
```bash
# GitHub settings
- Require pull request reviews
- Require status checks (prompt tests)
- Require branches to be up to date
```

3. **Configure CODEOWNERS:**
```bash
# .github/CODEOWNERS
.prompts/ @prompt-engineering-team
.prompts/critical/ @senior-engineers
```

### Access Control

```bash
# Environment-based access
# .env.development
OPENAI_API_KEY=$OPENAI_DEV_KEY

# .env.staging
OPENAI_API_KEY=$OPENAI_STAGING_KEY

# .env.production
OPENAI_API_KEY=$OPENAI_PROD_KEY
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/prompt-ci.yml
name: Prompt CI/CD

on:
  pull_request:
    paths:
      - '.prompts/**'
      - 'package.json'
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20]
        model: [gpt-4, gpt-3.5-turbo]

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js ${{ matrix.node }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node }}

      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: ~/.npm
          key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}

      - name: Install dependencies
        run: npm ci

      - name: Run prompt tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          TEST_MODEL: ${{ matrix.model }}
        run: |
          npm run test:prompts -- --model ${{ matrix.model }}

      - name: Generate diff report
        if: github.event_name == 'pull_request'
        run: |
          npm run prompts:diff > diff-report.md

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('diff-report.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy prompts
        run: |
          # Deploy to production prompt store
          npm run deploy:prompts

      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Prompts deployed to production'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - deploy

test-prompts:
  stage: test
  script:
    - npm install
    - npm run test:prompts
  artifacts:
    reports:
      junit: test-results.xml

deploy-prompts:
  stage: deploy
  script:
    - npm run deploy:prompts
  only:
    - main
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
  agent any

  environment {
    OPENAI_API_KEY = credentials('openai-api-key')
  }

  stages {
    stage('Test Prompts') {
      steps {
        sh 'npm install'
        sh 'npm run test:prompts'
      }
    }

    stage('Deploy') {
      when {
        branch 'main'
      }
      steps {
        sh 'npm run deploy:prompts'
      }
    }
  }

  post {
    always {
      junit 'test-results.xml'
    }
  }
}
```

## Production Deployment

### Application Integration

#### Node.js/Express
```javascript
// server.js
const express = require('express');
const { PromptStore } = require('git-prompts');

const app = express();
const promptStore = new PromptStore();

// Middleware to load prompts
app.use(async (req, res, next) => {
  req.prompts = promptStore;
  next();
});

// API endpoint
app.post('/api/generate', async (req, res) => {
  const prompt = await req.prompts.getPrompt(req.body.promptId);
  // Use prompt with LLM
  res.json({ response: generatedContent });
});
```

#### Python/FastAPI
```python
# main.py
from fastapi import FastAPI
import subprocess
import json

app = FastAPI()

def get_prompt(prompt_id: str, version: str = None):
    cmd = ['prompt', 'get', prompt_id]
    if version:
        cmd.extend(['--version', version])
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)

@app.post("/generate")
async def generate(prompt_id: str):
    prompt = get_prompt(prompt_id)
    # Use prompt with LLM
    return {"response": generated_content}
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install git-prompts globally
RUN npm install -g git-prompts

# Copy prompts repository
COPY .prompts .prompts

# Copy application
COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./.prompts:/app/.prompts
      - prompt-cache:/app/.cache

  prompt-tester:
    build: .
    command: prompt test --watch
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./.prompts:/app/.prompts

volumes:
  prompt-cache:
```

### Kubernetes Deployment

```yaml
# prompt-store-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prompt-store-config
data:
  config.yaml: |
    version: '1.0'
    defaultModel: gpt-4
    testDefaults:
      temperature: 0.7
      maxTokens: 1000

---
# prompt-store-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prompt-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: prompt-app
  template:
    metadata:
      labels:
        app: prompt-app
    spec:
      containers:
      - name: app
        image: your-registry/prompt-app:latest
        ports:
        - containerPort: 3000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-secret
              key: api-key
        volumeMounts:
        - name: prompt-store
          mountPath: /app/.prompts
        - name: config
          mountPath: /app/.prompts/config.yaml
          subPath: config.yaml
      volumes:
      - name: prompt-store
        persistentVolumeClaim:
          claimName: prompt-store-pvc
      - name: config
        configMap:
          name: prompt-store-config

---
# Service
apiVersion: v1
kind: Service
metadata:
  name: prompt-app-service
spec:
  selector:
    app: prompt-app
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

## Cloud Deployment

### AWS Deployment

```bash
# Using AWS Lambda
# serverless.yml
service: git-prompts-api

provider:
  name: aws
  runtime: nodejs18.x
  environment:
    OPENAI_API_KEY: ${env:OPENAI_API_KEY}

functions:
  getPrompt:
    handler: handler.getPrompt
    events:
      - http:
          path: prompts/{id}
          method: get

  runPrompt:
    handler: handler.runPrompt
    events:
      - http:
          path: prompts/{id}/run
          method: post
    timeout: 30

resources:
  Resources:
    PromptBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:service}-prompts
        VersioningConfiguration:
          Status: Enabled
```

### Google Cloud Platform

```yaml
# app.yaml
runtime: nodejs18

env_variables:
  OPENAI_API_KEY: "your-key"

handlers:
- url: /api/.*
  script: auto

automatic_scaling:
  min_instances: 1
  max_instances: 10
```

### Azure Deployment

```json
// azure-function/function.json
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get", "post"]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

## Enterprise Deployment

### On-Premise Setup

```bash
# 1. Install on internal server
npm install -g git-prompts

# 2. Configure with internal Git
git config --global url."https://internal-git.company.com/".insteadOf "https://github.com/"

# 3. Set up internal registry
npm config set registry https://internal-npm.company.com/

# 4. Configure security
export PROMPT_ENCRYPTION_KEY=company-secret-key
export PROMPT_AUDIT_LOG=/var/log/prompts/audit.log
```

### Security Configuration

```yaml
# security-config.yaml
security:
  encryption:
    enabled: true
    algorithm: AES-256-GCM
    keyRotation: 30d

  access:
    authentication: required
    providers:
      - ldap
      - oauth2
    rbac:
      enabled: true
      roles:
        - name: prompt-admin
          permissions: [create, read, update, delete]
        - name: prompt-user
          permissions: [read]

  audit:
    enabled: true
    logPath: /var/log/git-prompts/
    retention: 90d
    events:
      - prompt.create
      - prompt.update
      - prompt.delete
      - prompt.execute

  compliance:
    pii:
      detection: true
      redaction: true
    standards:
      - SOC2
      - GDPR
      - HIPAA
```

### High Availability Setup

```nginx
# nginx.conf
upstream prompt-api {
    least_conn;
    server prompt1.internal:3000;
    server prompt2.internal:3000;
    server prompt3.internal:3000;
}

server {
    listen 443 ssl;
    server_name prompts.company.com;

    ssl_certificate /etc/ssl/certs/company.crt;
    ssl_certificate_key /etc/ssl/private/company.key;

    location / {
        proxy_pass http://prompt-api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring & Maintenance

### Health Checks

```javascript
// healthcheck.js
const { PromptStore } = require('git-prompts');

async function healthCheck() {
  const store = new PromptStore();

  try {
    // Check store accessibility
    await store.exists();

    // Check API connectivity
    const testResult = await store.testConnection();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        store: 'ok',
        api: testResult ? 'ok' : 'degraded'
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
}
```

### Metrics Collection

```javascript
// metrics.js
const prometheus = require('prom-client');

// Define metrics
const promptCounter = new prometheus.Counter({
  name: 'prompts_executed_total',
  help: 'Total number of prompts executed',
  labelNames: ['prompt_id', 'model', 'status']
});

const promptDuration = new prometheus.Histogram({
  name: 'prompt_execution_duration_seconds',
  help: 'Prompt execution duration in seconds',
  labelNames: ['prompt_id', 'model']
});

// Track metrics
function trackPromptExecution(promptId, model, duration, status) {
  promptCounter.inc({ prompt_id: promptId, model, status });
  promptDuration.observe({ prompt_id: promptId, model }, duration);
}
```

### Backup Strategy

```bash
#!/bin/bash
# backup-prompts.sh

BACKUP_DIR="/backups/prompts"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup
tar -czf "$BACKUP_DIR/prompts_$TIMESTAMP.tar.gz" .prompts/

# Rotate old backups (keep last 30)
ls -t "$BACKUP_DIR"/prompts_*.tar.gz | tail -n +31 | xargs -r rm

# Sync to remote storage
aws s3 sync "$BACKUP_DIR" s3://backup-bucket/prompts/
```

### Update Process

```bash
# 1. Check current version
prompt --version

# 2. Backup current installation
cp -r .prompts .prompts.backup

# 3. Update to latest
npm update -g git-prompts

# 4. Run migration if needed
prompt migrate

# 5. Test
prompt test

# 6. Rollback if issues
mv .prompts.backup .prompts
npm install -g git-prompts@previous-version
```

## Troubleshooting Deployment

### Common Issues

1. **API Key Issues**
```bash
# Verify API key
echo $OPENAI_API_KEY
# Test connectivity
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

2. **Permission Issues**
```bash
# Fix permissions
chmod -R 755 .prompts/
chown -R app:app .prompts/
```

3. **Network Issues**
```bash
# Test proxy settings
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

4. **Performance Issues**
```bash
# Enable caching
export PROMPT_CACHE=true
export PROMPT_CACHE_TTL=3600

# Increase timeout
export PROMPT_TIMEOUT=60000
```

### Support

For deployment support:
- Documentation: docs/
- Issues: GitHub Issues
- Enterprise: support@git-prompts.com