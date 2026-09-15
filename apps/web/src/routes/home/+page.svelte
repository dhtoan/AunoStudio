<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolveAppPath } from '$lib/app-path';
	import { AUNO_BRAND } from '$lib/auno/brand';
	import { AUNO_CREATE_ACTIONS } from '$lib/auno/create-actions';
	import { ThemeIcon } from '$lib/themes/icons';

	function open(href: string) {
		goto(resolveAppPath(href));
	}
</script>

<svelte:head>
	<title>{AUNO_BRAND.productName}</title>
</svelte:head>

<div class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
	<header class="space-y-2">
		<p class="text-sm font-medium text-muted-foreground">Workspace</p>
		<h1 data-app-title class="text-3xl font-semibold tracking-tight">{AUNO_BRAND.productName}</h1>
		<p class="max-w-2xl text-sm text-muted-foreground">
			Create, edit, organize, schedule, and publish from one workspace.
		</p>
	</header>

	<section class="space-y-3" aria-labelledby="create-heading">
		<div class="flex items-center justify-between gap-3">
			<h2 id="create-heading" class="text-lg font-semibold">Create something</h2>
		</div>
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#each AUNO_CREATE_ACTIONS as action (action.id)}
				<button
					type="button"
					class="group flex min-h-40 flex-col items-start justify-between rounded-xl border bg-card p-5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					onclick={() => open(action.href)}
				>
					<span class="flex size-10 items-center justify-center rounded-lg bg-muted">
						<ThemeIcon role={action.icon} class="size-5" />
					</span>
					<span class="space-y-1">
						<span class="block font-medium">{action.label}</span>
						<span class="block text-sm text-muted-foreground">{action.description}</span>
					</span>
				</button>
			{/each}
		</div>
	</section>

	<section class="grid gap-3 md:grid-cols-3" aria-label="Workspace shortcuts">
		<button
			type="button"
			class="flex items-center gap-3 rounded-xl border bg-card p-4 text-left hover:bg-accent"
			onclick={() => open('/editors')}
		>
			<ThemeIcon role="editors" class="size-5" />
			<span><strong class="block text-sm">Continue editing</strong><span class="text-xs text-muted-foreground">Open recent photo and video projects</span></span>
		</button>
		<button
			type="button"
			class="flex items-center gap-3 rounded-xl border bg-card p-4 text-left hover:bg-accent"
			onclick={() => open('/publications')}
		>
			<ThemeIcon role="publications" class="size-5" />
			<span><strong class="block text-sm">Publications</strong><span class="text-xs text-muted-foreground">Review scheduled and published content</span></span>
		</button>
		<button
			type="button"
			class="flex items-center gap-3 rounded-xl border bg-card p-4 text-left hover:bg-accent"
			onclick={() => open('/media')}
		>
			<ThemeIcon role="media" class="size-5" />
			<span><strong class="block text-sm">Media</strong><span class="text-xs text-muted-foreground">Reuse workspace images, video, audio, and assets</span></span>
		</button>
	</section>
</div>
