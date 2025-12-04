import traverse from '@babel/traverse';
import { File, Node } from '@babel/types';
import { AnalysisIssue, Rule, RuleConfig } from '../types';

/**
 * Detects code with excessive nesting depth
 */
export const deepNestingRule: Rule = {
	run(ast: File, filePath: string, _fileText: string, config: RuleConfig): AnalysisIssue[] {
		const issues: AnalysisIssue[] = [];
		const maxDepth = config.maxNestingDepth || 4;
		
		// Track nesting depth as we traverse
		let currentDepth = 0;
		const depthStack: Array<{ node: Node; depth: number }> = [];
		
		traverse(ast, {
			enter(path) {
				const node = path.node;
				
				// Check if this node increases nesting depth
				if (isNestingNode(node)) {
					currentDepth++;
					depthStack.push({ node, depth: currentDepth });
					
					// Report if depth exceeds maximum
					if (currentDepth > maxDepth && node.loc) {
						const nodeType = getNodeDescription(node);
						
						issues.push({
							file: filePath,
							line: node.loc.start.line,
							column: node.loc.start.column,
							ruleId: 'deep-nesting',
							message: `${nodeType} has nesting depth ${currentDepth} (max ${maxDepth})`,
							severity: 'warning'
						});
					}
				}
			},
			
			exit(path) {
				const node = path.node;
				
				// Decrease depth when exiting a nesting node
				if (isNestingNode(node)) {
					const last = depthStack.pop();
					if (last && last.node === node) {
						currentDepth--;
					}
				}
			}
		});
		
		return issues;
	}
};

/**
 * Determines if a node increases nesting depth
 */
function isNestingNode(node: Node): boolean {
	return (
		node.type === 'IfStatement' ||
		node.type === 'ForStatement' ||
		node.type === 'ForInStatement' ||
		node.type === 'ForOfStatement' ||
		node.type === 'WhileStatement' ||
		node.type === 'DoWhileStatement' ||
		node.type === 'SwitchStatement' ||
		node.type === 'TryStatement' ||
		node.type === 'CatchClause' ||
		node.type === 'WithStatement'
	);
}

/**
 * Gets a human-readable description of a node
 */
function getNodeDescription(node: Node): string {
	switch (node.type) {
		case 'IfStatement':
			return 'If statement';
		case 'ForStatement':
		case 'ForInStatement':
		case 'ForOfStatement':
			return 'For loop';
		case 'WhileStatement':
		case 'DoWhileStatement':
			return 'While loop';
		case 'SwitchStatement':
			return 'Switch statement';
		case 'TryStatement':
			return 'Try statement';
		case 'CatchClause':
			return 'Catch clause';
		default:
			return 'Block';
	}
}
