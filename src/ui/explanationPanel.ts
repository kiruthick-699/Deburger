import * as vscode from 'vscode';
import { AnalysisIssue } from '../core/types';
import { LLMExplainResult } from '../ai/llmClient';

/**
 * Manages a webview panel for displaying issue explanations.
 * Handles LLM response rendering with fallback to mocked text.
 */
export class ExplanationPanel {
	private static currentPanel: ExplanationPanel | undefined;
	private readonly panel: vscode.WebviewPanel;
	private disposables: vscode.Disposable[] = [];

	private constructor(
		panel: vscode.WebviewPanel,
		private context: vscode.ExtensionContext
	) {
		this.panel = panel;
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
	}

	/**
	 * Create or show explanation panel for an issue.
	 */
	public static createOrShow(
		context: vscode.ExtensionContext,
		issue: AnalysisIssue,
		explanation: LLMExplainResult | null
	): void {
		const column = vscode.ViewColumn.Two;

		if (ExplanationPanel.currentPanel) {
			ExplanationPanel.currentPanel.update(issue, explanation);
			ExplanationPanel.currentPanel.panel.reveal(column);
		} else {
			const panel = vscode.window.createWebviewPanel(
				'aiDebuggerExplanation',
				`Explain: ${issue.ruleId}`,
				column,
				{
					enableScripts: false,
					localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
				}
			);

			ExplanationPanel.currentPanel = new ExplanationPanel(panel, context);
			ExplanationPanel.currentPanel.update(issue, explanation);
		}
	}

	/**
	 * Update the panel with new explanation content.
	 */
	private update(issue: AnalysisIssue, explanation: LLMExplainResult | null): void {
		const html = this.getWebviewContent(issue, explanation);
		this.panel.webview.html = html;
		this.panel.title = `Explain: ${issue.ruleId}`;
	}

	/**
	 * Generate HTML content for the webview panel.
	 */
	private getWebviewContent(issue: AnalysisIssue, explanation: LLMExplainResult | null): string {
		const severityColor = this.getSeverityColor(issue.severity);
		const severityLabel = issue.severity.toUpperCase();

		if (!explanation) {
			// Mocked explanation shown while loading or if LLM call fails
			const mockedExplanation = this.getMockedExplanation(issue);
			return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Issue Explanation</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
			line-height: 1.6;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			padding: 16px;
			margin: 0;
		}
		.header {
			display: flex;
			align-items: center;
			margin-bottom: 20px;
			gap: 12px;
		}
		.severity-badge {
			background-color: ${severityColor};
			color: white;
			padding: 4px 12px;
			border-radius: 4px;
			font-weight: 600;
			font-size: 12px;
		}
		.issue-title {
			font-size: 18px;
			font-weight: 600;
		}
		.location {
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			margin-top: 8px;
		}
		.section {
			margin-top: 20px;
		}
		.section-title {
			font-size: 14px;
			font-weight: 600;
			color: var(--vscode-editor-foreground);
			margin-bottom: 8px;
			padding-bottom: 6px;
			border-bottom: 1px solid var(--vscode-editorWidget-border);
		}
		.section-content {
			font-size: 13px;
			color: var(--vscode-descriptionForeground);
		}
		.steps-list {
			list-style: decimal;
			list-style-position: inside;
			padding-left: 0;
		}
		.steps-list li {
			margin-bottom: 8px;
			padding-left: 8px;
		}
		.mocked-notice {
			background-color: var(--vscode-editorWarning-background);
			border-left: 3px solid var(--vscode-editorWarning-foreground);
			padding: 8px 12px;
			margin-bottom: 16px;
			font-size: 12px;
			color: var(--vscode-editorWarning-foreground);
			border-radius: 2px;
		}
		code {
			background-color: var(--vscode-editor-inlineValueBackground);
			padding: 2px 6px;
			border-radius: 3px;
			font-family: 'SF Mono', Monaco, 'Roboto Mono', Courier, monospace;
			font-size: 12px;
		}
	</style>
</head>
<body>
	<div class="mocked-notice">
		⚠️ This is a simulated explanation. Live LLM integration coming soon.
	</div>
	<div class="header">
		<span class="severity-badge">${severityLabel}</span>
		<div>
			<div class="issue-title">${issue.message}</div>
			<div class="location">${issue.file}:${issue.line}:${issue.column}</div>
		</div>
	</div>

	<div class="section">
		<div class="section-title">What's the Problem?</div>
		<div class="section-content">
			${mockedExplanation.problem}
		</div>
	</div>

	<div class="section">
		<div class="section-title">Why It Matters</div>
		<div class="section-content">
			${mockedExplanation.impact}
		</div>
	</div>

	<div class="section">
		<div class="section-title">How to Fix It</div>
		<ol class="steps-list">
			${mockedExplanation.steps.map(step => `<li>${step}</li>`).join('')}
		</ol>
	</div>
</body>
</html>
			`;
		}

		// Render actual LLM explanation
		return `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Issue Explanation</title>
	<style>
		body {
			font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
			line-height: 1.6;
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
			padding: 16px;
			margin: 0;
		}
		.header {
			display: flex;
			align-items: center;
			margin-bottom: 20px;
			gap: 12px;
		}
		.severity-badge {
			background-color: ${severityColor};
			color: white;
			padding: 4px 12px;
			border-radius: 4px;
			font-weight: 600;
			font-size: 12px;
		}
		.issue-title {
			font-size: 18px;
			font-weight: 600;
		}
		.location {
			color: var(--vscode-descriptionForeground);
			font-size: 12px;
			margin-top: 8px;
		}
		.section {
			margin-top: 20px;
		}
		.section-title {
			font-size: 14px;
			font-weight: 600;
			color: var(--vscode-editor-foreground);
			margin-bottom: 8px;
			padding-bottom: 6px;
			border-bottom: 1px solid var(--vscode-editorWidget-border);
		}
		.section-content {
			font-size: 13px;
			color: var(--vscode-descriptionForeground);
		}
		.steps-list {
			list-style: decimal;
			list-style-position: inside;
			padding-left: 0;
		}
		.steps-list li {
			margin-bottom: 8px;
			padding-left: 8px;
		}
		.model-info {
			font-size: 11px;
			color: var(--vscode-descriptionForeground);
			margin-top: 20px;
			padding-top: 12px;
			border-top: 1px solid var(--vscode-editorWidget-border);
		}
	</style>
</head>
<body>
	<div class="header">
		<span class="severity-badge">${severityLabel}</span>
		<div>
			<div class="issue-title">${issue.message}</div>
			<div class="location">${issue.file}:${issue.line}:${issue.column}</div>
		</div>
	</div>

	<div class="section">
		<div class="section-title">Explanation</div>
		<div class="section-content">
			${explanation.explanation.split('\n').filter(l => l.trim()).join('<br>')}
		</div>
	</div>

	<div class="section">
		<div class="section-title">Remediation Steps</div>
		<ol class="steps-list">
			${explanation.remediationSteps.map(step => `<li>${step}</li>`).join('')}
		</ol>
	</div>

	${explanation.model ? `<div class="model-info">Model: ${explanation.model}</div>` : ''}
</body>
</html>
		`;
	}

	/**
	 * Generate mocked explanation for an issue based on its rule.
	 */
	private getMockedExplanation(
		issue: AnalysisIssue
	): { problem: string; impact: string; steps: string[] } {
		const mockData: Record<string, { problem: string; impact: string; steps: string[] }> = {
			'unused-var': {
				problem: `The variable <code>${this.extractVarName(issue.message)}</code> is declared but never used in the code.`,
				impact:
					'Unused variables clutter code, reduce readability, and can indicate incomplete refactoring or forgotten logic. They increase cognitive load for maintainers.',
				steps: [
					'Search for all references to this variable in the file',
					'If truly unused, consider removing the declaration',
					'If it was meant to be used, add the missing logic',
					'Run your test suite to ensure no breakage',
					'Commit the change with a clear message',
				],
			},
			'long-function': {
				problem: `This function exceeds the recommended maximum length (${this.extractNumber(issue.message)} lines).`,
				impact:
					'Long functions are harder to understand, test, and maintain. They often have multiple responsibilities and hidden bugs.',
				steps: [
					'Identify logical sections within the function',
					'Extract each section into a separate function with a descriptive name',
					'Update the original function to call the extracted functions',
					'Ensure each extracted function has a single responsibility',
					'Add unit tests for each new function',
					'Verify behavior is unchanged with integration tests',
				],
			},
			'async-no-try-catch': {
				problem: `This async function does not have a <code>try/catch</code> block to handle potential errors.`,
				impact:
					'Without error handling, unhandled promise rejections can crash your application or leave it in an inconsistent state.',
				steps: [
					'Identify all await expressions in the function',
					'Wrap them in a try/catch block',
					'In the catch block, log the error and handle it appropriately',
					'Consider whether to re-throw, return a default value, or continue execution',
					'Test error scenarios to ensure proper handling',
				],
			},
			'deep-nesting': {
				problem: `Code nesting depth exceeds the recommended limit (${this.extractNumber(issue.message)} levels).`,
				impact:
					'Deeply nested code is harder to follow, increases cyclomatic complexity, and makes testing more difficult.',
				steps: [
					'Identify nested conditions and loops',
					'Extract inner blocks into separate functions',
					'Use early returns to reduce nesting',
					'Consider using array methods like filter, map, and reduce instead of loops',
					'Add comments explaining the logic flow',
				],
			},
		};

		return (
			mockData[issue.ruleId] || {
				problem: `The issue "<code>${issue.ruleId}</code>" has been detected in your code.`,
				impact: 'This issue may affect code quality, maintainability, or correctness.',
				steps: [
					'Review the issue location in your editor',
					'Understand the context and why this pattern is problematic',
					'Apply the recommended fix',
					'Test your changes thoroughly',
				],
			}
		);
	}

	/**
	 * Extract a variable name from issue message.
	 */
	private extractVarName(message: string): string {
		const match = message.match(/"([^"]+)"/);
		return match ? match[1] : 'variable';
	}

	/**
	 * Extract a number from issue message.
	 */
	private extractNumber(message: string): string {
		const match = message.match(/\d+/);
		return match ? match[0] : 'N';
	}

	/**
	 * Map severity to color code.
	 */
	private getSeverityColor(severity: string): string {
		const colors: Record<string, string> = {
			error: '#d32f2f',
			warning: '#f57c00',
			info: '#0288d1',
		};
		return colors[severity] || '#666';
	}

	public dispose(): void {
		ExplanationPanel.currentPanel = undefined;
		this.panel.dispose();

		while (this.disposables.length) {
			const x = this.disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
}
