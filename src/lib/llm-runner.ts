import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs-extra';
import path from 'path';

dotenv.config();

/**
 * LLMRunner - Manages LLM API interactions and test execution
 *
 * This class provides a unified interface for:
 * - Running prompts against multiple LLM providers
 * - Executing test suites with various validation types
 * - Collecting metrics and performance data
 * - Comparing outputs between prompt versions
 *
 * @class LLMRunner
 */
export class LLMRunner {
  private openai: any;

  /**
   * Creates a new LLMRunner instance and initializes providers
   */
  constructor() {
    this.openai = null;
    this.initializeProviders();
  }

  /**
   * Initializes LLM provider clients based on available API keys
   * Currently supports OpenAI with plans for Anthropic and local models
   */
  initializeProviders() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
  }

  async runPrompt(prompt: any, options: any = {}) {
    const model = options.model || prompt?.metadata?.model || 'gpt-4';
    const temperature = options.temperature ?? prompt?.metadata?.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? prompt?.metadata?.maxTokens ?? 1000;

    const startTime = Date.now();

    try {
      let response;
      let metrics = {};

      if (model.startsWith('gpt')) {
        if (!this.openai) {
          throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
        }

        const completion = await this.openai.chat.completions.create({
          model,
          messages: [
            { role: 'user', content: prompt.content }
          ],
          temperature,
          max_tokens: maxTokens
        });

        response = completion.choices[0].message.content;
        metrics = {
          tokens: completion.usage?.total_tokens,
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens,
          model: completion.model
        };
      } else {
        // Placeholder for other providers (Anthropic, local models, etc.)
        throw new Error(`Model ${model} not yet supported. Currently supports GPT models.`);
      }

      const endTime = Date.now();

      return {
        success: true,
        response,
        metrics: {
          ...metrics,
          time: endTime - startTime,
          temperature,
          maxTokens,
          tokens: (metrics as any).tokens
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const endTime = Date.now();

      return {
        success: false,
        error: (error as any).message,
        metrics: {
          time: endTime - startTime,
          temperature,
          maxTokens,
          tokens: undefined
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  async runTests(prompt, tests = []) {
    const results = [];

    for (const test of tests) {
      const result = await this.runSingleTest(prompt, test);
      results.push(result);
    }

    return results;
  }

  async runSingleTest(prompt, test) {
    switch (test.type) {
      case 'output':
        return await this.runOutputTest(prompt, test);
      case 'regex':
        return await this.runRegexTest(prompt, test);
      case 'length':
        return await this.runLengthTest(prompt, test);
      case 'contains':
        return await this.runContainsTest(prompt, test);
      default:
        return {
          test: test.description,
          passed: false,
          error: `Unknown test type: ${test.type}`
        };
    }
  }

  async runOutputTest(prompt, test) {
    const output = await this.runPrompt(prompt);

    if (!output.success) {
      return {
        test: test.description,
        passed: false,
        error: output.error
      };
    }

    // Basic validation - check if response exists
    const passed = !!output.response && output.response.length > 0;

    return {
      test: test.description,
      passed,
      output: output.response.substring(0, 100) + '...',
      metrics: output.metrics
    };
  }

  async runRegexTest(prompt, test) {
    const output = await this.runPrompt(prompt);

    if (!output.success) {
      return {
        test: test.description,
        passed: false,
        error: output.error
      };
    }

    const regex = new RegExp(test.pattern, test.flags || 'g');
    const passed = regex.test(output.response);

    return {
      test: test.description,
      passed,
      pattern: test.pattern,
      output: output.response.substring(0, 100) + '...'
    };
  }

  async runLengthTest(prompt, test) {
    const output = await this.runPrompt(prompt);

    if (!output.success) {
      return {
        test: test.description,
        passed: false,
        error: output.error
      };
    }

    const length = output.response.length;
    let passed = true;

    if (test.min !== undefined && length < test.min) passed = false;
    if (test.max !== undefined && length > test.max) passed = false;

    return {
      test: test.description,
      passed,
      actualLength: length,
      expectedMin: test.min,
      expectedMax: test.max
    };
  }

  async runContainsTest(prompt, test) {
    const output = await this.runPrompt(prompt);

    if (!output.success) {
      return {
        test: test.description,
        passed: false,
        error: output.error
      };
    }

    const passed = test.keywords.every(keyword =>
      output.response.toLowerCase().includes(keyword.toLowerCase())
    );

    return {
      test: test.description,
      passed,
      keywords: test.keywords,
      output: output.response.substring(0, 100) + '...'
    };
  }

  async compareOutputs(prompt1, prompt2, options = {}) {
    const [output1, output2] = await Promise.all([
      this.runPrompt(prompt1, options),
      this.runPrompt(prompt2, options)
    ]);

    return {
      prompt1: {
        success: output1.success,
        response: output1.response,
        metrics: output1.metrics
      },
      prompt2: {
        success: output2.success,
        response: output2.response,
        metrics: output2.metrics
      },
      comparison: {
        lengthDiff: (output1.response?.length || 0) - (output2.response?.length || 0),
        tokenDiff: (output1.metrics?.tokens || 0) - (output2.metrics?.tokens || 0),
        timeDiff: (output1.metrics?.time || 0) - (output2.metrics?.time || 0)
      }
    };
  }
}