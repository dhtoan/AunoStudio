import type {
	AutoVideoOwnedItem,
	AutoVideoOwnershipCategory,
	AutoVideoSidecar
} from './types';

function uniqueOwnedItems(items: AutoVideoOwnedItem[]): AutoVideoOwnedItem[] {
	const byKey = new Map<string, AutoVideoOwnedItem>();
	for (const item of items) {
		byKey.set(`${item.category}:${item.itemId}`, item);
	}
	return [...byKey.values()];
}

/** Builds category-aware ownership for sidecars created before ownedItems existed. */
export function normalizedAutoVideoOwnership(sidecar: AutoVideoSidecar): AutoVideoOwnedItem[] {
	const explicit = sidecar.generationGraph?.ownedItems;
	if (explicit?.length) return uniqueOwnedItems(explicit);

	const legacy: AutoVideoOwnedItem[] = [];
	for (const block of sidecar.generationGraph?.blocks ?? []) {
		for (const itemId of block.ownedItemIds) {
			legacy.push({
				itemId,
				sceneId: block.sceneId,
				category: itemId.endsWith('-motion-composition') ? 'motion' : 'visual'
			});
		}
	}
	for (const voice of sidecar.generationGraph?.media?.voices ?? []) {
		legacy.push({ itemId: voice.itemId, sceneId: voice.sceneId, category: 'voice' });
	}
	const captions = sidecar.generationGraph?.media?.captions;
	if (captions) legacy.push({ itemId: captions.itemId, category: 'caption' });
	const music = sidecar.generationGraph?.media?.music;
	if (music) legacy.push({ itemId: music.itemId, category: 'music' });
	return uniqueOwnedItems(legacy);
}

export function replaceOwnershipCategory(
	sidecar: AutoVideoSidecar,
	category: AutoVideoOwnershipCategory,
	items: AutoVideoOwnedItem[]
): AutoVideoOwnedItem[] {
	return uniqueOwnedItems([
		...normalizedAutoVideoOwnership(sidecar).filter((entry) => entry.category !== category),
		...items.filter((entry) => entry.category === category)
	]);
}

export function replaceSceneOwnershipCategory(
	sidecar: AutoVideoSidecar,
	category: AutoVideoOwnershipCategory,
	sceneId: string,
	items: AutoVideoOwnedItem[]
): AutoVideoOwnedItem[] {
	return uniqueOwnedItems([
		...normalizedAutoVideoOwnership(sidecar).filter(
			(entry) => !(entry.category === category && entry.sceneId === sceneId)
		),
		...items.filter((entry) => entry.category === category && entry.sceneId === sceneId)
	]);
}

export function ownedItemIdsForCategory(
	sidecar: AutoVideoSidecar,
	category: AutoVideoOwnershipCategory,
	sceneId?: string
): string[] {
	return normalizedAutoVideoOwnership(sidecar)
		.filter((entry) => entry.category === category && (!sceneId || entry.sceneId === sceneId))
		.map((entry) => entry.itemId);
}
