<script lang="ts">
	import { AUNO_BRAND } from '$lib/auno/brand';

	interface Props {
		class?: string;
		width?: number;
		height?: number;
		showText?: boolean;
		decorative?: boolean;
	}

	let {
		class: className = '',
		width = 100,
		height = 28,
		showText = false,
		decorative = false
	}: Props = $props();
	const size = $derived(Math.min(width, height));
</script>

<div class="flex items-center gap-2 {className}">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 128 128"
		width={size}
		height={size}
		role={decorative || showText ? undefined : 'img'}
		aria-label={decorative || showText ? undefined : AUNO_BRAND.productName}
		aria-hidden={decorative || showText ? 'true' : undefined}
		class="h-auto max-w-full shrink-0"
	>
		<g fill="var(--action-focal)">
			<path d="M58 12h12L35 116H12L58 12Z" />
			<path d="M70 12 116 116H92L64 49 70 12Z" />
			<path d="M39 78h50l8 18H33l6-18Z" />
			<path d="M58 12h12l-6 16-6-16Z" />
		</g>
	</svg>
	{#if showText}
		<span
			class="font-brand leading-none font-semibold tracking-[-0.02em] whitespace-nowrap text-sidebar-foreground"
			>{AUNO_BRAND.productName}</span
		>
	{/if}
</div>
