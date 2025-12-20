import * as vscode from 'vscode';
import { AnalysisIssue } from '../core/types';

/**
 * Represents an issue in the TreeView.
 */
interface IssueItem {
	issue: AnalysisIssue;
	label: string;
	description: string;
	iconPath?: vscode.ThemeIcon;
}

/**
 * TreeView data provider for AI Debugger sidebar.
 * Displays analysis issues organized by severity.
 */
export class AIDebuggerTreeProvider implements vscode.TreeDataProvider<IssueItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<IssueItem | undefined | null | void> =
		new vscode.EventEmitter<IssueItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<IssueItem | undefined | null | void> =
		this._onDidChangeTreeData.event;

	private issues: AnalysisIssue[] = [];

	constructor(private context: vscode.ExtensionContext) {}

	/**
	 * Update the issues list and refresh the tree.
	 */
	setIssues(issues: AnalysisIssue[]): void {
		// Sort by severity: errors first, then warnings, then info
		const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
		this.issues = [...issues].sort(
			(a, b) => severityOrder[a.severity] - severityOrder[b.severity]
		);
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: IssueItem): vscode.TreeItem {
		const treeItem = new vscode.TreeItem(element.label);
		treeItem.description = element.description;
		treeItem.collapsibleState = vscode.TreeItemCollapsibleState.None;
		treeItem.command = {
			command: 'ai-debugger.explainIssue',
			title: 'Explain Issue',
			arguments: [element.issue],
		};

		// Set icon based on severity
		switch (element.issue.severity) {
			case 'error':
				treeItem.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('problemsErrorIcon.foreground'));
				break;
			case 'warning':
				treeItem.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('problemsWarningIcon.foreground'));
				break;
			case 'info':
			default:
				treeItem.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('problemsInfoIcon.foreground'));
				break;
		}

		treeItem.tooltip = `${element.issue.file}:${element.issue.line}:${element.issue.column}\n${element.issue.message}`;

		return treeItem;
	}

	getChildren(element?: IssueItem): IssueItem[] {
		if (element) {
			return [];
		}

		return this.issues.map(issue => ({
			issue,
			label: `${issue.ruleId}`,
			description: `${issue.file}:${issue.line}`,
		}));
	}

	getParent(): null {
		return null;
	}
}
