import traverse from '@babel/traverse';
import { File } from '@babel/types';
import { AnalysisIssue, Rule, RuleConfig } from '../types';

/**
 * Detects functions that exceed the maximum line count
 */
export const longFunctionRule: Rule = {
	run(ast: File, filePath: string, _fileText: string, config: RuleConfig): AnalysisIssue[] {
		const issues: AnalysisIssue[] = [];
		const maxLines = config.maxFunctionLines || 80;
		
		traverse(ast, {
			// Check function declarations
			FunctionDeclaration(path) {
				checkFunctionLength(path.node, filePath, maxLines, issues);
			},
			
			// Check function expressions
			FunctionExpression(path) {
				checkFunctionLength(path.node, filePath, maxLines, issues);
			},
			
			// Check arrow functions
			ArrowFunctionExpression(path) {
				checkFunctionLength(path.node, filePath, maxLines, issues);
			},
			
			// Check class methods
			ClassMethod(path) {
				checkFunctionLength(path.node, filePath, maxLines, issues);
			},
			
			// Check object methods
			ObjectMethod(path) {
				checkFunctionLength(path.node, filePath, maxLines, issues);
			}
		});
		
		return issues;
	}
};

function checkFunctionLength(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	node: any,
	filePath: string,
	maxLines: number,
	issues: AnalysisIssue[]
): void {
	if (!node.loc) {
		return;
	}
	
	const startLine = node.loc.start.line;
	const endLine = node.loc.end.line;
	const lineCount = endLine - startLine + 1;
	
	if (lineCount > maxLines) {
		const functionName = node.id?.name || 
			(node.key?.name) || 
			'anonymous function';
		
		issues.push({
			file: filePath,
			line: startLine,
			column: node.loc.start.column,
			ruleId: 'long-function',
			message: `Function '${functionName}' is ${lineCount} lines long (max ${maxLines})`,
			severity: 'warning'
		});
	}
}
