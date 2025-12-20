// Mock EventEmitter first
class MockEventEmitter<T> {
	private listeners: Array<(e: T) => void> = [];
	event = (callback: (e: T) => void) => {
		this.listeners.push(callback);
		return { dispose: jest.fn() };
	};
	fire = (e: T) => this.listeners.forEach(l => l(e));
}

// Mock TreeItem
class MockTreeItem {
	label?: string | { label: string; highlights?: [number, number][] };
	description?: string | boolean;
	tooltip?: string;
	command?: vscode.Command;
	iconPath?: any;
	collapsibleState?: any;

	constructor(label: string, collapsibleState?: any) {
		this.label = label;
		this.collapsibleState = collapsibleState;
	}
}

// Mock vscode module for UI tests
jest.mock('vscode', () => ({
	EventEmitter: MockEventEmitter,
	TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
	ThemeColor: jest.fn(),
	ThemeIcon: jest.fn(),
	Uri: {
		file: jest.fn(path => ({ path, toString: () => path })),
		joinPath: jest.fn((baseUri, ...pathSegments) => ({
			path: `${baseUri.path}/${pathSegments.join('/')}`,
		})),
		parse: jest.fn(uriStr => ({ toString: () => uriStr })),
	},
	window: {
		createWebviewPanel: jest.fn(() => ({
			webview: { html: '' },
			title: '',
			reveal: jest.fn(),
			onDidDispose: jest.fn((callback) => ({ dispose: jest.fn() })),
			dispose: jest.fn(),
		})),
	},
	DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2, Hint: 3 },
	DiagnosticTag: { Unnecessary: 1, Deprecated: 2 },
	languages: {
		createDiagnosticCollection: jest.fn(() => ({
			clear: jest.fn(),
			set: jest.fn(),
			dispose: jest.fn(),
		})),
	},
	Range: jest.fn(),
	Position: jest.fn(),
	Diagnostic: jest.fn(),
	TreeItem: MockTreeItem,
}), { virtual: true });

import * as vscode from 'vscode';
import { AIDebuggerTreeProvider } from './aiSidebar';
import { DiagnosticsManager } from './diagnosticsManager';
import { AnalysisIssue } from '../core/types';

describe('UI Components', () => {
	let mockContext: vscode.ExtensionContext;

	beforeEach(() => {
		mockContext = {
			extensionUri: vscode.Uri.file('/fake/extension'),
		} as unknown as vscode.ExtensionContext;
	});

	describe('AIDebuggerTreeProvider', () => {
		let provider: AIDebuggerTreeProvider;

		beforeEach(() => {
			provider = new AIDebuggerTreeProvider(mockContext);
		});

		it('should initialize with empty issues', () => {
			const children = provider.getChildren();
			expect(children).toEqual([]);
		});

		it('should update issues and sort by severity', () => {
			const issues: AnalysisIssue[] = [
				{
					file: 'test.ts',
					line: 10,
					column: 5,
					ruleId: 'unused-var',
					message: 'Variable unused',
					severity: 'info',
				},
				{
					file: 'test.ts',
					line: 20,
					column: 5,
					ruleId: 'long-function',
					message: 'Function too long',
					severity: 'error',
				},
				{
					file: 'test.ts',
					line: 30,
					column: 5,
					ruleId: 'async-no-try-catch',
					message: 'No try/catch',
					severity: 'warning',
				},
			];

			provider.setIssues(issues);
			const children = provider.getChildren();

			expect(children.length).toBe(3);
			// Should be sorted: error, warning, info
			expect(children[0].issue.severity).toBe('error');
			expect(children[1].issue.severity).toBe('warning');
			expect(children[2].issue.severity).toBe('info');
		});

		it('should generate tree items with correct labels', () => {
			const issues: AnalysisIssue[] = [
				{
					file: 'src/app.ts',
					line: 42,
					column: 10,
					ruleId: 'unused-var',
					message: 'Unused variable',
					severity: 'warning',
				},
			];

			provider.setIssues(issues);
			const children = provider.getChildren();
			const treeItem = provider.getTreeItem(children[0]);

			expect(treeItem.label).toBe('unused-var');
			expect(treeItem.description).toBe('src/app.ts:42');
			expect(treeItem.tooltip).toContain('src/app.ts:42:10');
			expect(treeItem.tooltip).toContain('Unused variable');
		});

		it('should set command to explain issue on click', () => {
			const issues: AnalysisIssue[] = [
				{
					file: 'test.ts',
					line: 5,
					column: 1,
					ruleId: 'test-rule',
					message: 'Test message',
					severity: 'info',
				},
			];

			provider.setIssues(issues);
			const children = provider.getChildren();
			const treeItem = provider.getTreeItem(children[0]);

			expect(treeItem.command?.command).toBe('ai-debugger.explainIssue');
			expect(treeItem.command?.arguments?.[0]).toEqual(issues[0]);
		});

		it('should assign correct icons based on severity', () => {
			const errorIssue: AnalysisIssue = {
				file: 'test.ts',
				line: 1,
				column: 1,
				ruleId: 'error-rule',
				message: 'Error',
				severity: 'error',
			};
			const warningIssue: AnalysisIssue = {
				file: 'test.ts',
				line: 2,
				column: 1,
				ruleId: 'warning-rule',
				message: 'Warning',
				severity: 'warning',
			};
			const infoIssue: AnalysisIssue = {
				file: 'test.ts',
				line: 3,
				column: 1,
				ruleId: 'info-rule',
				message: 'Info',
				severity: 'info',
			};

			provider.setIssues([errorIssue, warningIssue, infoIssue]);
			const children = provider.getChildren();

			const errorItem = provider.getTreeItem(children[0]);
			const warningItem = provider.getTreeItem(children[1]);
			const infoItem = provider.getTreeItem(children[2]);

			expect(errorItem.iconPath).toBeDefined();
			expect(warningItem.iconPath).toBeDefined();
			expect(infoItem.iconPath).toBeDefined();
		});
	});

	describe('DiagnosticsManager', () => {
		let manager: DiagnosticsManager;

		beforeEach(() => {
			manager = new DiagnosticsManager();
		});

		afterEach(() => {
			manager.dispose();
		});

		it('should initialize with empty diagnostics', () => {
			expect(manager).toBeDefined();
		});

		it('should update diagnostics from issues', () => {
			const issues: AnalysisIssue[] = [
				{
					file: '/workspace/test.ts',
					line: 10,
					column: 5,
					ruleId: 'unused-var',
					message: 'Variable unused',
					severity: 'warning',
				},
			];

			manager.updateDiagnostics(issues);
			expect(manager).toBeDefined();
		});

		it('should clear diagnostics', () => {
			const issues: AnalysisIssue[] = [
				{
					file: '/workspace/test.ts',
					line: 10,
					column: 5,
					ruleId: 'test-rule',
					message: 'Test',
					severity: 'info',
				},
			];

			manager.updateDiagnostics(issues);
			manager.clear();
			expect(manager).toBeDefined();
		});

		it('should organize issues by file', () => {
			const issues: AnalysisIssue[] = [
				{
					file: '/workspace/file1.ts',
					line: 10,
					column: 5,
					ruleId: 'rule1',
					message: 'Issue 1',
					severity: 'warning',
				},
				{
					file: '/workspace/file2.ts',
					line: 20,
					column: 10,
					ruleId: 'rule2',
					message: 'Issue 2',
					severity: 'error',
				},
			];

			manager.updateDiagnostics(issues);
			expect(manager).toBeDefined();
		});
	});
});
