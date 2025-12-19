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

/**
 * Configuration for LLM API client.
 */
export interface LLMClientConfig {
	apiKey: string;
	endpoint: string;
	model?: string;
	timeout?: number;
}

/**
 * Placeholder HTTP client for calling an LLM API.
 * This is a template that can be connected to OpenAI, Claude, or other LLM services.
 *
 * NOTE: No actual API calls are made in the current implementation.
 * This serves as the integration point for future API implementations.
 * Cost and rate-limiting must be considered before enabling live API calls.
 */
export async function explainIssue(
	issue: AnalysisIssue,
	contextSummary: string,
	apiKeyPlaceholder: string
): Promise<LLMExplainResult> {
	// Build the prompt by replacing template variables
	const prompt = buildPrompt(issue, contextSummary);

	// Placeholder for HTTP client implementation
	// In production, this would call an actual LLM endpoint:
	// - OpenAI: https://api.openai.com/v1/chat/completions
	// - Anthropic Claude: https://api.anthropic.com/v1/messages
	// - Local LLM: http://localhost:port/v1/completions

	const response = await callLLMAPI(prompt, apiKeyPlaceholder);

	// Parse the response into structured format
	const result = parseResponse(issue, response);

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
 * Placeholder for HTTP client call to LLM endpoint.
 * Returns mock response in tests; in production would call real endpoint.
 *
 * IMPORTANT: API key security
 * - Never log or expose API keys in error messages
 * - Use environment variables for actual keys
 * - Implement rate-limiting to avoid excessive costs
 * - Consider request batching for efficiency
 */
async function callLLMAPI(prompt: string, apiKey: string): Promise<string> {
	// TODO: Implement actual HTTP client
	// Example structure:
	// const response = await fetch(endpoint, {
	//   method: 'POST',
	//   headers: {
	//     'Authorization': `Bearer ${apiKey}`,
	//     'Content-Type': 'application/json',
	//   },
	//   body: JSON.stringify({ prompt, max_tokens: 500 }),
	//   timeout: 30000,
	// });
	//
	// if (!response.ok) {
	//   throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
	// }
	//
	// const data = await response.json();
	// return data.choices[0].text;

	// Placeholder: Return empty string (tests will mock this)
	return '';
}

/**
 * Parse LLM response into structured explanation and remediation steps.
 */
function parseResponse(issue: AnalysisIssue, response: string): LLMExplainResult {
	// Extract plain-text explanation and numbered steps
	const lines = response.split('\n').filter(line => line.trim().length > 0);

	// Simple parsing: look for numbered items as remediation steps
	const remediationSteps: string[] = [];
	let explanation = '';

	for (const line of lines) {
		// Match numbered steps: "1)", "2)", etc.
		const stepMatch = line.match(/^\d+\)\s+(.+)/);
		if (stepMatch) {
			remediationSteps.push(stepMatch[1]);
		} else if (!line.match(/^Constraints:/i)) {
			explanation += line + '\n';
		}
	}

	return {
		issue,
		explanation: explanation.trim(),
		remediationSteps,
		model: 'placeholder',
		tokenUsage: {
			promptTokens: 0,
			completionTokens: 0,
		},
	};
}
