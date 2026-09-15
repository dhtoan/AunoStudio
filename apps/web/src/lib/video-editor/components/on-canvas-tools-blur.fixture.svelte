<!-- Test-only parent that mirrors preview-player: it keeps mounted while the
	canvas tools block mounts and unmounts with the selected item. Destroying
	only the child reproduces the production blur-after-unmount path, where
	Svelte's delegated blur still dispatches to the destroyed instance. -->
<script lang="ts">
	import OnCanvasTools from './on-canvas-tools.svelte';
	import type { TimelineItem } from '$lib/video-editor/project/types';

	let {
		item,
		hooks
	}: {
		item: TimelineItem | undefined;
		hooks: {
			ontextediting: (editing: boolean) => void;
			oncommittext: (text: string) => void;
			onedit: () => void;
		};
	} = $props();
</script>

<div data-testid="tools-harness">
	{#if item}
		<OnCanvasTools
			{item}
			motionSourceItem={item}
			motionContext={{ fps: 30, frameWidth: 1920, frameHeight: 1080, items: [] }}
			canvasWidth={1920}
			canvasHeight={1080}
			currentFrame={0}
			ontransformdraft={() => {}}
			oncropdraft={() => {}}
			oncornerpindraft={() => {}}
			ontextediting={hooks.ontextediting}
			oncommitvalues={() => false}
			oncommitposition={() => false}
			oncreatespatial={() => false}
			oncommitspatial={() => false}
			oncommittext={hooks.oncommittext}
			oncommitcornerpin={() => {}}
			onseek={() => {}}
			onedit={hooks.onedit}
		/>
	{/if}
</div>
