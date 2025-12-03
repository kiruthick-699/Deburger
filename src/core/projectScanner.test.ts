import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { scanProject } from './projectScanner';

describe('projectScanner', () => {
	let tempDir: string;

	beforeEach(async () => {
		// Create a unique temp directory for each test
		tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scanner-test-'));
	});

	afterEach(async () => {
		// Clean up temp directory after each test
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	test('should find all JS/TS files in a directory', async () => {
		// Create test files
		await fs.writeFile(path.join(tempDir, 'file1.js'), 'console.log("file1");');
		await fs.writeFile(path.join(tempDir, 'file2.ts'), 'const x: number = 42;');
		await fs.writeFile(path.join(tempDir, 'file3.jsx'), 'export const Component = () => <div />;');

		const results = await scanProject(tempDir);

		expect(results).toHaveLength(3);
		expect(results.map(f => path.basename(f.path)).sort()).toEqual(['file1.js', 'file2.ts', 'file3.jsx'].sort());
	});

	test('should return file contents correctly', async () => {
		const content1 = 'console.log("Hello, World!");';
		const content2 = 'const greeting: string = "TypeScript";';

		await fs.writeFile(path.join(tempDir, 'test1.js'), content1);
		await fs.writeFile(path.join(tempDir, 'test2.ts'), content2);

		const results = await scanProject(tempDir);

		expect(results).toHaveLength(2);
		
		const file1 = results.find(f => f.path.endsWith('test1.js'));
		const file2 = results.find(f => f.path.endsWith('test2.ts'));

		expect(file1?.text).toBe(content1);
		expect(file2?.text).toBe(content2);
	});

	test('should ignore node_modules directory', async () => {
		// Create files in root
		await fs.writeFile(path.join(tempDir, 'app.js'), 'console.log("app");');

		// Create node_modules directory with files
		const nodeModulesDir = path.join(tempDir, 'node_modules');
		await fs.mkdir(nodeModulesDir);
		await fs.writeFile(path.join(nodeModulesDir, 'package.js'), 'module.exports = {};');

		const results = await scanProject(tempDir);

		expect(results).toHaveLength(1);
		expect(results[0].path).toContain('app.js');
		expect(results[0].path).not.toContain('node_modules');
	});

	test('should scan nested directories', async () => {
		// Create nested directory structure
		const srcDir = path.join(tempDir, 'src');
		const utilsDir = path.join(srcDir, 'utils');

		await fs.mkdir(srcDir);
		await fs.mkdir(utilsDir);

		await fs.writeFile(path.join(tempDir, 'index.js'), 'root file');
		await fs.writeFile(path.join(srcDir, 'main.ts'), 'main file');
		await fs.writeFile(path.join(utilsDir, 'helper.js'), 'helper file');

		const results = await scanProject(tempDir);

		expect(results).toHaveLength(3);
		
		const basenames = results.map(f => path.basename(f.path)).sort();
		expect(basenames).toEqual(['helper.js', 'index.js', 'main.ts']);
	});

	test('should ignore files matching .gitignore patterns', async () => {
		// Create .gitignore
		await fs.writeFile(path.join(tempDir, '.gitignore'), '*.log\ntemp/\n');

		// Create files
		await fs.writeFile(path.join(tempDir, 'app.js'), 'app');
		await fs.writeFile(path.join(tempDir, 'debug.log.js'), 'should be ignored'); // Note: ends with .js but contains .log

		// Create temp directory
		const tempSubDir = path.join(tempDir, 'temp');
		await fs.mkdir(tempSubDir);
		await fs.writeFile(path.join(tempSubDir, 'temp.js'), 'temp file');

		const results = await scanProject(tempDir);

		// Should only find app.js, not debug.log.js or temp/temp.js
		const basenames = results.map(f => path.basename(f.path));
		expect(basenames).toContain('app.js');
		expect(basenames).not.toContain('temp.js');
	});

	test('should ignore common build directories', async () => {
		// Create build directories
		await fs.mkdir(path.join(tempDir, 'dist'));
		await fs.mkdir(path.join(tempDir, 'out'));
		await fs.mkdir(path.join(tempDir, 'build'));

		// Create files
		await fs.writeFile(path.join(tempDir, 'src.js'), 'source');
		await fs.writeFile(path.join(tempDir, 'dist', 'bundle.js'), 'bundled');
		await fs.writeFile(path.join(tempDir, 'out', 'compiled.js'), 'compiled');
		await fs.writeFile(path.join(tempDir, 'build', 'output.js'), 'output');

		const results = await scanProject(tempDir);

		expect(results).toHaveLength(1);
		expect(results[0].path).toContain('src.js');
	});

	test('should handle empty directory', async () => {
		const results = await scanProject(tempDir);

		expect(results).toHaveLength(0);
	});

	test('should ignore non-JS/TS files', async () => {
		await fs.writeFile(path.join(tempDir, 'readme.md'), '# README');
		await fs.writeFile(path.join(tempDir, 'styles.css'), 'body {}');
		await fs.writeFile(path.join(tempDir, 'data.json'), '{}');
		await fs.writeFile(path.join(tempDir, 'script.js'), 'valid');

		const results = await scanProject(tempDir);

		expect(results).toHaveLength(1);
		expect(results[0].path).toContain('script.js');
	});

	test('should support .tsx files', async () => {
		await fs.writeFile(path.join(tempDir, 'Component.tsx'), 'export const App = () => <div />;');

		const results = await scanProject(tempDir);

		expect(results).toHaveLength(1);
		expect(results[0].path).toContain('Component.tsx');
		expect(results[0].text).toContain('export const App');
	});
});
