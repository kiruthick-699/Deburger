import { parse } from '@babel/parser';
import { AnalysisIssue, Rule, RuleConfig } from './types';
import { unusedVarsRule } from './rules/unusedVars';
import { longFunctionRule } from './rules/longFunction';
import { asyncNoTryCatchRule } from './rules/asyncNoTryCatch';
import { deepNestingRule } from './rules/deepNesting';

const DEFAULT_CONFIG: RuleConfig = {
	maxFunctionLines: 80,
	maxNestingDepth: 4
};

// Registry of all rules
const RULES: Rule[] = [
	unusedVarsRule,
	longFunctionRule,
	asyncNoTryCatchRule,
	deepNestingRule
];

export interface FileInput {
	path: string;
	text: string;
}

/**
 * Analyzes multiple files using all registered rules
 * @param files - Array of files to analyze
 * @param config - Optional configuration for rule thresholds
 * @returns Array of analysis issues found across all files
 */
export async function analyzeFiles(
	files: FileInput[],
	config: RuleConfig = DEFAULT_CONFIG
): Promise<AnalysisIssue[]> {
	const allIssues: AnalysisIssue[] = [];
	
	for (const file of files) {
		try {
			const issues = await analyzeFile(file, config);
			allIssues.push(...issues);
		} catch (error) {
			console.warn(`Error analyzing file ${file.path}:`, error);
			// Continue with other files even if one fails
		}
	}
	
	return allIssues;
}

/**
 * Analyzes a single file using all registered rules
 */
async function analyzeFile(
	file: FileInput,
	config: RuleConfig
): Promise<AnalysisIssue[]> {
	const issues: AnalysisIssue[] = [];
	
	// Parse the file to an AST
	const ast = parseCode(file.text, file.path);
	
	if (!ast) {
		return issues; // Failed to parse, skip this file
	}
	
	// Run all rules against the AST
	for (const rule of RULES) {
		try {
			const ruleIssues = rule.run(ast, file.path, file.text, config);
			issues.push(...ruleIssues);
		} catch (error) {
			console.warn(`Rule execution error in ${file.path}:`, error);
		}
	}
	
	return issues;
}

/**
 * Parses source code into an AST
 * Uses Babel parser with TypeScript and JSX support
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
