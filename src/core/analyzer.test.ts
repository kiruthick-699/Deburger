import { analyzeFiles } from './analyzer';

describe('Analyzer', () => {
	describe('unused-vars rule', () => {
		test('should detect unused variable declarations', async () => {
			const files = [{
				path: 'test.js',
				text: `
const unusedVar = 42;
const usedVar = 10;
console.log(usedVar);
				`
			}];
			
			const issues = await analyzeFiles(files);
			const unusedVarIssues = issues.filter(i => i.ruleId === 'unused-vars');
			
			expect(unusedVarIssues).toHaveLength(1);
			expect(unusedVarIssues[0].message).toContain('unusedVar');
			expect(unusedVarIssues[0].line).toBe(2);
			expect(unusedVarIssues[0].severity).toBe('warning');
		});
		
	// Note: Function parameter tracking has scope limitations in current implementation
	test('should detect unused variables in function scope', async () => {
		const files = [{
			path: 'test.js',
			text: `
function example() {
	const unusedInFunction = 123;
	const usedInFunction = 456;
	return usedInFunction;
}
			`
		}];
		
		const issues = await analyzeFiles(files);
		const unusedVarIssues = issues.filter(i => i.ruleId === 'unused-vars');
		
		expect(unusedVarIssues.length).toBeGreaterThanOrEqual(1);
		const unusedIssue = unusedVarIssues.find(i => i.message.includes('unusedInFunction'));
		expect(unusedIssue).toBeDefined();
	});		test('should ignore variables starting with underscore', async () => {
			const files = [{
				path: 'test.js',
				text: `
const _ignored = 42;
const alsoIgnored = 10;
console.log(alsoIgnored);
				`
			}];
			
			const issues = await analyzeFiles(files);
			const unusedVarIssues = issues.filter(i => i.ruleId === 'unused-vars');
			
			expect(unusedVarIssues).toHaveLength(0);
		});
	});
	
	describe('long-function rule', () => {
		test('should detect functions exceeding max lines', async () => {
			const longFunctionCode = `
function longFunction() {
${Array(85).fill('  console.log("line");').join('\n')}
}
			`;
			
			const files = [{
				path: 'test.js',
				text: longFunctionCode
			}];
			
			const issues = await analyzeFiles(files);
			const longFuncIssues = issues.filter(i => i.ruleId === 'long-function');
			
			expect(longFuncIssues).toHaveLength(1);
			expect(longFuncIssues[0].message).toContain('longFunction');
			expect(longFuncIssues[0].message).toMatch(/\d+ lines long/);
			expect(longFuncIssues[0].severity).toBe('warning');
		});
		
		test('should not flag short functions', async () => {
			const files = [{
				path: 'test.js',
				text: `
function shortFunction() {
	console.log("short");
	return 42;
}
				`
			}];
			
			const issues = await analyzeFiles(files);
			const longFuncIssues = issues.filter(i => i.ruleId === 'long-function');
			
			expect(longFuncIssues).toHaveLength(0);
		});
		
		test('should respect custom max lines configuration', async () => {
			const files = [{
				path: 'test.js',
				text: `
function mediumFunction() {
${Array(15).fill('  console.log("line");').join('\n')}
}
				`
			}];
			
			const issues = await analyzeFiles(files, { maxFunctionLines: 10 });
			const longFuncIssues = issues.filter(i => i.ruleId === 'long-function');
			
			expect(longFuncIssues).toHaveLength(1);
		});
	});
	
	describe('async-no-try-catch rule', () => {
		test('should detect async functions without try/catch', async () => {
			const files = [{
				path: 'test.js',
				text: `
async function fetchData() {
	const response = await fetch('/api');
	return response.json();
}
				`
			}];
			
			const issues = await analyzeFiles(files);
			const asyncIssues = issues.filter(i => i.ruleId === 'async-no-try-catch');
			
			expect(asyncIssues).toHaveLength(1);
			expect(asyncIssues[0].message).toContain('fetchData');
			expect(asyncIssues[0].message).toContain('try/catch');
			expect(asyncIssues[0].line).toBe(2);
		});
		
		test('should not flag async functions with try/catch', async () => {
			const files = [{
				path: 'test.js',
				text: `
async function fetchData() {
	try {
		const response = await fetch('/api');
		return response.json();
	} catch (error) {
		console.error(error);
	}
}
				`
			}];
			
			const issues = await analyzeFiles(files);
			const asyncIssues = issues.filter(i => i.ruleId === 'async-no-try-catch');
			
			expect(asyncIssues).toHaveLength(0);
		});
		
		test('should detect async arrow functions without try/catch', async () => {
			const files = [{
				path: 'test.js',
				text: `
const getData = async () => {
	const data = await fetch('/api');
	return data;
};
				`
			}];
			
			const issues = await analyzeFiles(files);
			const asyncIssues = issues.filter(i => i.ruleId === 'async-no-try-catch');
			
			expect(asyncIssues).toHaveLength(1);
		});
	});
	
	describe('deep-nesting rule', () => {
		test('should detect excessive nesting depth', async () => {
			const files = [{
				path: 'test.js',
				text: `
function deeplyNested() {
	if (true) {
		if (true) {
			if (true) {
				if (true) {
					if (true) {
						console.log("too deep");
					}
				}
			}
		}
	}
}
				`
			}];
			
			const issues = await analyzeFiles(files);
			const nestingIssues = issues.filter(i => i.ruleId === 'deep-nesting');
			
			expect(nestingIssues.length).toBeGreaterThan(0);
			expect(nestingIssues[0].message).toContain('nesting depth');
		});
		
		test('should not flag acceptable nesting levels', async () => {
			const files = [{
				path: 'test.js',
				text: `
function acceptableNesting() {
	if (true) {
		if (true) {
			console.log("ok");
		}
	}
}
				`
			}];
			
			const issues = await analyzeFiles(files);
			const nestingIssues = issues.filter(i => i.ruleId === 'deep-nesting');
			
			expect(nestingIssues).toHaveLength(0);
		});
		
		test('should respect custom max depth configuration', async () => {
			const files = [{
				path: 'test.js',
				text: `
function nested() {
	if (true) {
		if (true) {
			if (true) {
				console.log("level 3");
			}
		}
	}
}
				`
			}];
			
			const issues = await analyzeFiles(files, { maxNestingDepth: 2 });
			const nestingIssues = issues.filter(i => i.ruleId === 'deep-nesting');
			
			expect(nestingIssues.length).toBeGreaterThan(0);
		});
		
		test('should detect nesting in loops', async () => {
			const files = [{
				path: 'test.js',
				text: `
function loopNesting() {
	for (let i = 0; i < 10; i++) {
		for (let j = 0; j < 10; j++) {
			if (true) {
				while (true) {
					if (true) {
						console.log("nested");
					}
				}
			}
		}
	}
}
				`
			}];
			
			const issues = await analyzeFiles(files);
			const nestingIssues = issues.filter(i => i.ruleId === 'deep-nesting');
			
			expect(nestingIssues.length).toBeGreaterThan(0);
		});
	});
	
	describe('TypeScript support', () => {
		test('should analyze TypeScript code', async () => {
			const files = [{
				path: 'test.ts',
				text: `
const unusedTyped: number = 42;
const usedTyped: string = "hello";
console.log(usedTyped);
				`
			}];
			
			const issues = await analyzeFiles(files);
			const unusedVarIssues = issues.filter(i => i.ruleId === 'unused-vars');
			
			expect(unusedVarIssues).toHaveLength(1);
			expect(unusedVarIssues[0].message).toContain('unusedTyped');
		});
	});
	
	describe('multiple files', () => {
		test('should analyze multiple files and aggregate issues', async () => {
			const files = [
				{
					path: 'file1.js',
					text: 'const unused1 = 1;'
				},
				{
					path: 'file2.js',
					text: 'const unused2 = 2;'
				}
			];
			
			const issues = await analyzeFiles(files);
			const unusedVarIssues = issues.filter(i => i.ruleId === 'unused-vars');
			
			expect(unusedVarIssues).toHaveLength(2);
			expect(unusedVarIssues[0].file).toBe('file1.js');
			expect(unusedVarIssues[1].file).toBe('file2.js');
		});
	});
	
	describe('issue format', () => {
		test('should return JSON-serializable issues', async () => {
			const files = [{
				path: 'test.js',
				text: 'const unused = 42;'
			}];
			
			const issues = await analyzeFiles(files);
			
			expect(issues.length).toBeGreaterThan(0);
			
			// Test JSON serialization
			const json = JSON.stringify(issues);
			const parsed = JSON.parse(json);
			
			expect(parsed).toEqual(issues);
			expect(parsed[0]).toHaveProperty('file');
			expect(parsed[0]).toHaveProperty('line');
			expect(parsed[0]).toHaveProperty('column');
			expect(parsed[0]).toHaveProperty('ruleId');
			expect(parsed[0]).toHaveProperty('message');
			expect(parsed[0]).toHaveProperty('severity');
		});
	});
	
	describe('error handling', () => {
		test('should handle parse errors gracefully', async () => {
			const files = [{
				path: 'invalid.js',
				text: 'const x = ;' // Syntax error
			}];
			
			const issues = await analyzeFiles(files);
			
			// Should not throw, may return empty or partial results
			expect(Array.isArray(issues)).toBe(true);
		});
	});
});
