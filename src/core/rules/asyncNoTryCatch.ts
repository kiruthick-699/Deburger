import traverse from '@babel/traverse';
import { File } from '@babel/types';
import { AnalysisIssue, Rule, RuleConfig } from '../types';

/**
 * Detects async functions that don't have try/catch error handling
 */
export const asyncNoTryCatchRule: Rule = {
	run(ast: File, filePath: string, _fileText: string, _config: RuleConfig): AnalysisIssue[] {
		const issues: AnalysisIssue[] = [];
		
		traverse(ast, {
			// Check async function declarations
			FunctionDeclaration(path) {
				if (path.node.async) {
					checkForTryCatch(path, filePath, issues);
				}
			},
			
			// Check async function expressions
			FunctionExpression(path) {
				if (path.node.async) {
					checkForTryCatch(path, filePath, issues);
				}
			},
			
			// Check async arrow functions
			ArrowFunctionExpression(path) {
				if (path.node.async) {
					checkForTryCatch(path, filePath, issues);
				}
			},
			
			// Check async class methods
			ClassMethod(path) {
				if (path.node.async) {
					checkForTryCatch(path, filePath, issues);
				}
			},
			
			// Check async object methods
			ObjectMethod(path) {
				if (path.node.async) {
					checkForTryCatch(path, filePath, issues);
				}
			}
		});
		
		return issues;
	}
};

function checkForTryCatch(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	path: any,
	filePath: string,
	issues: AnalysisIssue[]
): void {
	const node = path.node;
	
	if (!node.loc) {
		return;
	}
	
	// Check if function body contains a try/catch statement
	let hasTryCatch = false;
	
	if (node.body.type === 'BlockStatement') {
		// Look for try/catch in the function body
		path.traverse({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			TryStatement(tryPath: any) {
				// Check if this try statement is directly in this function (not nested in another function)
				if (tryPath.getFunctionParent() === path) {
					hasTryCatch = true;
					tryPath.stop(); // Stop traversal once we find one
				}
			}
		});
	}
	
	if (!hasTryCatch) {
		const functionName = node.id?.name || 
			(node.key?.name) || 
			'async function';
		
		issues.push({
			file: filePath,
			line: node.loc.start.line,
			column: node.loc.start.column,
			ruleId: 'async-no-try-catch',
			message: `Async function '${functionName}' should have try/catch error handling`,
			severity: 'warning'
		});
	}
}
