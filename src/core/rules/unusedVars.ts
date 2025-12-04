import traverse from '@babel/traverse';
import { File, Identifier } from '@babel/types';
import { AnalysisIssue, Rule, RuleConfig } from '../types';

/**
 * Detects variables that are declared but never used
 */
export const unusedVarsRule: Rule = {
	run(ast: File, filePath: string, _fileText: string, _config: RuleConfig): AnalysisIssue[] {
		const issues: AnalysisIssue[] = [];
		const declaredVars = new Map<string, { node: Identifier; used: boolean }>();
		
		traverse(ast, {
			// Track variable declarations
			VariableDeclarator(path) {
				if (path.node.id.type === 'Identifier') {
					const name = path.node.id.name;
					// Skip if it starts with underscore (convention for intentionally unused)
					if (!name.startsWith('_')) {
						declaredVars.set(name, {
							node: path.node.id,
							used: false
						});
					}
				}
			},
			
			// Track function parameter declarations
			FunctionDeclaration(path) {
				path.node.params.forEach(param => {
					if (param.type === 'Identifier' && !param.name.startsWith('_')) {
						declaredVars.set(param.name, {
							node: param,
							used: false
						});
					}
				});
			},
			
			// Track arrow function parameters
			ArrowFunctionExpression(path) {
				path.node.params.forEach(param => {
					if (param.type === 'Identifier' && !param.name.startsWith('_')) {
						declaredVars.set(param.name, {
							node: param,
							used: false
						});
					}
				});
			},
			
			// Track function expression parameters
			FunctionExpression(path) {
				path.node.params.forEach(param => {
					if (param.type === 'Identifier' && !param.name.startsWith('_')) {
						declaredVars.set(param.name, {
							node: param,
							used: false
						});
					}
				});
			},
			
			// Mark variables as used when referenced
			Identifier(path) {
				const name = path.node.name;
				
				// Skip if it's a declaration or property key
				if (
					path.parent.type === 'VariableDeclarator' && path.parent.id === path.node ||
					path.parent.type === 'FunctionDeclaration' && path.parent.id === path.node ||
					path.parent.type === 'ObjectProperty' && path.parent.key === path.node ||
					path.parent.type === 'MemberExpression' && path.parent.property === path.node
				) {
					return;
				}
				
				const varInfo = declaredVars.get(name);
				if (varInfo) {
					varInfo.used = true;
				}
			}
		});
		
		// Report unused variables
		for (const [name, info] of declaredVars) {
			if (!info.used && info.node.loc) {
				issues.push({
					file: filePath,
					line: info.node.loc.start.line,
					column: info.node.loc.start.column,
					ruleId: 'unused-vars',
					message: `Variable '${name}' is declared but never used`,
					severity: 'warning'
				});
			}
		}
		
		return issues;
	}
};
