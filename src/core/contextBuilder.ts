import * as fs from 'fs/promises';
import * as path from 'path';
import { AnalysisIssue } from './types';

export interface FileSummary {
	path: string;
	brief: string;
}

export interface ProjectContext {
	files: FileSummary[];
	topIssues: AnalysisIssue[];
	dependencies: string[];
}

interface FileInput {
	path: string;
	text: string;
}

/**
 * Builds a concise project context for LLM consumption
 * @param files - Array of files with their content
 * @param issues - Array of analysis issues
 * @param projectRoot - Root directory of the project (optional, for finding package.json)
 * @returns Structured context object ready for LLM prompts
 */
export async function buildContext(
	files: FileInput[],
	issues: AnalysisIssue[],
	projectRoot?: string
): Promise<ProjectContext> {
	// Generate per-file summaries
	const fileSummaries: FileSummary[] = files.map(file => ({
		path: file.path,
		brief: generateFileSummary(file.text, file.path)
	}));
	
	// Get top 5 most important issues
	const topIssues = getTopIssues(issues, 5);
	
	// Extract dependencies from package.json if available
	const dependencies = projectRoot 
		? await extractDependencies(projectRoot)
		: [];
	
	return {
		files: fileSummaries,
		topIssues,
		dependencies
	};
}

/**
 * Generates a brief 2-3 sentence summary of a file
 * Uses header comments or first 20 lines as heuristic
 */
function generateFileSummary(fileText: string, filePath: string): string {
	const lines = fileText.split('\n');
	const fileName = path.basename(filePath);
	
	// Try to extract from header comment
	const headerSummary = extractHeaderComment(lines);
	if (headerSummary) {
		return headerSummary;
	}
	
	// Fall back to analyzing first 20 lines
	const preview = lines.slice(0, 20);
	
	// Check for imports/requires - indicates what the file depends on
	const imports = preview.filter(line => 
		line.trim().startsWith('import ') || 
		line.trim().startsWith('require(') ||
		line.trim().startsWith('from ')
	);
	
	// Check for exports - indicates what the file provides
	const exports = preview.filter(line => 
		line.includes('export ') ||
		line.includes('module.exports')
	);
	
	// Check for class/function declarations
	const declarations = preview.filter(line =>
		/^(export\s+)?(async\s+)?function\s+\w+/.test(line.trim()) ||
		/^(export\s+)?class\s+\w+/.test(line.trim()) ||
		/^(export\s+)?const\s+\w+\s*=.*=>/.test(line.trim())
	);
	
	// Generate summary based on content
	let summary = `${fileName}: `;
	
	if (declarations.length > 0) {
		const funcOrClass = declarations[0].includes('class') ? 'class' : 'function';
		summary += `Defines ${funcOrClass}`;
		if (exports.length > 0) {
			summary += ' and exports';
		}
		summary += ' functionality';
	} else if (exports.length > 0) {
		summary += 'Exports module functionality';
	} else if (imports.length > 0) {
		summary += 'Imports and configures dependencies';
	} else {
		summary += 'Contains code and logic';
	}
	
	// Add import context if significant
	if (imports.length > 2) {
		summary += `. Uses ${imports.length} external dependencies`;
	}
	
	summary += '.';
	
	return summary;
}

/**
 * Extracts summary from file header comments
 * Looks for JSDoc-style comments or initial comment blocks
 */
function extractHeaderComment(lines: string[]): string | null {
	let inComment = false;
	const commentLines: string[] = [];
	
	for (let i = 0; i < Math.min(15, lines.length); i++) {
		const line = lines[i].trim();
		
		// Skip empty lines at start
		if (!inComment && !line) {
			continue;
		}
		
		// Start of block comment
		if (line.startsWith('/**') || line.startsWith('/*')) {
			inComment = true;
			const content = line.replace(/^\/\*+\s*/, '').replace(/\*+\/$/, '').trim();
			if (content) {
				commentLines.push(content);
			}
			continue;
		}
		
		// Inside block comment
		if (inComment) {
			if (line.includes('*/')) {
				const content = line.replace(/\*+\/.*$/, '').replace(/^\*\s*/, '').trim();
				if (content && !content.startsWith('@')) {
					commentLines.push(content);
				}
				break;
			}
			
			const content = line.replace(/^\*\s*/, '').trim();
			if (content && !content.startsWith('@')) {
				commentLines.push(content);
			}
		}
		
		// Single-line comment at start
		if (!inComment && line.startsWith('//')) {
			const content = line.replace(/^\/\/\s*/, '').trim();
			if (content) {
				commentLines.push(content);
			}
		}
		
		// Stop if we hit code
		if (!inComment && !line.startsWith('//') && line) {
			break;
		}
	}
	
	if (commentLines.length > 0) {
		// Take first 2-3 sentences
		const text = commentLines.join(' ');
		const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
		return sentences.slice(0, 3).join('. ') + '.';
	}
	
	return null;
}

/**
 * Gets the top N most important issues
 * Prioritizes by severity: error > warning > info
 */
function getTopIssues(issues: AnalysisIssue[], count: number): AnalysisIssue[] {
	const severityOrder = { error: 0, warning: 1, info: 2 };
	
	return issues
		.sort((a, b) => {
			// Sort by severity first
			const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
			if (severityDiff !== 0) {
				return severityDiff;
			}
			
			// Then by file path for consistency
			return a.file.localeCompare(b.file);
		})
		.slice(0, count);
}

/**
 * Extracts dependency list from package.json
 */
async function extractDependencies(projectRoot: string): Promise<string[]> {
	try {
		const packageJsonPath = path.join(projectRoot, 'package.json');
		const content = await fs.readFile(packageJsonPath, 'utf-8');
		const packageJson = JSON.parse(content);
		
		const deps = new Set<string>();
		
		// Add runtime dependencies
		if (packageJson.dependencies) {
			Object.keys(packageJson.dependencies).forEach(dep => deps.add(dep));
		}
		
		// Add dev dependencies (but mark them differently)
		if (packageJson.devDependencies) {
			Object.keys(packageJson.devDependencies)
				.filter(dep => !deps.has(dep)) // Avoid duplicates
				.forEach(dep => deps.add(dep));
		}
		
		// Return sorted list, limit to important ones (exclude common tooling)
		const excluded = new Set(['typescript', 'eslint', 'jest', 'prettier', '@types/']);
		
		return Array.from(deps)
			.filter(dep => !excluded.has(dep) && !dep.startsWith('@types/'))
			.sort()
			.slice(0, 15); // Limit to top 15 to save tokens
	} catch {
		return [];
	}
}

/**
 * Truncates text intelligently to fit within token budget
 * Preserves important code structures like imports and function signatures
 * 
 * @param text - Text to truncate
 * @param maxTokens - Maximum number of tokens (approximate, using char count / 4 as heuristic)
 * @returns Truncated text
 */
export function trimForTokens(text: string, maxTokens: number): string {
	// Rough heuristic: 1 token ≈ 4 characters for code
	const maxChars = maxTokens * 4;
	
	if (text.length <= maxChars) {
		return text;
	}
	
	const lines = text.split('\n');
	
	// Extract important parts
	const imports: string[] = [];
	const typeDeclarations: string[] = [];
	const functionSignatures: string[] = [];
	const exports: string[] = [];
	const comments: string[] = [];
	
	let inBlockComment = false;
	let inFunction = false;
	let braceDepth = 0;
	
	for (const line of lines) {
		const trimmed = line.trim();
		
		// Track block comments
		if (trimmed.startsWith('/*')) {
			inBlockComment = true;
		}
		if (trimmed.includes('*/')) {
			inBlockComment = false;
		}
		
		// Collect important comment lines
		if ((trimmed.startsWith('//') || inBlockComment) && comments.length < 3) {
			comments.push(line);
			continue;
		}
		
		// Collect imports
		if (trimmed.startsWith('import ') || trimmed.startsWith('require(')) {
			imports.push(line);
			continue;
		}
		
		// Collect type/interface declarations
		if (trimmed.startsWith('export interface ') || 
			trimmed.startsWith('export type ') ||
			trimmed.startsWith('interface ') ||
			trimmed.startsWith('type ')) {
			typeDeclarations.push(line);
			continue;
		}
		
		// Collect function signatures
		if (trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/) ||
			trimmed.match(/^(export\s+)?const\s+\w+\s*=.*=>/)) {
			functionSignatures.push(line);
			inFunction = true;
			braceDepth = 0;
			continue;
		}
		
		// Track function body to find where it ends
		if (inFunction) {
			braceDepth += (line.match(/{/g) || []).length;
			braceDepth -= (line.match(/}/g) || []).length;
			
			if (braceDepth === 0) {
				inFunction = false;
			}
		}
		
		// Collect exports
		if (trimmed.startsWith('export ') && exports.length < 5) {
			exports.push(line);
		}
	}
	
	// Build truncated version with most important parts
	const parts: string[] = [];
	
	if (comments.length > 0) {
		parts.push(comments.join('\n'));
	}
	
	if (imports.length > 0) {
		parts.push(imports.slice(0, 10).join('\n')); // Limit imports
		if (imports.length > 10) {
			parts.push(`// ... and ${imports.length - 10} more imports`);
		}
	}
	
	if (typeDeclarations.length > 0) {
		parts.push('');
		parts.push(typeDeclarations.slice(0, 5).join('\n')); // Limit type declarations
	}
	
	if (functionSignatures.length > 0) {
		parts.push('');
		parts.push(functionSignatures.slice(0, 8).join('\n')); // Limit function signatures
		if (functionSignatures.length > 8) {
			parts.push(`// ... and ${functionSignatures.length - 8} more functions`);
		}
	}
	
	const result = parts.join('\n');
	
	// If still too long, hard truncate with ellipsis
	if (result.length > maxChars) {
		return result.substring(0, maxChars - 20) + '\n\n// ... truncated ...';
	}
	
	return result;
}
