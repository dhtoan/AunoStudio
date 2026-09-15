<script lang="ts">
	import { onMount } from 'svelte';
	import { applyAPIRequestHeaders } from '$lib/api/client';
	import InlineNotice from '$lib/components/inline-notice.svelte';
	import { Button } from '$lib/components/ui/button';

	type Capabilities = {
		provider_mode: string;
		planner_available: boolean;
		active_provider: string;
		active_model: string;
		gemini_configured: boolean;
		openrouter_configured: boolean;
		local_storyboard_fallback: boolean;
		browser_tts: boolean;
		browser_transcription: boolean;
		browser_music_generation: boolean;
	};

	let capabilities = $state<Capabilities | null>(null);
	let loading = $state(true);
	let error = $state('');
	let localVoices = $state<string[]>([]);
	let musicStatus = $state('Checking browser support…');

	async function refresh(): Promise<void> {
		loading = true;
		error = '';
		try {
			const response = await fetch('/api/v1/auno/ai/capabilities', {
				credentials: 'include',
				headers: applyAPIRequestHeaders(new Headers())
			});
			if (!response.ok) throw new Error(`AI capability status could not be loaded (${response.status}).`);
			capabilities = (await response.json()) as Capabilities;

			const tts = await import('$lib/video-editor/local-ai/tts/registry');
			localVoices = tts.LOCAL_TTS_ENGINE_OPTIONS
				.filter((option) => tts.isLocalTtsSupported(option.value))
				.map((option) => option.label);

			const music = await import('$lib/video-editor/local-ai/music/ace-step-service');
			const support = await music.inspectMusicGenerationSupport();
			musicStatus = support.supported
				? 'ACE-Step WebGPU is available in this browser.'
				: support.reason === 'webgpu-unavailable'
					? 'ACE-Step needs WebGPU-capable desktop hardware/browser.'
					: 'ACE-Step local music is unavailable in this browser context.';
		} catch (cause) {
			error = cause instanceof Error ? cause.message : String(cause);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void refresh();
	});
</script>

<div class="space-y-6" data-testid="auno-ai-settings">
	{#if error}
		<InlineNotice tone="error">{error}</InlineNotice>
	{/if}

	<section class="rounded-xl border bg-card p-5">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h2 class="font-semibold">AI routing</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Auto Video uses the provider-neutral server AI boundary. Secrets stay on the server.
				</p>
			</div>
			<Button variant="outline" size="sm" onclick={refresh} disabled={loading}>
				{loading ? 'Checking…' : 'Refresh status'}
			</Button>
		</div>

		{#if capabilities}
			<div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-lg border p-4">
					<p class="text-xs uppercase tracking-wide text-muted-foreground">Mode</p>
					<p class="mt-1 font-medium">{capabilities.provider_mode}</p>
				</div>
				<div class="rounded-lg border p-4">
					<p class="text-xs uppercase tracking-wide text-muted-foreground">Active planner</p>
					<p class="mt-1 font-medium">{capabilities.planner_available ? capabilities.active_provider : 'Local fallback'}</p>
					{#if capabilities.active_model}<p class="mt-1 break-all text-xs text-muted-foreground">{capabilities.active_model}</p>{/if}
				</div>
				<div class="rounded-lg border p-4">
					<p class="text-xs uppercase tracking-wide text-muted-foreground">Gemini</p>
					<p class="mt-1 font-medium">{capabilities.gemini_configured ? 'Configured' : 'Not configured'}</p>
				</div>
				<div class="rounded-lg border p-4">
					<p class="text-xs uppercase tracking-wide text-muted-foreground">OpenRouter</p>
					<p class="mt-1 font-medium">{capabilities.openrouter_configured ? 'Configured' : 'Not configured'}</p>
				</div>
			</div>
		{/if}

		<div class="mt-5 rounded-lg bg-muted/50 p-4 text-sm">
			<p class="font-medium">Server configuration</p>
			<p class="mt-1 text-muted-foreground">
				Use <code>AUNO_AI_PROVIDER=auto|gemini|openrouter</code>. Gemini uses the official API-key path via <code>AUNO_GEMINI_API_KEY</code>; OpenRouter keeps <code>OPENROUTER_API_KEY</code>. Raw keys are never returned by this page.
			</p>
		</div>
	</section>

	<section class="rounded-xl border bg-card p-5">
		<h2 class="font-semibold">Free / local media AI</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			These capabilities run in the browser when the device supports them, keeping the default Docker install lightweight.
		</p>
		<div class="mt-5 grid gap-3 md:grid-cols-3">
			<div class="rounded-lg border p-4">
				<p class="font-medium">Voice</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{localVoices.length > 0 ? localVoices.join(', ') : 'No compatible local TTS engine detected yet.'}
				</p>
			</div>
			<div class="rounded-lg border p-4">
				<p class="font-medium">Subtitles</p>
				<p class="mt-1 text-sm text-muted-foreground">
					Parakeet / Whisper local transcription is available through the Video Editor. Generated narration can use its source script directly instead of retranscribing audio.
				</p>
			</div>
			<div class="rounded-lg border p-4">
				<p class="font-medium">Music</p>
				<p class="mt-1 text-sm text-muted-foreground">{musicStatus}</p>
			</div>
		</div>
	</section>
</div>
