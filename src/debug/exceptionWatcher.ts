import * as vscode from 'vscode';
import { AnalysisIssue } from '../core/types';
import { gatherExceptionContext, formatRuntimeContext, toSyntheticIssue } from './exceptionContext';

export type ExceptionHandler = (
	session: vscode.DebugSession,
	issue: AnalysisIssue,
	contextSummary: string
) => void;

interface StoppedEventMessage {
	type?: string;
	event?: string;
	body?: { reason?: string; threadId?: number };
}

/**
 * Watches every debug session (any debug type — Node, Python, etc.) for a
 * 'stopped' DAP event caused by an uncaught exception, gathers the stack
 * trace and local variable state via standard DAP requests, and reports it
 * as an AnalysisIssue + context string — the same shape the static analysis
 * pipeline produces, so it reuses the existing explain-with-AI UI unchanged.
 */
export function createExceptionWatcher(onException: ExceptionHandler): vscode.Disposable {
	return vscode.debug.registerDebugAdapterTrackerFactory('*', {
		createDebugAdapterTracker(session: vscode.DebugSession): vscode.DebugAdapterTracker {
			return {
				onDidSendMessage: message => {
					void handleMessage(session, message, onException);
				},
			};
		},
	});
}

async function handleMessage(
	session: vscode.DebugSession,
	message: unknown,
	onException: ExceptionHandler
): Promise<void> {
	const event = message as StoppedEventMessage;
	if (event?.type !== 'event' || event.event !== 'stopped' || event.body?.reason !== 'exception') {
		return;
	}

	const threadId = event.body.threadId;
	if (threadId === undefined) {
		return;
	}

	try {
		const info = await gatherExceptionContext(session, threadId);
		if (!info) {
			return; // debug adapter doesn't support exceptionInfo
		}
		onException(session, toSyntheticIssue(info), formatRuntimeContext(info));
	} catch (error) {
		console.warn('Error gathering runtime exception context:', error);
	}
}
