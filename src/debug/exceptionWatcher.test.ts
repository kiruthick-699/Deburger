import * as vscode from 'vscode';
import { createExceptionWatcher } from './exceptionWatcher';

describe('createExceptionWatcher', () => {
	beforeEach(() => {
		(vscode.debug.registerDebugAdapterTrackerFactory as jest.Mock).mockClear();
	});

	test('registers a tracker factory for all debug types', () => {
		const onException = jest.fn();
		createExceptionWatcher(onException);
		expect(vscode.debug.registerDebugAdapterTrackerFactory).toHaveBeenCalledWith(
			'*',
			expect.objectContaining({ createDebugAdapterTracker: expect.any(Function) })
		);
	});

	test('ignores non-exception stop events', async () => {
		const onException = jest.fn();
		createExceptionWatcher(onException);
		const [, factory] = (vscode.debug.registerDebugAdapterTrackerFactory as jest.Mock).mock.calls[0];

		const session = { customRequest: jest.fn() };
		const tracker = factory.createDebugAdapterTracker(session);

		tracker.onDidSendMessage({ type: 'event', event: 'stopped', body: { reason: 'breakpoint', threadId: 1 } });
		// flush microtasks
		await Promise.resolve();
		await Promise.resolve();

		expect(onException).not.toHaveBeenCalled();
		expect(session.customRequest).not.toHaveBeenCalled();
	});

	test('reports a synthetic issue and context on an exception stop', async () => {
		const onException = jest.fn();
		createExceptionWatcher(onException);
		const [, factory] = (vscode.debug.registerDebugAdapterTrackerFactory as jest.Mock).mock.calls[0];

		const session = {
			customRequest: jest.fn((command: string) => {
				switch (command) {
					case 'exceptionInfo':
						return Promise.resolve({ details: { message: 'boom', typeName: 'Error' } });
					case 'stackTrace':
						return Promise.resolve({
							stackFrames: [{ id: 1, name: 'fn', source: { path: '/a.js' }, line: 10 }],
						});
					case 'scopes':
						return Promise.resolve({ scopes: [] });
					default:
						return Promise.reject(new Error(`unexpected: ${command}`));
				}
			}),
		};
		const tracker = factory.createDebugAdapterTracker(session);

		tracker.onDidSendMessage({ type: 'event', event: 'stopped', body: { reason: 'exception', threadId: 7 } });
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(onException).toHaveBeenCalledTimes(1);
		const [, issue, contextSummary] = onException.mock.calls[0];
		expect(issue).toMatchObject({
			file: '/a.js',
			line: 10,
			ruleId: 'runtime-exception',
			message: 'Error: boom',
			severity: 'error',
		});
		expect(contextSummary).toContain('fn (/a.js:10)');
	});

	test('does not throw or call onException when the debug adapter lacks exceptionInfo support', async () => {
		const onException = jest.fn();
		createExceptionWatcher(onException);
		const [, factory] = (vscode.debug.registerDebugAdapterTrackerFactory as jest.Mock).mock.calls[0];

		const session = { customRequest: jest.fn(() => Promise.reject(new Error('not supported'))) };
		const tracker = factory.createDebugAdapterTracker(session);

		expect(() =>
			tracker.onDidSendMessage({ type: 'event', event: 'stopped', body: { reason: 'exception', threadId: 1 } })
		).not.toThrow();

		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();

		expect(onException).not.toHaveBeenCalled();
	});
});
