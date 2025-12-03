import * as fs from 'fs/promises';
import * as path from 'path';

export interface ScannedFile {
	path: string;
	text: string;
}

/**
 * Scans a project directory for JavaScript and TypeScript files
 * @param rootPath - The root directory to scan
 * @returns Array of scanned files with paths and contents
 */
export async function scanProject(rootPath: string): Promise<ScannedFile[]> {
	const results: ScannedFile[] = [];
	const targetExtensions = ['.js', '.ts', '.jsx', '.tsx'];
	
	// Load .gitignore patterns if present
	const gitignorePatterns = await loadGitignorePatterns(rootPath);
	
	await scanDirectory(rootPath, rootPath, targetExtensions, gitignorePatterns, results);
	
	return results;
}

/**
 * Recursively scans a directory for matching files
 */
async function scanDirectory(
	rootPath: string,
	currentPath: string,
	targetExtensions: string[],
	gitignorePatterns: string[],
	results: ScannedFile[]
): Promise<void> {
	let entries;
	
	try {
		entries = await fs.readdir(currentPath, { withFileTypes: true });
	} catch (error) {
		// Skip directories we can't read (permissions, etc.)
		console.warn(`Unable to read directory: ${currentPath}`, error);
		return;
	}
	
	for (const entry of entries) {
		const fullPath = path.join(currentPath, entry.name);
		const relativePath = path.relative(rootPath, fullPath);
		
		// Skip node_modules and common build/cache directories
		if (shouldIgnore(entry.name, relativePath, gitignorePatterns)) {
			continue;
		}
		
		if (entry.isDirectory()) {
			// Recursively scan subdirectories
			await scanDirectory(rootPath, fullPath, targetExtensions, gitignorePatterns, results);
		} else if (entry.isFile()) {
			const ext = path.extname(entry.name);
			
			if (targetExtensions.includes(ext)) {
				try {
					const content = await fs.readFile(fullPath, 'utf-8');
					results.push({
						path: fullPath,
						text: content
					});
				} catch (error) {
					console.warn(`Unable to read file: ${fullPath}`, error);
				}
			}
		}
	}
}

/**
 * Determines if a file or directory should be ignored
 */
function shouldIgnore(name: string, relativePath: string, gitignorePatterns: string[]): boolean {
	// Always ignore these directories
	const alwaysIgnore = ['node_modules', '.git', 'dist', 'out', 'build', 'coverage', '.vscode-test'];
	
	if (alwaysIgnore.includes(name)) {
		return true;
	}
	
	// Check gitignore patterns
	for (const pattern of gitignorePatterns) {
		if (matchesPattern(relativePath, pattern) || matchesPattern(name, pattern)) {
			return true;
		}
	}
	
	return false;
}

/**
 * Loads and parses .gitignore file if present
 */
async function loadGitignorePatterns(rootPath: string): Promise<string[]> {
	const gitignorePath = path.join(rootPath, '.gitignore');
	
	try {
		const content = await fs.readFile(gitignorePath, 'utf-8');
		return content
			.split('\n')
			.map(line => line.trim())
			.filter(line => line && !line.startsWith('#')) // Remove comments and empty lines
			.map(line => line.replace(/\/$/, '')); // Remove trailing slashes
	} catch {
		// .gitignore doesn't exist or can't be read
		return [];
	}
}

/**
 * Simple pattern matching for .gitignore-style patterns
 * Supports basic glob patterns like *.log, temp/*, etc.
 */
function matchesPattern(filePath: string, pattern: string): boolean {
	// Exact match
	if (filePath === pattern) {
		return true;
	}
	
	// Pattern ends with wildcard (e.g., "temp/*")
	if (pattern.endsWith('/*')) {
		const dir = pattern.slice(0, -2);
		return filePath.startsWith(dir + '/') || filePath === dir;
	}
	
	// Pattern starts with wildcard (e.g., "*.log")
	if (pattern.startsWith('*.')) {
		const ext = pattern.slice(1);
		return filePath.endsWith(ext);
	}
	
	// Pattern contains the path segment
	if (pattern.includes('/')) {
		return filePath.includes(pattern);
	}
	
	// Match directory or file name anywhere in path
	const pathParts = filePath.split(path.sep);
	return pathParts.includes(pattern);
}
