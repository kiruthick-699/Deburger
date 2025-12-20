import * as vscode from 'vscode';
import { activate, deactivate } from './extension';

// Mock vscode APIs
jest.mock('vscode', () => ({
	Uri: {
		file: jest.fn(path => ({ path })),
		joinPath: jest.fn((baseUri, ...pathSegments) => ({ path: `${baseUri.path}/${pathSegments.join('/')}` })),
		parse: jest.fn(uriStr => ({ toString: () => uriStr })),
	},
	ExtensionMode: { Test: 0 },
	TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
	ThemeColor: jest.fn(),
	ThemeIcon: jest.fn(),
	ViewColumn: { One: 1, Two: 2 },
	DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
	DiagnosticTag: { Unnecessary: 1, Deprecated: 2 },
	ProgressLocation: { Notification: 15 },
	EventEmitter: jest.fn(() => ({
		event: {},
		fire: jest.fn(),
	})),
	TreeItem: jest.fn(),
	window: {
		createWebviewPanel: jest.fn(),
		showErrorMessage: jest.fn(),
		showInformationMessage: jest.fn(),
		registerTreeDataProvider: jest.fn(),
		withProgress: jest.fn(async (options, callback) => {
			const progress = { report: jest.fn() };
			return callback(progress);
		}),
	},
	commands: {
		registerCommand: jest.fn((command, callback) => ({ dispose: jest.fn() })),
		executeCommand: jest.fn(),
	},
	languages: {
		createDiagnosticCollection: jest.fn(() => ({
			clear: jest.fn(),
			set: jest.fn(),
			dispose: jest.fn(),
		})),
	},
	workspace: {
		workspaceFolders: [{ uri: { fsPath: '/test/workspace' } }],
	},
	Range: jest.fn(),
	Position: jest.fn(),
	Diagnostic: jest.fn(),
}));

describe('Extension Test Suite', () => {
	test('activate function should register commands', async () => {
		const mockContext = {
			subscriptions: [],
			extensionUri: { path: '/extension' },
		} as unknown as vscode.ExtensionContext;

		await activate(mockContext);

		// Verify TreeView was registered
		expect(vscode.window.registerTreeDataProvider).toHaveBeenCalledWith(
			'ai-debugger.issues',
			expect.any(Object)
		);

		// Verify commands were registered
		expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
			'ai-debugger.runScan',
			expect.any(Function)
		);
		expect(vscode.commands.registerCommand).toHaveBeenCalledWith(
			'ai-debugger.explainIssue',
			expect.any(Function)
		);
	});

	test('deactivate function should dispose diagnostics', () => {
		expect(() => deactivate()).not.toThrow();
	});
});
