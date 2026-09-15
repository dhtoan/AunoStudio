import { describe, expect, it, vi } from 'vitest';
import {
	MAX_BROWSER_DIAGNOSTICS_PER_SESSION,
	maintainerDiagnosticsAllowed,
	maybeReportBrowserFailure,
	normalizeBrowserFailure,
	resetBrowserDiagnosticsForTests,
	type MaintainerDiagnosticsTransport
} from './diagnostics-report';

function transport() {
	const calls: Array<{ surface: string; operation: string; error_code: string }> = [];
	const sender: MaintainerDiagnosticsTransport = {
		postReport: async (body) => {
			calls.push(body);
		}
	};
	return { calls, sender };
}

describe('normalizeBrowserFailure', () => {
	it('reduces an uncaught error to a code and an app-relative location', () => {
		const failure = normalizeBrowserFailure(
			'error',
			'TypeError',
			"Cannot read properties of undefined (reading 'text')",
			'TypeError: Cannot read properties of undefined\n    at save (https://app.example/_app/immutable/nodes/9.Abc.js:120:8)\n    at HTMLButtonElement.<anonymous>',
			'/publications'
		);
		expect(failure?.code).toBe('browser_uncaught');
		expect(failure?.location).toBe('/_app/immutable/nodes/9.Abc.js:120');
	});

	it('never forwards free-form message text', () => {
		const failure = normalizeBrowserFailure(
			'error',
			'Error',
			'secret bearer abc123 and user content here',
			undefined,
			'/publications'
		);
		expect(failure).toBeDefined();
		expect(JSON.stringify(failure)).not.toContain('bearer');
		expect(JSON.stringify(failure)).not.toContain('user content');
	});

	it('codes unhandled rejections separately', () => {
		const failure = normalizeBrowserFailure(
			'unhandledrejection',
			'Error',
			'failed',
			undefined,
			'/publications'
		);
		expect(failure?.code).toBe('browser_unhandled_rejection');
	});

	it('skips chunk-load failures handled by deployment recovery', () => {
		expect(
			normalizeBrowserFailure(
				'unhandledrejection',
				'Error',
				'Failed to fetch dynamically imported module: https://app.example/_app/immutable/nodes/9.js',
				undefined,
				'/publications'
			)
		).toBeNull();
	});

	it('sanitizes route templates instead of sending concrete user paths', () => {
		const failure = normalizeBrowserFailure('error', 'Error', 'boom', undefined, '/u/some-user');
		expect(failure?.location).toBe('/u/some-user');
		const templated = normalizeBrowserFailure(
			'error',
			'Error',
			'boom',
			undefined,
			'/video-editor/[id]'
		);
		expect(templated?.location).toBe('/video-editor/-id-');
	});
});

describe('maintainerDiagnosticsAllowed', () => {
	it('lets the instance switch decide by default', () => {
		expect(
			maintainerDiagnosticsAllowed({
				doNotTrack: null,
				globalPrivacyControl: false,
				configEnabled: true
			})
		).toBe(true);
		expect(
			maintainerDiagnosticsAllowed({
				doNotTrack: null,
				globalPrivacyControl: false,
				configEnabled: false
			})
		).toBe(false);
	});

	it('forces off on browser privacy signals regardless of the switch', () => {
		for (const gate of [
			{ doNotTrack: '1', globalPrivacyControl: false, configEnabled: true },
			{ doNotTrack: 'yes', globalPrivacyControl: false, configEnabled: true },
			{ doNotTrack: null, globalPrivacyControl: true, configEnabled: true }
		] as const) {
			expect(maintainerDiagnosticsAllowed(gate)).toBe(false);
		}
	});
});

describe('maybeReportBrowserFailure', () => {
	it('sends once per code and location, then stays silent', async () => {
		resetBrowserDiagnosticsForTests();
		const { calls, sender } = transport();
		const failure = { code: 'browser_uncaught' as const, location: '/_app/nodes/9.js:3' };
		expect(await maybeReportBrowserFailure(failure, sender)).toBe(true);
		expect(await maybeReportBrowserFailure(failure, sender)).toBe(false);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toEqual({
			surface: 'browser',
			operation: '/_app/nodes/9.js:3',
			error_code: 'browser_uncaught'
		});
	});

	it('caps the session instead of flooding on loops', async () => {
		resetBrowserDiagnosticsForTests();
		const { calls, sender } = transport();
		for (let i = 0; i < MAX_BROWSER_DIAGNOSTICS_PER_SESSION + 5; i++) {
			await maybeReportBrowserFailure(
				{ code: 'browser_uncaught', location: `/loop/${i}.js:1` },
				sender
			);
		}
		expect(calls).toHaveLength(MAX_BROWSER_DIAGNOSTICS_PER_SESSION);
	});

	it('treats transport failures as silent drops', async () => {
		resetBrowserDiagnosticsForTests();
		const failing: MaintainerDiagnosticsTransport = {
			postReport: async () => {
				throw new Error('offline');
			}
		};
		const spy = vi.spyOn(failing, 'postReport');
		expect(
			await maybeReportBrowserFailure({ code: 'browser_uncaught', location: '/x.js:1' }, failing)
		).toBe(false);
		expect(spy).toHaveBeenCalledTimes(1);
	});
});
