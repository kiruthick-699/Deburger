import * as vscode from 'vscode';
import { scanProject } from './core/projectScanner';
import { analyzeFiles } from './core/analyzer';
import { buildContext } from './core/contextBuilder';
import { explainIssue } from './ai/llmClient';
import { AIDebuggerTreeProvider } from './ui/aiSidebar';
import { ExplanationPanel } from './ui/explanationPanel';
import { DiagnosticsManager } from './ui/diagnosticsManager';
import { ConfigManager } from './core/configManager';
import { AnalysisIssue } from './core/types';

let treeProvider: AIDebuggerTreeProvider;
let diagnosticsManager: DiagnosticsManager;

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export async function activate(context: vscode.ExtensionContext) {
	console.log('AI Debugging Assistant is now active');

	// Initialize UI components
	diagnosticsManager = new DiagnosticsManager();
	treeProvider = new AIDebuggerTreeProvider(context);

	// Register TreeView
	vscode.window.registerTreeDataProvider('ai-debugger.issues', treeProvider);

	// Register "Run Scan" command
	const runScanCommand = vscode.commands.registerCommand('ai-debugger.runScan', async () => {
		await runAnalysis(context);
	});
	context.subscriptions.push(runScanCommand);

	// Register "Explain Issue" command
	const explainCommand = vscode.commands.registerCommand(
		'ai-debugger.explainIssue',
		async (issue: AnalysisIssue) => {
			// Check if API key is configured before attempting to explain
			const isConfigured = await ConfigManager.isApiKeyConfigured();
			if (!isConfigured) {
				const message =
					'API key not configured. Configure it in extension settings to use AI explanations.';
				const action = await vscode.window.showWarningMessage(message, 'Open Settings');
				if (action === 'Open Settings') {
					await ConfigManager.openApiKeySettings();
				}
				return;
			}

			// Show explanation panel with mocked explanation
			ExplanationPanel.createOrShow(context, issue, null);
		}
	);
	context.subscriptions.push(explainCommand);

	// Dispose diagnostics manager on deactivation
	context.subscriptions.push(diagnosticsManager);

	// Optional: Prompt for API key on first activation (comment out to disable)
	// await ConfigManager.promptForApiKeyIfNeeded();

	console.log('AI Debugger commands registered');

	// Future telemetry placeholder
	// const isTelemetryOptedOut = await ConfigManager.isTelemetryOptedOut();
	// if (!isTelemetryOptedOut) {
	//   // Send telemetry about extension activation
	//   // Example: track activation, analysis runs, issues found
	//   // Never track actual code content or file names
	// }
}

/**
 * Run the analysis pipeline: scan -> analyze -> build context -> populate UI.
 */
async function runAnalysis(context: vscode.ExtensionContext): Promise<void> {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage('No workspace folder open');
		return;
	}

	try {
		// Show progress notification
		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Running AI Debugging Analysis',
				cancellable: true,
			},
			async progress => {
				progress.report({ increment: 10, message: 'Scanning project files...' });

				// Step 1: Scan project
				const scannedFiles = await scanProject(workspaceFolder.uri.fsPath);
				progress.report({ increment: 20, message: `Found ${scannedFiles.length} files` });

				// Step 2: Analyze files
				const issues = await analyzeFiles(scannedFiles);
				progress.report({ increment: 30, message: `Found ${issues.length} issues` });

				// Step 3: Build context
				const contextSummary = await buildContext(scannedFiles, issues, workspaceFolder.uri.fsPath);
				progress.report({ increment: 30, message: 'Building context summary...' });

				// Step 4: Update UI
				progress.report({ increment: 10, message: 'Updating UI...' });
				treeProvider.setIssues(issues);
				diagnosticsManager.updateDiagnostics(issues);

				// Show summary
				const severity = {
					error: issues.filter(i => i.severity === 'error').length,
					warning: issues.filter(i => i.severity === 'warning').length,
					info: issues.filter(i => i.severity === 'info').length,
				};

				vscode.window.showInformationMessage(
					`Analysis complete: ${severity.error} errors, ${severity.warning} warnings, ${severity.info} info`
				);

				// Reveal sidebar
				vscode.commands.executeCommand('ai-debugger.issues.focus');
			}
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`Analysis failed: ${message}`);
	}
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
	console.log('AI Debugging Assistant is deactivated');
	diagnosticsManager?.dispose();
}

