import { expect, it, vi } from 'vitest';
import { deleteHandle, getHandle, saveHandle } from './handles-db';

it('reopens a closed handle database before writing without losing existing handles', async () => {
	const id = crypto.randomUUID();
	const handle = await navigator.storage.getDirectory();
	const record = {
		kind: 'project-folder' as const,
		id,
		handle,
		name: 'Before',
		pickedAt: 1
	};
	await saveHandle(record);
	const transaction = IDBDatabase.prototype.transaction;
	const closing = vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementationOnce(function (
		this: IDBDatabase,
		...args
	) {
		this.close();
		return transaction.apply(this, args);
	});
	try {
		await saveHandle({ ...record, name: 'After' });
		expect((await getHandle('project-folder', id))?.name).toBe('After');
		expect(closing).toHaveBeenCalled();
	} finally {
		closing.mockRestore();
		await deleteHandle('project-folder', id);
	}
});
