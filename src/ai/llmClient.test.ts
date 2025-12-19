import { AnalysisIssue } from '../core/types';
import { explainIssue, buildPrompt, LLMExplainResult } from './llmClient';
import { EXPLAIN_ISSUE_PROMPT } from './promptTemplates';

// Mock the callLLMAPI function
jest.mock('./llmClient', () => {
	const actual = jest.requireActual('./llmClient');
	return {
		...actual,
		explainIssue: jest.fn(),
		buildPrompt: actual.buildPrompt,
	};
});

describe('llmClient', () => {
	const mockIssue: AnalysisIssue = {
		file: 'src/app.ts',
		line: 42,
		column: 10,
		ruleId: 'unused-var',
		message: 'Variable "unusedHelper" is declared but never used',
		severity: 'warning',
	};

	const mockContextSummary =
		'Project: TypeScript web app with Express backend. Top issues: 5 unused variables, 2 functions > 80 lines.';

	const mockApiKey = 'sk-placeholder-key-do-not-use';

	describe('buildPrompt', () => {
		it('should replace all template variables with actual values', () => {
			const prompt = buildPrompt(mockIssue, mockContextSummary);

			expect(prompt).toContain(mockContextSummary);
			expect(prompt).toContain('src/app.ts');
			expect(prompt).toContain('42');
			expect(prompt).toContain('unused-var');
			expect(prompt).toContain('Variable "unusedHelper" is declared but never used');
		});

		it('should not contain unsubstituted template placeholders', () => {
			const prompt = buildPrompt(mockIssue, mockContextSummary);

			expect(prompt).not.toContain('{{');
			expect(prompt).not.toContain('}}');
		});

		it('should include the no-code constraint', () => {
			const prompt = buildPrompt(mockIssue, mockContextSummary);

			expect(prompt).toMatch(/DO NOT produce any code/i);
			expect(prompt).toMatch(/plain.text explanations/i);
		});

		it('should include request for explanation, impact, and remediation', () => {
			const prompt = buildPrompt(mockIssue, mockContextSummary);

			expect(prompt).toMatch(/what the problem is/i);
			expect(prompt).toMatch(/why it matters/i);
			expect(prompt).toMatch(/remediation/i);
		});
	});

	describe('EXPLAIN_ISSUE_PROMPT template', () => {
		it('should contain context placeholder', () => {
			expect(EXPLAIN_ISSUE_PROMPT).toContain('{{contextSummary}}');
		});

		it('should contain issue file placeholder', () => {
			expect(EXPLAIN_ISSUE_PROMPT).toContain('{{issue.file}}');
		});

		it('should contain issue line placeholder', () => {
			expect(EXPLAIN_ISSUE_PROMPT).toContain('{{issue.line}}');
		});

		it('should contain issue ruleId placeholder', () => {
			expect(EXPLAIN_ISSUE_PROMPT).toContain('{{issue.ruleId}}');
		});

		it('should contain issue message placeholder', () => {
			expect(EXPLAIN_ISSUE_PROMPT).toContain('{{issue.message}}');
		});

		it('should explicitly forbid code output', () => {
			expect(EXPLAIN_ISSUE_PROMPT).toMatch(/DO NOT.*code/i);
		});

		it('should request plain-text output only', () => {
			expect(EXPLAIN_ISSUE_PROMPT).toMatch(/plain.text/i);
		});
	});

	describe('explainIssue', () => {
		it('should call explainIssue with correct parameters', async () => {
			const mockExplainIssue = jest.fn().mockResolvedValue({
				issue: mockIssue,
				explanation: 'This variable is never used.',
				remediationSteps: ['Remove the variable declaration'],
				model: 'gpt-4',
			});

			(explainIssue as jest.Mock).mockImplementation(mockExplainIssue);

			const result = await explainIssue(mockIssue, mockContextSummary, mockApiKey);

			expect(mockExplainIssue).toHaveBeenCalledWith(
				mockIssue,
				mockContextSummary,
				mockApiKey
			);
		});

		it('should return LLMExplainResult with issue and explanation', async () => {
			const mockResult: LLMExplainResult = {
				issue: mockIssue,
				explanation: 'This variable is declared but never used in the codebase.',
				remediationSteps: [
					'Search for all references to "unusedHelper"',
					'Verify it is truly unused',
					'Remove the variable declaration',
					'Run tests to ensure no breakage',
				],
				model: 'gpt-4',
				tokenUsage: {
					promptTokens: 250,
					completionTokens: 120,
				},
			};

			(explainIssue as jest.Mock).mockResolvedValue(mockResult);

			const result = await explainIssue(mockIssue, mockContextSummary, mockApiKey);

			expect(result).toEqual(mockResult);
			expect(result.issue).toEqual(mockIssue);
			expect(result.explanation).toBeTruthy();
			expect(Array.isArray(result.remediationSteps)).toBe(true);
		});

		it('should include context in the prompt passed to API', async () => {
			let capturedPrompt = '';

			(explainIssue as jest.Mock).mockImplementation(
				async (issue, context, apiKey) => {
					const prompt = buildPrompt(issue, context);
					capturedPrompt = prompt;
					return {
						issue,
						explanation: 'Mock explanation',
						remediationSteps: [],
					};
				}
			);

			await explainIssue(mockIssue, mockContextSummary, mockApiKey);

			expect(capturedPrompt).toContain(mockContextSummary);
		});

		it('should include full issue details in the prompt', async () => {
			let capturedPrompt = '';

			(explainIssue as jest.Mock).mockImplementation(
				async (issue, context, apiKey) => {
					const prompt = buildPrompt(issue, context);
					capturedPrompt = prompt;
					return {
						issue,
						explanation: 'Mock explanation',
						remediationSteps: [],
					};
				}
			);

			await explainIssue(mockIssue, mockContextSummary, mockApiKey);

			expect(capturedPrompt).toContain(mockIssue.file);
			expect(capturedPrompt).toContain(mockIssue.line.toString());
			expect(capturedPrompt).toContain(mockIssue.ruleId);
			expect(capturedPrompt).toContain(mockIssue.message);
		});

		it('should enforce no-code constraint in prompt', async () => {
			let capturedPrompt = '';

			(explainIssue as jest.Mock).mockImplementation(
				async (issue, context, apiKey) => {
					const prompt = buildPrompt(issue, context);
					capturedPrompt = prompt;
					return {
						issue,
						explanation: 'Mock explanation',
						remediationSteps: [],
					};
				}
			);

			await explainIssue(mockIssue, mockContextSummary, mockApiKey);

			expect(capturedPrompt).toMatch(/DO NOT produce any code/i);
			expect(capturedPrompt).toMatch(/no code, no diffs/i);
		});

		it('should handle multiple issues with different contexts', async () => {
			const issue2: AnalysisIssue = {
				file: 'src/utils.ts',
				line: 105,
				column: 5,
				ruleId: 'long-function',
				message: 'Function "processData" is 120 lines long',
				severity: 'warning',
			};

			const context2 = 'Different project context';

			(explainIssue as jest.Mock).mockImplementation(
				async (issue, context, apiKey) => ({
					issue,
					explanation: `Explanation for ${issue.file}`,
					remediationSteps: [],
				})
			);

			const result1 = await explainIssue(mockIssue, mockContextSummary, mockApiKey);
			const result2 = await explainIssue(issue2, context2, mockApiKey);

			expect(result1.issue.file).toBe('src/app.ts');
			expect(result2.issue.file).toBe('src/utils.ts');
			expect(result1.explanation).toContain('src/app.ts');
			expect(result2.explanation).toContain('src/utils.ts');
		});
	});

	describe('prompt formatting and structure', () => {
		it('should produce a prompt that is a valid string', () => {
			const prompt = buildPrompt(mockIssue, mockContextSummary);
			expect(typeof prompt).toBe('string');
			expect(prompt.length).toBeGreaterThan(0);
		});

		it('should preserve multiline structure', () => {
			const prompt = buildPrompt(mockIssue, mockContextSummary);
			const lines = prompt.split('\n');
			expect(lines.length).toBeGreaterThan(1);
		});

		it('should handle context summaries with special characters', () => {
			const complexContext = 'Project with "quotes", \'apostrophes\', and <html> tags.';
			const prompt = buildPrompt(mockIssue, complexContext);
			expect(prompt).toContain(complexContext);
		});

		it('should handle issue messages with special characters', () => {
			const specialIssue: AnalysisIssue = {
				...mockIssue,
				message: 'Variable "x" (line 5) should be "y" instead of "z"',
			};
			const prompt = buildPrompt(specialIssue, mockContextSummary);
			expect(prompt).toContain(specialIssue.message);
		});
	});
});
