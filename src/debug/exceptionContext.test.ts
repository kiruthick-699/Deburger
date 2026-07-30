import {
	gatherExceptionContext,
	formatRuntimeContext,
	toSyntheticIssue,
	MinimalDebugSession,
	RuntimeExceptionInfo,
} from './exceptionContext';

function fakeSession(handlers: Record<string, (args?: unknown) => unknown>): MinimalDebugSession {
	return {
		customRequest: async (command: string, args?: unknown) => {
			const handler = handlers[command];
			if (!handler) {
				throw new Error(`unsupported command: ${command}`);
			}
			return handler(args);
		},
	};
}

describe('gatherExceptionContext', () => {
	test('returns undefined when the debug adapter does not support exceptionInfo', async () => {
		const session = fakeSession({});
		const info = await gatherExceptionContext(session, 1);
		expect(info).toBeUndefined();
	});

	test('captures message from exceptionInfo.details', async () => {
		const session = fakeSession({
			exceptionInfo: () => ({ details: { message: 'Cannot read property of undefined', typeName: 'TypeError' } }),
			stackTrace: () => ({ stackFrames: [] }),
		});

		const info = await gatherExceptionContext(session, 1);
		expect(info?.message).toBe('Cannot read property of undefined');
		expect(info?.typeName).toBe('TypeError');
	});

	test('falls back to exceptionInfo.description when details.message is missing', async () => {
		const session = fakeSession({
			exceptionInfo: () => ({ description: 'Uncaught exception' }),
			stackTrace: () => ({ stackFrames: [] }),
		});

		const info = await gatherExceptionContext(session, 1);
		expect(info?.message).toBe('Uncaught exception');
	});

	test('captures stack frames and top-frame location', async () => {
		const session = fakeSession({
			exceptionInfo: () => ({ details: { message: 'boom' } }),
			stackTrace: () => ({
				stackFrames: [
					{ id: 10, name: 'processOrder', source: { path: '/app/orders.js' }, line: 42 },
					{ id: 11, name: 'main', source: { path: '/app/index.js' }, line: 5 },
				],
			}),
			scopes: () => ({ scopes: [] }),
		});

		const info = await gatherExceptionContext(session, 1);
		expect(info?.file).toBe('/app/orders.js');
		expect(info?.line).toBe(42);
		expect(info?.stackFrames).toHaveLength(2);
		expect(info?.stackFrames[0]).toEqual({ name: 'processOrder', file: '/app/orders.js', line: 42 });
	});

	test('captures variables from non-expensive scopes and skips expensive ones', async () => {
		const session = fakeSession({
			exceptionInfo: () => ({ details: { message: 'boom' } }),
			stackTrace: () => ({
				stackFrames: [{ id: 10, name: 'processOrder', source: { path: '/app/orders.js' }, line: 42 }],
			}),
			scopes: () => ({
				scopes: [
					{ name: 'Locals', variablesReference: 100, expensive: false },
					{ name: 'Globals', variablesReference: 200, expensive: true },
				],
			}),
			variables: (args: unknown) => {
				const ref = (args as { variablesReference: number }).variablesReference;
				if (ref === 100) {
					return { variables: [{ name: 'order', value: '{ id: 1 }' }] };
				}
				throw new Error('should not fetch expensive scope');
			},
		});

		const info = await gatherExceptionContext(session, 1);
		expect(info?.variables).toEqual([{ scope: 'Locals', name: 'order', value: '{ id: 1 }' }]);
	});

	test('truncates long variable values', async () => {
		const longValue = 'x'.repeat(500);
		const session = fakeSession({
			exceptionInfo: () => ({ details: { message: 'boom' } }),
			stackTrace: () => ({
				stackFrames: [{ id: 1, name: 'fn', line: 1 }],
			}),
			scopes: () => ({ scopes: [{ name: 'Locals', variablesReference: 1 }] }),
			variables: () => ({ variables: [{ name: 'huge', value: longValue }] }),
		});

		const info = await gatherExceptionContext(session, 1);
		expect(info?.variables[0].value.length).toBeLessThan(longValue.length);
		expect(info?.variables[0].value.endsWith('…')).toBe(true);
	});

	test('degrades gracefully when stackTrace request fails', async () => {
		const session = fakeSession({
			exceptionInfo: () => ({ details: { message: 'boom' } }),
		});

		const info = await gatherExceptionContext(session, 1);
		expect(info?.stackFrames).toEqual([]);
		expect(info?.variables).toEqual([]);
	});
});

describe('formatRuntimeContext', () => {
	test('includes stack trace and variable sections', () => {
		const info: RuntimeExceptionInfo = {
			message: 'boom',
			stackFrames: [{ name: 'fn', file: 'a.js', line: 3 }],
			variables: [{ scope: 'Locals', name: 'x', value: '1' }],
		};

		const text = formatRuntimeContext(info);
		expect(text).toContain('fn (a.js:3)');
		expect(text).toContain('[Locals] x = 1');
	});

	test('handles empty stack/variables without throwing', () => {
		const info: RuntimeExceptionInfo = { message: 'boom', stackFrames: [], variables: [] };
		const text = formatRuntimeContext(info);
		expect(text).toContain('no stack trace available');
		expect(text).toContain('no variable state captured');
	});
});

describe('toSyntheticIssue', () => {
	test('maps runtime info onto an AnalysisIssue shape', () => {
		const info: RuntimeExceptionInfo = {
			message: 'Cannot read property of undefined',
			typeName: 'TypeError',
			file: '/app/orders.js',
			line: 42,
			stackFrames: [],
			variables: [],
		};

		const issue = toSyntheticIssue(info);
		expect(issue).toEqual({
			file: '/app/orders.js',
			line: 42,
			column: 0,
			ruleId: 'runtime-exception',
			message: 'TypeError: Cannot read property of undefined',
			severity: 'error',
		});
	});

	test('defaults file/line when not available', () => {
		const info: RuntimeExceptionInfo = { message: 'boom', stackFrames: [], variables: [] };
		const issue = toSyntheticIssue(info);
		expect(issue.file).toBe('unknown');
		expect(issue.line).toBe(1);
		expect(issue.message).toBe('boom');
	});
});
