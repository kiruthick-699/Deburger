import { File } from '@babel/types';

export type Severity = 'error' | 'warning' | 'info';

export interface AnalysisIssue {
	file: string;
	line: number;
	column: number;
	ruleId: string;
	message: string;
	severity: Severity;
}

export interface RuleConfig {
	maxFunctionLines?: number;
	maxNestingDepth?: number;
}

export interface Rule {
	run(ast: File, filePath: string, fileText: string, config: RuleConfig): AnalysisIssue[];
}
