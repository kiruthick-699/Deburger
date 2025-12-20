import * as vscode from 'vscode';
import { AnalysisIssue, Severity } from '../core/types';

/**
 * Manages diagnostics collection for the Problems pane.
 * Maps analysis issues to VS Code diagnostics with proper severity.
 */
export class DiagnosticsManager {
	private diagnosticCollection: vscode.DiagnosticCollection;
	private issuesMap: Map<string, AnalysisIssue[]> = new Map();

	constructor() {
		this.diagnosticCollection = vscode.languages.createDiagnosticCollection('ai-debugger');
	}

	/**
	 * Update diagnostics from analysis issues.
	 * Organizes issues by file and creates diagnostics.
	 */
	updateDiagnostics(issues: AnalysisIssue[]): void {
		// Clear previous diagnostics
		this.diagnosticCollection.clear();
		this.issuesMap.clear();

		// Group issues by file
		for (const issue of issues) {
			const fileUri = vscode.Uri.file(issue.file);
			const fileUriStr = fileUri.toString();

			if (!this.issuesMap.has(fileUriStr)) {
				this.issuesMap.set(fileUriStr, []);
			}
			this.issuesMap.get(fileUriStr)!.push(issue);
		}

		// Create diagnostics for each file
		for (const [fileUriStr, fileIssues] of this.issuesMap.entries()) {
			const diagnostics = fileIssues.map(issue => this.issueToDiagnostic(issue));
			const fileUri = vscode.Uri.parse(fileUriStr);
			this.diagnosticCollection.set(fileUri, diagnostics);
		}
	}

	/**
	 * Convert an AnalysisIssue to a VS Code Diagnostic.
	 */
	private issueToDiagnostic(issue: AnalysisIssue): vscode.Diagnostic {
		// Create range at the issue location
		const range = new vscode.Range(
			new vscode.Position(issue.line - 1, Math.max(0, issue.column - 1)),
			new vscode.Position(issue.line - 1, Math.max(0, issue.column))
		);

		const severity = this.mapSeverity(issue.severity);
		const diagnostic = new vscode.Diagnostic(range, issue.message, severity);

		// Set rule ID as source for easy identification
		diagnostic.source = `AI Debugger (${issue.ruleId})`;
		diagnostic.code = issue.ruleId;
		diagnostic.tags = this.getTagsForRule(issue.ruleId);

		return diagnostic;
	}

	/**
	 * Map custom severity to VS Code DiagnosticSeverity.
	 */
	private mapSeverity(severity: Severity): vscode.DiagnosticSeverity {
		const severityMap: Record<Severity, vscode.DiagnosticSeverity> = {
			error: vscode.DiagnosticSeverity.Error,
			warning: vscode.DiagnosticSeverity.Warning,
			info: vscode.DiagnosticSeverity.Information,
		};
		return severityMap[severity];
	}

	/**
	 * Get diagnostic tags for specific rules.
	 */
	private getTagsForRule(ruleId: string): vscode.DiagnosticTag[] {
		if (ruleId === 'unused-var') {
			return [vscode.DiagnosticTag.Unnecessary];
		}
		return [];
	}

	/**
	 * Clear all diagnostics.
	 */
	clear(): void {
		this.diagnosticCollection.clear();
		this.issuesMap.clear();
	}

	/**
	 * Dispose of the diagnostic collection.
	 */
	dispose(): void {
		this.diagnosticCollection.dispose();
	}

	/**
	 * Get all issues for a specific file.
	 */
	getIssuesForFile(fileUri: vscode.Uri): AnalysisIssue[] {
		return this.issuesMap.get(fileUri.toString()) || [];
	}
}
