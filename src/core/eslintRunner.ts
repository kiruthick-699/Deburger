import { Linter } from 'eslint';
import * as path from 'path';
import { AnalysisIssue, Severity } from './types';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tsParser = require('@typescript-eslint/parser');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tsPlugin = require('@typescript-eslint/eslint-plugin');

export interface EslintRunnerConfig {
	maxFunctionLines: number;
	maxNestingDepth: number;
}

const TS_EXTENSIONS = new Set(['.ts', '.tsx']);

// Rules that duplicate what a mature linter already does well. Kept as ESLint
// rules instead of hand-rolled AST walks so behavior matches what developers
// already expect from their editor's Problems panel.
const CORE_RULES: Linter.RulesRecord = {
	'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
};

const TS_RULES: Linter.RulesRecord = {
	'@typescript-eslint/no-unused-vars': [
		'warn',
		{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
	],
};

// Map ESLint's own rule IDs onto this project's stable rule vocabulary, so the
// sidebar, diagnostics, explanation panel, and docs don't need to know or care
// which underlying tool produced the issue.
const RULE_ID_MAP: Record<string, string> = {
	'no-unused-vars': 'unused-var',
	'@typescript-eslint/no-unused-vars': 'unused-var',
	'max-depth': 'deep-nesting',
	'max-lines-per-function': 'long-function',
};

// Severity is chosen by us (not ESLint's warn/error), to match how these
// issues are prioritized in the sidebar and Problems panel.
const RULE_SEVERITY: Record<string, Severity> = {
	'long-function': 'info',
};

function severityFor(ruleId: string): Severity {
	return RULE_SEVERITY[ruleId] ?? 'warning';
}

let linterInstance: Linter | undefined;

function getLinter(): Linter {
	if (linterInstance) {
		return linterInstance;
	}
	linterInstance = new Linter();
	linterInstance.defineParser('@typescript-eslint/parser', tsParser);
	linterInstance.defineRule('@typescript-eslint/no-unused-vars', tsPlugin.rules['no-unused-vars']);
	return linterInstance;
}

function buildConfig(filePath: string, runnerConfig: EslintRunnerConfig): Linter.Config {
	const isTypeScript = TS_EXTENSIONS.has(path.extname(filePath));

	return {
		parser: isTypeScript ? '@typescript-eslint/parser' : undefined,
		parserOptions: {
			ecmaVersion: 2021,
			sourceType: 'module',
			ecmaFeatures: { jsx: true },
		},
		rules: {
			...(isTypeScript ? TS_RULES : CORE_RULES),
			'max-depth': ['warn', runnerConfig.maxNestingDepth],
			'max-lines-per-function': [
				'warn',
				{ max: runnerConfig.maxFunctionLines, skipBlankLines: false, skipComments: false },
			],
		},
	};
}

/**
 * Lints a single file's text with ESLint (core rules for JS, @typescript-eslint
 * for TS) and maps the results to AnalysisIssue[]. Covers unused variables and
 * structural complexity (nesting depth, function length) — commodity checks a
 * mature linter already does better than a hand-rolled AST walk.
 */
export function lintFile(
	filePath: string,
	fileText: string,
	runnerConfig: EslintRunnerConfig
): AnalysisIssue[] {
	try {
		const linter = getLinter();
		const config = buildConfig(filePath, runnerConfig);
		const messages = linter.verify(fileText, config, filePath);

		return messages
			.filter(message => !!message.ruleId)
			.map(message => {
				const ruleId = RULE_ID_MAP[message.ruleId as string] ?? (message.ruleId as string);
				return {
					file: filePath,
					line: message.line,
					column: Math.max(0, message.column - 1),
					ruleId,
					message: message.message,
					severity: severityFor(ruleId),
				};
			});
	} catch (error) {
		console.warn(`ESLint error in ${filePath}:`, error);
		return [];
	}
}
