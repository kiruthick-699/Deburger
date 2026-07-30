import { parse } from '@babel/parser';
import { AnalysisIssue, RuleConfig } from './types';
import { asyncNoTryCatchRule } from './rules/asyncNoTryCatch';
import { lintFile } from './eslintRunner';
import { getTypeScriptDiagnostics } from './tscRunner';

const DEFAULT_CONFIG: RuleConfig = {
	maxFunctionLines: 50,
	maxNestingDepth: 4
};

export interface FileInput {
	path: string;
	text: string;
}

/**
 * Analyzes multiple files by combining three issue sources:
 * - ESLint (unused vars, nesting depth, function length) — commodity checks a
 *   mature linter already does well, so we don't re-implement them as AST rules
 * - The TypeScript compiler (real type errors), when the project has a tsconfig.json
 * - A single hand-rolled rule (async-no-try-catch) that neither of the above covers
 * @param files - Array of files to analyze
 * @param config - Optional configuration for rule thresholds
 * @param rootPath - Project root, used to locate tsconfig.json for compiler diagnostics
 * @returns Array of analysis issues found across all files
 */
export async function analyzeFiles(
	files: FileInput[],
	config: RuleConfig = DEFAULT_CONFIG,
	rootPath?: string
): Promise<AnalysisIssue[]> {
	const allIssues: AnalysisIssue[] = [];

	for (const file of files) {
		try {
			allIssues.push(...analyzeFile(file, config));
		} catch (error) {
			console.warn(`Error analyzing file ${file.path}:`, error);
			// Continue with other files even if one fails
		}
	}

	if (rootPath) {
		try {
			allIssues.push(...getTypeScriptDiagnostics(rootPath, files.map(f => f.path)));
		} catch (error) {
			console.warn(`Error running TypeScript diagnostics for ${rootPath}:`, error);
		}
	}

	return allIssues;
}

/**
 * Analyzes a single file: ESLint for commodity checks, plus the custom
 * async-no-try-catch rule via a Babel AST (TypeScript diagnostics run
 * separately, once per project, in analyzeFiles).
 */
function analyzeFile(file: FileInput, config: RuleConfig): AnalysisIssue[] {
	const issues: AnalysisIssue[] = [];

	issues.push(
		...lintFile(file.path, file.text, {
			maxFunctionLines: config.maxFunctionLines || 50,
			maxNestingDepth: config.maxNestingDepth || 4,
		})
	);

	const ast = parseCode(file.text, file.path);
	if (ast) {
		try {
			issues.push(...asyncNoTryCatchRule.run(ast, file.path, file.text, config));
		} catch (error) {
			console.warn(`Rule execution error in ${file.path}:`, error);
		}
	}

	return issues;
}

/**
 * Parses source code into an AST.
 * Uses Babel parser with TypeScript and JSX support.
 */
function parseCode(code: string, filePath: string) {
	try {
		return parse(code, {
			sourceType: 'module',
			plugins: [
				'typescript',
				'jsx',
				'decorators-legacy',
				'classProperties',
				'objectRestSpread',
				'optionalChaining',
				'nullishCoalescingOperator'
			],
			errorRecovery: true
		});
	} catch (error) {
		console.warn(`Parse error in ${filePath}:`, error);
		return null;
	}
}

export { AnalysisIssue, RuleConfig } from './types';
