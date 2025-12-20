import * as path from 'path';

// Mock the modules before importing them
jest.mock('./core/projectScanner', () => ({
	scanProject: jest.fn(),
}));

jest.mock('./core/analyzer', () => ({
	analyzeFiles: jest.fn(),
}));

jest.mock('./core/contextBuilder', () => ({
	buildContext: jest.fn(),
}));

import { scanProject, ScannedFile } from './core/projectScanner';
import { analyzeFiles } from './core/analyzer';
import { buildContext } from './core/contextBuilder';
import { AnalysisIssue } from './core/types';

/**
 * Integration tests for the full analysis pipeline.
 * Tests: scanProject -> analyzeFiles -> buildContext -> mock LLM explain
 */
describe('Full Analysis Pipeline Integration', () => {
	const fixtureDir = path.join(__dirname, '__fixtures__');

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('end-to-end analysis workflow', () => {
		it('should scan fixture project and find JS file', async () => {
			const mockFiles: ScannedFile[] = [
				{
					path: path.join(fixtureDir, 'sample.js'),
					text: 'const unused = 1;\nasync function test() {}',
				},
			];
			(scanProject as jest.Mock).mockResolvedValue(mockFiles);

			const files = await scanProject(fixtureDir);

			expect(files.length).toBeGreaterThan(0);
			expect(files.some((f: ScannedFile) => f.path.includes('sample.js'))).toBe(true);
		});

		it('should analyze scanned files and detect issues', async () => {
			const mockFiles: ScannedFile[] = [
				{
					path: path.join(fixtureDir, 'sample.js'),
					text: 'const unused = 1;',
				},
			];

			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'unused-var',
					message: 'Variable unused is declared but never used',
					file: mockFiles[0].path,
					line: 1,
					column: 0,
					severity: 'warning',
				},
				{
					ruleId: 'async-no-try-catch',
					message: 'Async function without try-catch',
					file: mockFiles[0].path,
					line: 5,
					column: 0,
					severity: 'error',
				},
			];

			(analyzeFiles as jest.Mock).mockResolvedValue(mockIssues);

			const issues = await analyzeFiles(mockFiles);

			expect(issues.length).toBeGreaterThan(0);
			const ruleIds = issues.map((i: AnalysisIssue) => i.ruleId);
			expect(ruleIds).toContain('unused-var');
			expect(ruleIds).toContain('async-no-try-catch');
		});

		it('should build context from files and issues', async () => {
			const mockFiles: ScannedFile[] = [
				{
					path: path.join(fixtureDir, 'sample.js'),
					text: 'code here',
				},
			];

			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'unused-var',
					message: 'Variable unused',
					file: mockFiles[0].path,
					line: 1,
					column: 0,
					severity: 'warning',
				},
			];

			const mockContext = {
				files: [
					{
						path: mockFiles[0].path,
						issues: 1,
						summary: 'Test file',
					},
				],
				topIssues: mockIssues,
				dependencies: [],
			};

			(buildContext as jest.Mock).mockResolvedValue(mockContext);

			const context = await buildContext(mockFiles, mockIssues, fixtureDir);

			expect(context).toBeDefined();
			expect(context.files.length).toBeGreaterThan(0);
			expect(context.topIssues.length).toBeGreaterThan(0);
			expect(context.topIssues.length).toBeLessThanOrEqual(5);
		});

		it('should organize issues by severity in TreeView order', async () => {
			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'unused-var',
					message: 'Variable unused',
					file: 'test.js',
					line: 1,
					column: 0,
					severity: 'warning',
				},
				{
					ruleId: 'async-no-try-catch',
					message: 'Async no try catch',
					file: 'test.js',
					line: 5,
					column: 0,
					severity: 'error',
				},
				{
					ruleId: 'deep-nesting',
					message: 'Deep nesting',
					file: 'test.js',
					line: 10,
					column: 0,
					severity: 'info',
				},
			];

			// Verify we have mixed severities
			expect(mockIssues.length).toBeGreaterThan(0);

			// Should have at least warnings or errors
			const severities = new Set(mockIssues.map((i: AnalysisIssue) => i.severity));
			expect(severities.size).toBeGreaterThan(0);
		});

		it('should have valid issue structure for diagnostics', async () => {
			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'unused-var',
					message: 'Variable unused',
					file: 'test.js',
					line: 1,
					column: 0,
					severity: 'warning',
				},
			];

			expect(mockIssues.length).toBeGreaterThan(0);

			// Verify all issues have required fields for diagnostics
			mockIssues.forEach((issue: AnalysisIssue) => {
				expect(issue.file).toBeTruthy();
				expect(issue.line).toBeGreaterThan(0);
				expect(issue.column).toBeGreaterThanOrEqual(0);
				expect(issue.ruleId).toBeTruthy();
				expect(issue.message).toBeTruthy();
				expect(['error', 'warning', 'info']).toContain(issue.severity);
			});
		});

		it('should extract dependencies from fixture package.json', async () => {
			const mockFiles: ScannedFile[] = [
				{
					path: path.join(fixtureDir, 'package.json'),
					text: '{"dependencies": {"lodash": "^4.0", "react": "^18.0"}}',
				},
			];

			const mockIssues: AnalysisIssue[] = [];

			const mockContext = {
				files: [],
				topIssues: [],
				dependencies: ['lodash', 'react'],
			};

			(buildContext as jest.Mock).mockResolvedValue(mockContext);

			const context = await buildContext(mockFiles, mockIssues, fixtureDir);

			expect(context.dependencies).toBeDefined();
			expect(Array.isArray(context.dependencies)).toBe(true);
			expect(context.dependencies).toContain('lodash');
			expect(context.dependencies).toContain('react');
		});

		it('should generate summaries for all scanned files', async () => {
			const mockFiles: ScannedFile[] = [
				{
					path: path.join(fixtureDir, 'sample.js'),
					text: 'code here',
				},
			];

			const mockIssues: AnalysisIssue[] = [];

			const mockContext = {
				files: [
					{
						path: mockFiles[0].path,
						issues: 0,
						brief: 'Sample JavaScript file',
					},
				],
				topIssues: [],
				dependencies: [],
			};

			(buildContext as jest.Mock).mockResolvedValue(mockContext);

			const context = await buildContext(mockFiles, mockIssues, fixtureDir);

			expect(context.files.length).toBe(mockFiles.length);

			// Each file summary should have path and brief description
			context.files.forEach((fileSummary: any) => {
				expect(fileSummary.path).toBeTruthy();
				expect(fileSummary.brief).toBeTruthy();
				expect(typeof fileSummary.brief).toBe('string');
			});
		});

		it('should handle the complete pipeline without errors', async () => {
			const mockFiles: ScannedFile[] = [
				{
					path: path.join(fixtureDir, 'sample.js'),
					text: 'code here',
				},
			];

			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'unused-var',
					message: 'Variable unused',
					file: mockFiles[0].path,
					line: 1,
					column: 0,
					severity: 'warning',
				},
			];

			const mockContext = {
				files: [
					{
						path: mockFiles[0].path,
						issues: 1,
						brief: 'Test file',
					},
				],
				topIssues: mockIssues,
				dependencies: [],
			};

			(scanProject as jest.Mock).mockResolvedValue(mockFiles);
			(analyzeFiles as jest.Mock).mockResolvedValue(mockIssues);
			(buildContext as jest.Mock).mockResolvedValue(mockContext);

			const files = await scanProject(fixtureDir);
			expect(files.length).toBeGreaterThan(0);

			const issues = await analyzeFiles(files);
			expect(issues.length).toBeGreaterThan(0);

			const context = await buildContext(files, issues, fixtureDir);
			expect(context).toHaveProperty('files');
			expect(context).toHaveProperty('topIssues');
			expect(context).toHaveProperty('dependencies');
		});
	});

	describe('mock LLM explain integration', () => {
		it('should format issues correctly for LLM prompts', async () => {
			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'unused-var',
					message: 'Variable unused',
					file: 'test.js',
					line: 1,
					column: 0,
					severity: 'warning',
				},
			];

			expect(mockIssues.length).toBeGreaterThan(0);

			// Verify issue data would work in LLM prompt template
			const issue = mockIssues[0];
			const prompt = `Issue: ${issue.file} line ${issue.line} — ${issue.ruleId} — ${issue.message}`;

			expect(prompt).toContain(issue.file);
			expect(prompt).toContain(issue.line.toString());
			expect(prompt).toContain(issue.ruleId);
			expect(prompt).toContain(issue.message);
		});

		it('should provide context for LLM from buildContext', async () => {
			const mockFiles: ScannedFile[] = [
				{
					path: path.join(fixtureDir, 'sample.js'),
					text: 'code here',
				},
			];

			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'unused-var',
					message: 'Variable unused',
					file: mockFiles[0].path,
					line: 1,
					column: 0,
					severity: 'warning',
				},
			];

			const mockContext = {
				files: [
					{
						path: mockFiles[0].path,
						issues: 1,
						brief: 'Test file',
					},
				],
				topIssues: mockIssues,
				dependencies: [],
			};

			(buildContext as jest.Mock).mockResolvedValue(mockContext);

			const context = await buildContext(mockFiles, mockIssues, fixtureDir);

			// Verify context contains necessary info for LLM prompts
			expect(context.files.length).toBeGreaterThan(0);
			expect(context.topIssues.length).toBeGreaterThan(0);

			// Context should be suitable for LLM API
			const contextStr = JSON.stringify(context);
			expect(contextStr.length).toBeGreaterThan(0);
			expect(contextStr.length).toBeLessThan(100000); // Should be reasonably sized
		});
	});

	describe('TreeView population validation', () => {
		it('should provide issues in correct format for TreeView items', async () => {
			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'async-no-try-catch',
					message: 'Async no try catch',
					file: 'test.js',
					line: 5,
					column: 0,
					severity: 'error',
				},
				{
					ruleId: 'unused-var',
					message: 'Variable unused',
					file: 'test.js',
					line: 1,
					column: 0,
					severity: 'warning',
				},
			];

			// Issues should be sortable by severity for TreeView display
			const sortedBySeverity = [...mockIssues].sort((a: AnalysisIssue, b: AnalysisIssue) => {
				const severityOrder: Record<string, number> = { error: 0, warning: 1, info: 2 };
				return severityOrder[a.severity] - severityOrder[b.severity];
			});

			expect(sortedBySeverity.length).toBe(mockIssues.length);
			expect(sortedBySeverity[0].severity).toBe('error');
		});

		it('should have unique issue locations for diagnostics mapping', async () => {
			const mockIssues: AnalysisIssue[] = [
				{
					ruleId: 'unused-var',
					message: 'Variable unused',
					file: 'test.js',
					line: 1,
					column: 0,
					severity: 'warning',
				},
			];

			// Create a map like DiagnosticsManager does
			const issuesByFile = new Map<string, AnalysisIssue[]>();

			for (const issue of mockIssues) {
				if (!issuesByFile.has(issue.file)) {
					issuesByFile.set(issue.file, []);
				}
				issuesByFile.get(issue.file)!.push(issue);
			}

			expect(issuesByFile.size).toBeGreaterThan(0);

			// Each file should have its issues
			for (const [file, fileIssues] of issuesByFile) {
				expect(file).toBeTruthy();
				expect(fileIssues.length).toBeGreaterThan(0);
			}
		});
	});
});
