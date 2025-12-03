import * as vscode from 'vscode';

/**
 * This method is called when your extension is activated
 * Your extension is activated the very first time the command is executed
 */
export function activate(_context: vscode.ExtensionContext) {
	console.log('AI Debugging Assistant is now active');

	// TODO: Register commands
	// TODO: Initialize project scanner
	// TODO: Set up AST-based analysis
	// TODO: Register sidebar UI provider
	// TODO: Configure diagnostic collection
	// TODO: Initialize OpenAI API client (explain-only)
}

/**
 * This method is called when your extension is deactivated
 */
export function deactivate() {
	console.log('AI Debugging Assistant is deactivated');
	
	// TODO: Clean up resources
	// TODO: Dispose diagnostic collection
	// TODO: Clear cached analysis results
}
