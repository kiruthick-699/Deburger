import * as https from 'https';
import { AnalysisIssue } from '../core/types';
import { EXPLAIN_ISSUE_PROMPT } from './promptTemplates';

/**
 * Result from LLM explanation of an analysis issue.
 */
export interface LLMExplainResult {
	issue: AnalysisIssue;
	explanation: string;
	remediationSteps: string[];
	model?: string;
	tokenUsage?: {
		promptTokens: number;
		completionTokens: number;
	};
}

export type LLMProvider = 'openai' | 'anthropic';

/**
 * Configuration for LLM API client.
 */
export interface LLMClientConfig {
	apiKey: string;
	provider?: LLMProvider;
	endpoint?: string;
	model?: string;
	timeout?: number;
}

const DEFAULT_MODELS: Record<LLMProvider, string> = {
	openai: 'gpt-4o-mini',
	anthropic: 'claude-haiku-4-5-20251001',
};

const DEFAULT_ENDPOINTS: Record<LLMProvider, string> = {
	openai: 'https://api.openai.com/v1/chat/completions',
	anthropic: 'https://api.anthropic.com/v1/messages',
};

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RESPONSE_TOKENS = 700;

/**
 * Calls the configured LLM provider to explain a static analysis issue.
 * Supports OpenAI's chat completions API and Anthropic's messages API.
 */
export async function explainIssue(
	issue: AnalysisIssue,
	contextSummary: string,
	apiKey: string,
	config?: Partial<Omit<LLMClientConfig, 'apiKey'>>
): Promise<LLMExplainResult> {
	// Build the prompt by replacing template variables
	const prompt = buildPrompt(issue, contextSummary);

	const provider: LLMProvider = config?.provider ?? 'openai';
	const resolvedConfig: Required<LLMClientConfig> = {
		apiKey,
		provider,
		model: config?.model || DEFAULT_MODELS[provider],
		endpoint: config?.endpoint || DEFAULT_ENDPOINTS[provider],
		timeout: config?.timeout ?? DEFAULT_TIMEOUT_MS,
	};

	const response = await callLLMAPI(prompt, resolvedConfig);

	// Parse the response into structured format
	const result = parseResponse(issue, response);
	result.model = resolvedConfig.model;

	return result;
}

/**
 * Build the final prompt string by substituting template variables.
 */
export function buildPrompt(issue: AnalysisIssue, contextSummary: string): string {
	return EXPLAIN_ISSUE_PROMPT.replace('{{contextSummary}}', contextSummary)
		.replace('{{issue.file}}', issue.file)
		.replace('{{issue.line}}', issue.line.toString())
		.replace('{{issue.ruleId}}', issue.ruleId)
		.replace('{{issue.message}}', issue.message);
}

/**
 * Calls the real LLM HTTP endpoint (OpenAI or Anthropic) and extracts the text response.
 *
 * IMPORTANT: API key security
 * - Never log or expose API keys in error messages
 * - Never include the API key or full prompt in thrown errors
 */
async function callLLMAPI(prompt: string, config: Required<LLMClientConfig>): Promise<string> {
	const isAnthropic = config.provider === 'anthropic';

	const body = JSON.stringify({
		model: config.model,
		max_tokens: MAX_RESPONSE_TOKENS,
		messages: [{ role: 'user', content: prompt }],
	});

	const headers: Record<string, string> = isAnthropic
		? {
				'x-api-key': config.apiKey,
				'anthropic-version': '2023-06-01',
				'content-type': 'application/json',
			}
		: {
				authorization: `Bearer ${config.apiKey}`,
				'content-type': 'application/json',
			};

	const data = await postJson(config.endpoint, headers, body, config.timeout);

	if (isAnthropic) {
		const anthropicData = data as AnthropicResponse;
		return anthropicData?.content?.[0]?.text ?? '';
	}
	const openaiData = data as OpenAIResponse;
	return openaiData?.choices?.[0]?.message?.content ?? '';
}

interface OpenAIResponse {
	choices?: { message?: { content?: string } }[];
}

interface AnthropicResponse {
	content?: { text?: string }[];
}

/**
 * Minimal HTTPS JSON POST client (no external dependencies).
 */
function postJson(
	url: string,
	headers: Record<string, string>,
	body: string,
	timeoutMs: number
): Promise<unknown> {
	return new Promise((resolve, reject) => {
		let target: URL;
		try {
			target = new URL(url);
		} catch {
			reject(new Error('Invalid LLM API endpoint configured'));
			return;
		}

		const req = https.request(
			{
				hostname: target.hostname,
				path: `${target.pathname}${target.search}`,
				method: 'POST',
				headers: { ...headers, 'content-length': Buffer.byteLength(body) },
				timeout: timeoutMs,
			},
			res => {
				let raw = '';
				res.on('data', chunk => (raw += chunk));
				res.on('end', () => {
					const status = res.statusCode ?? 0;
					if (status < 200 || status >= 300) {
						reject(new Error(`LLM API request failed with status ${status}`));
						return;
					}
					try {
						resolve(JSON.parse(raw));
					} catch {
						reject(new Error('Failed to parse LLM API response'));
					}
				});
			}
		);

		req.on('timeout', () => {
			req.destroy(new Error('LLM API request timed out'));
		});
		req.on('error', () => {
			reject(new Error('LLM API request failed. Check your network connection.'));
		});

		req.write(body);
		req.end();
	});
}

/**
 * Parse LLM response into structured explanation and remediation steps.
 * Tolerates a few common list formats: "1)", "1.", "-", "*".
 */
function parseResponse(issue: AnalysisIssue, response: string): LLMExplainResult {
	const lines = response.split('\n').filter(line => line.trim().length > 0);

	const remediationSteps: string[] = [];
	let explanation = '';

	for (const line of lines) {
		const trimmed = line.trim();
		const stepMatch = trimmed.match(/^(?:\d+[).]|[-*])\s+(.+)/);
		if (stepMatch) {
			remediationSteps.push(stepMatch[1]);
		} else if (!/^Constraints:/i.test(trimmed)) {
			explanation += line + '\n';
		}
	}

	return {
		issue,
		explanation: explanation.trim(),
		remediationSteps,
		tokenUsage: {
			promptTokens: 0,
			completionTokens: 0,
		},
	};
}
