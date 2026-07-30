import * as ts from 'typescript';
import * as path from 'path';
import { AnalysisIssue, Severity } from './types';

function severityForCategory(category: ts.DiagnosticCategory): Severity | null {
	switch (category) {
		case ts.DiagnosticCategory.Error:
			return 'error';
		case ts.DiagnosticCategory.Warning:
			return 'warning';
		default:
			return null; // skip Suggestion/Message-level diagnostics
	}
}

/**
 * Runs the real TypeScript compiler against the project's own tsconfig.json
 * and returns type-check diagnostics for the files we scanned, as
 * AnalysisIssue[]. This is real compiler output (wrong argument types, missing
 * properties, etc.) that no AST pattern-matching rule can approximate.
 *
 * Returns an empty array when no tsconfig.json is found — we intentionally
 * don't guess compiler options for a project that isn't configured for
 * type-checking.
 */
export function getTypeScriptDiagnostics(
	rootPath: string,
	scannedFilePaths: string[]
): AnalysisIssue[] {
	const tsFiles = scannedFilePaths.filter(p => p.endsWith('.ts') || p.endsWith('.tsx'));
	if (tsFiles.length === 0) {
		return [];
	}

	const tsconfigPath = ts.findConfigFile(rootPath, ts.sys.fileExists, 'tsconfig.json');
	if (!tsconfigPath) {
		return [];
	}

	try {
		const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
		if (configFile.error) {
			return [];
		}

		const parsedConfig = ts.parseJsonConfigFileContent(
			configFile.config,
			ts.sys,
			path.dirname(tsconfigPath)
		);

		const program = ts.createProgram({
			rootNames: parsedConfig.fileNames,
			options: { ...parsedConfig.options, noEmit: true },
		});

		const scannedSet = new Set(tsFiles.map(p => path.resolve(p)));
		const issues: AnalysisIssue[] = [];

		for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
			if (!diagnostic.file || diagnostic.start === undefined) {
				continue;
			}

			const filePath = path.resolve(diagnostic.file.fileName);
			if (!scannedSet.has(filePath)) {
				continue; // only surface diagnostics for files we actually scanned
			}

			const severity = severityForCategory(diagnostic.category);
			if (!severity) {
				continue;
			}

			const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

			issues.push({
				file: filePath,
				line: line + 1,
				column: character,
				ruleId: `ts${diagnostic.code}`,
				message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
				severity,
			});
		}

		return issues;
	} catch (error) {
		console.warn(`TypeScript diagnostics error for ${rootPath}:`, error);
		return [];
	}
}
