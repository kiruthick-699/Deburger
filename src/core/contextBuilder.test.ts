import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { buildContext, trimForTokens } from './contextBuilder';
import { AnalysisIssue } from './types';

describe('contextBuilder', () => {
	describe('buildContext', () => {
		test('should generate file summaries from content', async () => {
			const files = [
				{
					path: 'src/utils.ts',
					text: `/**
 * Utility functions for data processing
 */
export function formatData(data: string): string {
	return data.trim();
}
`
				},
				{
					path: 'src/index.ts',
					text: `import express from 'express';

const app = express();
app.listen(3000);
`
				}
			];
			
			const issues: AnalysisIssue[] = [];
			
			const context = await buildContext(files, issues);
			
			expect(context.files).toHaveLength(2);
			expect(context.files[0].path).toBe('src/utils.ts');
			expect(context.files[0].brief).toContain('Utility functions');
			expect(context.files[1].path).toBe('src/index.ts');
			expect(context.files[1].brief).toBeTruthy();
		});
		
		test('should extract top 5 issues sorted by severity', async () => {
			const files = [{ path: 'test.js', text: '' }];
			
			const issues: AnalysisIssue[] = [
				{ file: 'a.js', line: 1, column: 0, ruleId: 'rule1', message: 'Info issue', severity: 'info' },
				{ file: 'b.js', line: 1, column: 0, ruleId: 'rule2', message: 'Error issue 1', severity: 'error' },
				{ file: 'c.js', line: 1, column: 0, ruleId: 'rule3', message: 'Warning issue', severity: 'warning' },
				{ file: 'd.js', line: 1, column: 0, ruleId: 'rule4', message: 'Error issue 2', severity: 'error' },
				{ file: 'e.js', line: 1, column: 0, ruleId: 'rule5', message: 'Info issue 2', severity: 'info' },
				{ file: 'f.js', line: 1, column: 0, ruleId: 'rule6', message: 'Error issue 3', severity: 'error' },
				{ file: 'g.js', line: 1, column: 0, ruleId: 'rule7', message: 'Warning 2', severity: 'warning' }
			];
			
			const context = await buildContext(files, issues);
			
			expect(context.topIssues).toHaveLength(5);
			// First 3 should be errors
			expect(context.topIssues[0].severity).toBe('error');
			expect(context.topIssues[1].severity).toBe('error');
			expect(context.topIssues[2].severity).toBe('error');
		});
		
		test('should extract dependencies from package.json', async () => {
			const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'context-test-'));
			
			try {
				const packageJson = {
					dependencies: {
						'express': '^4.18.0',
						'lodash': '^4.17.21'
					},
					devDependencies: {
						'typescript': '^5.0.0',
						'@types/node': '^20.0.0',
						'jest': '^29.0.0'
					}
				};
				
				await fs.writeFile(
					path.join(tempDir, 'package.json'),
					JSON.stringify(packageJson, null, 2)
				);
				
				const files = [{ path: 'test.js', text: '' }];
				const issues: AnalysisIssue[] = [];
				
				const context = await buildContext(files, issues, tempDir);
				
				expect(context.dependencies).toContain('express');
				expect(context.dependencies).toContain('lodash');
				// Should exclude @types/ packages and common tooling
				expect(context.dependencies).not.toContain('@types/node');
				expect(context.dependencies).not.toContain('typescript');
				expect(context.dependencies).not.toContain('jest');
			} finally {
				await fs.rm(tempDir, { recursive: true, force: true });
			}
		});
		
		test('should handle missing package.json gracefully', async () => {
			const files = [{ path: 'test.js', text: '' }];
			const issues: AnalysisIssue[] = [];
			
			const context = await buildContext(files, issues, '/nonexistent/path');
			
			expect(context.dependencies).toEqual([]);
		});
		
		test('should generate summary from function declarations', async () => {
			const files = [{
				path: 'helper.js',
				text: `function processData() {
	return true;
}

export function formatOutput() {
	return {};
}
`
			}];
			
			const context = await buildContext(files, []);
			
			expect(context.files[0].brief).toContain('function');
		});
		
		test('should generate summary from class declarations', async () => {
			const files = [{
				path: 'MyClass.ts',
				text: `export class DataProcessor {
	process() {
		return null;
	}
}
`
			}];
			
			const context = await buildContext(files, []);
			
			expect(context.files[0].brief).toContain('class');
		});
		
		test('should handle files with only imports', async () => {
			const files = [{
				path: 'config.ts',
				text: `import { config } from 'dotenv';
import express from 'express';
import path from 'path';

config();
`
			}];
			
			const context = await buildContext(files, []);
			
			expect(context.files[0].brief).toBeTruthy();
			expect(context.files[0].brief).toContain('dependencies');
		});
	});
	
	describe('trimForTokens', () => {
		test('should return text unchanged if within token limit', () => {
			const text = 'short text';
			const result = trimForTokens(text, 100);
			
			expect(result).toBe(text);
		});
		
		test('should preserve imports when truncating', () => {
			const text = `import React from 'react';
import { useState } from 'react';

function MyComponent() {
	const [state, setState] = useState(0);
	// ... lots of code ...
	return <div>Hello</div>;
}

function AnotherComponent() {
	return <div>World</div>;
}
`;
			
			const result = trimForTokens(text, 50);
			
			expect(result).toContain('import React');
			expect(result).toContain('import { useState }');
		});
		
		test('should preserve function signatures when truncating', () => {
			const text = `export function processData(input: string): string {
	const processed = input.trim();
	const validated = validate(processed);
	const normalized = normalize(validated);
	return normalized;
}

export async function fetchData(url: string): Promise<Data> {
	const response = await fetch(url);
	return response.json();
}
`;
			
			const result = trimForTokens(text, 50);
			
			expect(result).toContain('function processData');
			expect(result).toContain('async function fetchData');
		});
		
		test('should preserve type declarations when truncating', () => {
			const text = `export interface User {
	id: string;
	name: string;
	email: string;
}

export type Status = 'active' | 'inactive';

function processUser(user: User): void {
	console.log(user.name);
}
`;
			
			const result = trimForTokens(text, 50);
			
			expect(result).toContain('interface User');
			expect(result).toContain('type Status');
		});
		
		test('should preserve header comments', () => {
			const text = `/**
 * This module handles user authentication
 * and session management
 */

import { User } from './types';

export function login(user: User) {
	// implementation
}
`;
			
			const result = trimForTokens(text, 50);
			
			expect(result).toContain('authentication');
			expect(result).toContain('session management');
		});
		
		test('should add truncation indicator when needed', () => {
			const longText = `import a from 'a';
import b from 'b';
import c from 'c';
import d from 'd';
import e from 'e';
import f from 'f';
import g from 'g';
import h from 'h';
import i from 'i';
import j from 'j';
import k from 'k';
import l from 'l';

export function func1() {}
export function func2() {}
export function func3() {}
export function func4() {}
export function func5() {}
export function func6() {}
export function func7() {}
export function func8() {}
export function func9() {}
export function func10() {}
export function func11() {}
export function func12() {}
`;
			
			const result = trimForTokens(longText, 50);
			
			// Should indicate truncation
			expect(result).toContain('truncated');
		});
		
		test('should handle arrow functions', () => {
			const text = `export const processData = (input: string) => {
	return input.trim();
};

export const formatData = async (data: unknown) => {
	return JSON.stringify(data);
};
`;
			
			const result = trimForTokens(text, 50);
			
			expect(result).toContain('processData');
			expect(result).toContain('formatData');
		});
		
		test('should limit number of preserved imports', () => {
			const imports = Array.from({ length: 20 }, (_, i) => `import mod${i} from 'module${i}';`).join('\n');
			const text = `${imports}

export function main() {
	console.log('hello');
}
`;
			
			const result = trimForTokens(text, 100);
			
			// Should limit imports and show count
			expect(result).toContain('... and');
			expect(result).toContain('more imports');
		});
		
		test('should handle very aggressive truncation', () => {
			const text = `import { something } from 'somewhere';

export function veryLongFunctionNameThatExceedsTokenLimit(param1: string, param2: number, param3: boolean) {
	// Lots of implementation here
	return true;
}
`;
			
			const result = trimForTokens(text, 10);
			
			expect(result.length).toBeLessThan(text.length);
			expect(result).toContain('truncated');
		});
	});
	
	describe('structured output', () => {
		test('should return properly typed ProjectContext object', async () => {
			const files = [{ path: 'test.ts', text: 'export const x = 1;' }];
			const issues: AnalysisIssue[] = [{
				file: 'test.ts',
				line: 1,
				column: 0,
				ruleId: 'test-rule',
				message: 'Test issue',
				severity: 'warning'
			}];
			
			const context = await buildContext(files, issues);
			
			expect(context).toHaveProperty('files');
			expect(context).toHaveProperty('topIssues');
			expect(context).toHaveProperty('dependencies');
			
			expect(Array.isArray(context.files)).toBe(true);
			expect(Array.isArray(context.topIssues)).toBe(true);
			expect(Array.isArray(context.dependencies)).toBe(true);
			
			expect(context.files[0]).toHaveProperty('path');
			expect(context.files[0]).toHaveProperty('brief');
		});
		
		test('should be JSON serializable', async () => {
			const files = [{ path: 'test.ts', text: 'const x = 1;' }];
			const issues: AnalysisIssue[] = [];
			
			const context = await buildContext(files, issues);
			
			const json = JSON.stringify(context);
			const parsed = JSON.parse(json);
			
			expect(parsed).toEqual(context);
		});
	});
});
