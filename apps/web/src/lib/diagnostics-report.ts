import { page } from '$app/state';
import { client } from '$lib/api/client';

export type BrowserFailureKind = 'error' | 'unhandledrejection';

export interface NormalizedBrowserFailure {
	code: 'browser_uncaught' | 'browser_unhandled_rejection';
	location: string;
}

export interface BrowserDiagnosticsGate {
	doNotTrack: string | null | undefined;
	globalPrivacyControl: boolean | undefined;
	configEnabled: boolean;
}

export interface MaintainerDiagnosticsTransport {
	postReport(body: {
		surface: 'browser';
		operation: string;
		error_code: NormalizedBrowserFailure['code'];
	}): Promise<void>;
}

export const MAX_BROWSER_DIAGNOSTICS_PER_SESSION = 10;

// Chunk-load failures are deployment skew with their own bounded recovery;
// they must not become maintainer bug reports.
const CHUNK_LOAD_SIGNALS = [
	'Failed to fetch dynamically imported module',
	'Importing a module script failed',
	'Loading chunk',
	'Loading CSS chunk'
];

// normalizeBrowserFailure reduces an uncaught failure to a code and a
// location. Free-form messages never leave the browser: authored content,
// URLs, and tokens can hide inside error text, so only the normalized code
// and an app-relative location are reported.
export function normalizeBrowserFailure(
	kind: BrowserFailureKind,
	name: string,
	message: string,
	stack: string | undefined,
	routePath: string
): NormalizedBrowserFailure | null {
	const text = `${name} ${message}`;
	if (CHUNK_LOAD_SIGNALS.some((signal) => text.includes(signal))) return null;
	const location = firstPartyLocation(stack) ?? safeOperation(routePath);
	if (!location) return null;
	return {
		code: kind === 'unhandledrejection' ? 'browser_unhandled_rejection' : 'browser_uncaught',
		location
	};
}

// maintainerDiagnosticsAllowed is the browser-side reporting gate. Browser
// privacy signals always win: Do Not Track or Global Privacy Control forces
// the channel off regardless of the instance switch.
export function maintainerDiagnosticsAllowed(gate: BrowserDiagnosticsGate): boolean {
	if (gate.doNotTrack === '1' || gate.doNotTrack === 'yes') return false;
	if (gate.globalPrivacyControl === true) return false;
	return gate.configEnabled === true;
}

const reportedKeys = new Set<string>();

export function resetBrowserDiagnosticsForTests() {
	reportedKeys.clear();
}

// maybeReportBrowserFailure sends one normalized failure per session key
// (code + location) with a small session cap, so a render loop cannot flood
// the instance. A send is attempted at most once per key; transport failures
// stay silent and never surface in the UI.
export async function maybeReportBrowserFailure(
	failure: NormalizedBrowserFailure,
	transport: MaintainerDiagnosticsTransport
): Promise<boolean> {
	const key = `${failure.code}|${failure.location}`;
	if (reportedKeys.has(key) || reportedKeys.size >= MAX_BROWSER_DIAGNOSTICS_PER_SESSION) {
		return false;
	}
	reportedKeys.add(key);
	try {
		await transport.postReport({
			surface: 'browser',
			operation: failure.location,
			error_code: failure.code
		});
		return true;
	} catch {
		return false;
	}
}

function firstPartyLocation(stack: string | undefined): string | null {
	if (!stack) return null;
	for (const line of stack.split('\n')) {
		const location = appRelativeLocation(line);
		if (location) return location;
	}
	return null;
}

function appRelativeLocation(line: string): string | null {
	// Capture the script path and an optional :line[:col] suffix. The path
	// match stops before query strings, fragments, and closing parens; the
	// suffix is parsed separately because URL parsers keep :line:col as path.
	const match = /((?:https?:\/\/|\/)[^\s)]*?\.js)((?::\d+){1,2})?/.exec(line);
	if (!match) return null;
	let path = match[1];
	if (/^https?:\/\//.test(path)) {
		try {
			path = new URL(path).pathname;
		} catch {
			return null;
		}
	}
	path = path.split('?')[0].split('#')[0];
	if (!path.startsWith('/')) return null;
	const lineNumber = /:(\d+)/.exec(match[2] ?? '')?.[1];
	const candidate = (lineNumber ? `${path}:${lineNumber}` : path).slice(0, 160);
	return /^[A-Za-z0-9_/.:-]{1,160}$/.test(candidate) ? candidate : null;
}

function safeOperation(routePath: string): string | null {
	// Route templates can contain SvelteKit parameters ([id]); concrete
	// paths can contain user content (usernames, slugs). Neither is safe to
	// send raw, so map everything outside the allowlist to a dash.
	const cleaned = routePath
		.split('?')[0]
		.split('#')[0]
		.replace(/[^A-Za-z0-9_/.:-]/g, '-')
		.slice(0, 160);
	if (!cleaned.startsWith('/') || cleaned === '/') return cleaned === '/' ? '/' : null;
	return cleaned;
}

let configPromise: Promise<boolean> | null = null;

function readPrivacySignals(): Pick<BrowserDiagnosticsGate, 'doNotTrack' | 'globalPrivacyControl'> {
	if (typeof navigator === 'undefined') return { doNotTrack: null, globalPrivacyControl: false };
	return {
		doNotTrack: typeof navigator.doNotTrack === 'string' ? navigator.doNotTrack : null,
		// SAFETY: globalPrivacyControl is a documented optional Navigator field;
		// the assertion only reads it and treats every non-true value as absent.
		globalPrivacyControl:
			(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
	};
}

async function maintainerDiagnosticsEnabled(): Promise<boolean> {
	if (typeof window === 'undefined') return false;
	const signals = readPrivacySignals();
	if (signals.doNotTrack === '1' || signals.doNotTrack === 'yes') return false;
	if (signals.globalPrivacyControl === true) return false;
	configPromise ??= client.GET('/diagnostics/public-config', {}).then(
		({ data }) =>
			maintainerDiagnosticsAllowed({
				...signals,
				configEnabled: data?.enabled === true
			}),
		() => false
	);
	return configPromise;
}

async function sendNormalized(kind: BrowserFailureKind, error: Error): Promise<void> {
	if (!(await maintainerDiagnosticsEnabled())) return;
	const failure = normalizeBrowserFailure(
		kind,
		error.name,
		error.message,
		error.stack,
		page.url.pathname
	);
	if (!failure) return;
	await maybeReportBrowserFailure(failure, {
		postReport: (body) => client.POST('/diagnostics/report', { body }).then(() => undefined)
	});
}

// installMaintainerDiagnosticsCapture reports uncaught browser failures
// through the viewer's own instance, parallel to (never replacing) the
// operator's analytics channel. No direct external path exists: when the
// backend is down, browser reports are lost rather than rerouted.
export function installMaintainerDiagnosticsCapture(): () => void {
	if (typeof window === 'undefined') return () => undefined;
	let active = true;
	const onError = (event: ErrorEvent) => {
		if (!active || event.defaultPrevented) return;
		const error = event.error instanceof Error ? event.error : new Error(event.message);
		void sendNormalized('error', error);
	};
	const onUnhandledRejection = (event: PromiseRejectionEvent) => {
		if (!active || event.defaultPrevented) return;
		const reason =
			event.reason instanceof Error ? event.reason : new Error('Unhandled promise rejection');
		void sendNormalized('unhandledrejection', reason);
	};
	window.addEventListener('error', onError);
	window.addEventListener('unhandledrejection', onUnhandledRejection);
	return () => {
		active = false;
		window.removeEventListener('error', onError);
		window.removeEventListener('unhandledrejection', onUnhandledRejection);
	};
}
