import { AnalysisIssue } from '../core/types';

/**
 * Minimal shape of a DebugSession we need — just enough to send DAP requests.
 * Kept separate from vscode.DebugSession so this module has no dependency on
 * the 'vscode' module and can be unit tested with a plain fake object.
 */
export interface MinimalDebugSession {
	customRequest(command: string, args?: unknown): Thenable<unknown>;
}

export interface RuntimeExceptionInfo {
	message: string;
	typeName?: string;
	file?: string;
	line?: number;
	stackFrames: { name: string; file?: string; line?: number }[];
	variables: { scope: string; name: string; value: string }[];
}

interface DapStackFrame {
	id: number;
	name: string;
	source?: { path?: string; name?: string };
	line?: number;
}

interface DapScope {
	name: string;
	variablesReference: number;
	expensive?: boolean;
}

interface DapVariable {
	name: string;
	value: string;
}

const MAX_STACK_FRAMES = 5;
const MAX_VARIABLES_PER_SCOPE = 15;
const MAX_VALUE_LENGTH = 200;

function truncate(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Uses standard Debug Adapter Protocol requests (exceptionInfo, stackTrace,
 * scopes, variables) to capture what the debugger already knows at the moment
 * of an unhandled exception: the exception itself, the call stack, and local
 * variable state. Returns undefined if the debug adapter doesn't support
 * exceptionInfo (not every DAP implementation does).
 */
export async function gatherExceptionContext(
	session: MinimalDebugSession,
	threadId: number
): Promise<RuntimeExceptionInfo | undefined> {
	let exceptionInfo: { description?: string; details?: { message?: string; typeName?: string } } | undefined;
	try {
		exceptionInfo = (await session.customRequest('exceptionInfo', { threadId })) as typeof exceptionInfo;
	} catch {
		return undefined;
	}

	let rawFrames: DapStackFrame[] = [];
	try {
		const stackTraceBody = (await session.customRequest('stackTrace', {
			threadId,
			startFrame: 0,
			levels: MAX_STACK_FRAMES,
		})) as { stackFrames?: DapStackFrame[] };
		rawFrames = (stackTraceBody?.stackFrames ?? []).slice(0, MAX_STACK_FRAMES);
	} catch {
		rawFrames = [];
	}

	const stackFrames = rawFrames.map(f => ({
		name: f.name,
		file: f.source?.path,
		line: f.line,
	}));

	const variables: RuntimeExceptionInfo['variables'] = [];
	const topFrame = rawFrames[0];
	if (topFrame) {
		try {
			const scopesBody = (await session.customRequest('scopes', { frameId: topFrame.id })) as {
				scopes?: DapScope[];
			};
			for (const scope of scopesBody?.scopes ?? []) {
				if (scope.expensive) {
					continue; // skip expensive scopes (e.g. globals) to keep this fast and small
				}
				try {
					const variablesBody = (await session.customRequest('variables', {
						variablesReference: scope.variablesReference,
					})) as { variables?: DapVariable[] };
					for (const v of (variablesBody?.variables ?? []).slice(0, MAX_VARIABLES_PER_SCOPE)) {
						variables.push({
							scope: scope.name,
							name: v.name,
							value: truncate(String(v.value), MAX_VALUE_LENGTH),
						});
					}
				} catch {
					// skip scopes we can't read
				}
			}
		} catch {
			// no scopes available for this frame
		}
	}

	const details = exceptionInfo?.details ?? {};
	return {
		message: details.message || exceptionInfo?.description || 'Unknown exception',
		typeName: details.typeName,
		file: topFrame?.source?.path,
		line: topFrame?.line,
		stackFrames,
		variables,
	};
}

/**
 * Formats captured runtime state into plain text for the LLM context slot —
 * the same slot the static analysis pipeline fills with project context.
 */
export function formatRuntimeContext(info: RuntimeExceptionInfo): string {
	const stackLines =
		info.stackFrames.map(f => `- ${f.name}${f.file ? ` (${f.file}:${f.line})` : ''}`).join('\n') ||
		'(no stack trace available)';

	const variableLines =
		info.variables.map(v => `- [${v.scope}] ${v.name} = ${v.value}`).join('\n') ||
		'(no variable state captured)';

	return [
		'Runtime exception captured live at the point of failure (via the debugger).',
		'',
		'Stack trace:',
		stackLines,
		'',
		'Local variable state at the point of failure:',
		variableLines,
	].join('\n');
}

/**
 * Represents the exception as an AnalysisIssue so it flows through the same
 * sidebar/diagnostics/explain-with-AI UI as static analysis findings.
 */
export function toSyntheticIssue(info: RuntimeExceptionInfo): AnalysisIssue {
	return {
		file: info.file || 'unknown',
		line: info.line || 1,
		column: 0,
		ruleId: 'runtime-exception',
		message: info.typeName ? `${info.typeName}: ${info.message}` : info.message,
		severity: 'error',
	};
}
