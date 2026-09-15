export function clamp01(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.min(1, Math.max(0, value));
}

export function easeOutCubic(progress: number): number {
	const value = clamp01(progress);
	return 1 - Math.pow(1 - value, 3);
}

export function easeInOutCubic(progress: number): number {
	const value = clamp01(progress);
	return value < 0.5
		? 4 * value * value * value
		: 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export function steppedEase(progress: number, steps: number): number {
	const value = clamp01(progress);
	if (!Number.isFinite(steps) || steps <= 0) return 0;
	if (value >= 1) return 1;
	const count = Math.max(1, Math.floor(steps));
	return Math.floor(value * count) / count;
}
