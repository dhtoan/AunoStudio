<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { client } from '$lib/api/client';
	import { auth } from '$lib/stores/auth';
	import { invalidateAccountMutationDependencies } from '$lib/query/accounts';
	import { queryClient } from '$lib/query/client';
	import { goto } from '$app/navigation';
	import { resolveAppPath } from '$lib/app-path';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import StandaloneShell from '$lib/components/standalone-shell.svelte';
	import InlineNotice from '$lib/components/inline-notice.svelte';
	import { m } from '$lib/paraglide/messages';
	import {
		accountManagementReturnHref,
		clearAccountManagementContinuation,
		continuationHrefForNormalizedConnection,
		readFediverseCodeContinuation
	} from '$lib/account-management-route';

	let { provider }: { provider: 'mastodon' | 'pixelfed' } = $props();

	const copy = $derived(
		provider === 'pixelfed'
			? {
					title: m.accounts_pixelfed_callback_title(),
					connect: m.accounts_pixelfed_callback_connect(),
					description: m.accounts_pixelfed_callback_description(),
					codeRequired: m.accounts_pixelfed_callback_code_required(),
					workspaceMissing: m.accounts_pixelfed_callback_workspace_missing(),
					instanceMissing: m.accounts_pixelfed_callback_instance_missing(),
					exchangeFailed: m.accounts_pixelfed_callback_exchange_failed(),
					server: (server: string) => m.accounts_pixelfed_callback_server({ server }),
					codeLabel: m.accounts_pixelfed_callback_code(),
					codePlaceholder: m.accounts_pixelfed_callback_code_placeholder(),
					connecting: m.accounts_pixelfed_callback_connecting(),
					connectAction: m.accounts_pixelfed_callback_connect_action()
				}
			: {
					title: m.accounts_mastodon_callback_title(),
					connect: m.accounts_mastodon_callback_connect(),
					description: m.accounts_mastodon_callback_description(),
					codeRequired: m.accounts_mastodon_callback_code_required(),
					workspaceMissing: m.accounts_mastodon_callback_workspace_missing(),
					instanceMissing: m.accounts_mastodon_callback_instance_missing(),
					exchangeFailed: m.accounts_mastodon_callback_exchange_failed(),
					server: (server: string) => m.accounts_mastodon_callback_server({ server }),
					codeLabel: m.accounts_mastodon_callback_code(),
					codePlaceholder: m.accounts_mastodon_callback_code_placeholder(),
					connecting: m.accounts_mastodon_callback_connecting(),
					connectAction: m.accounts_mastodon_callback_connect_action()
				}
	);

	let code = $state('');
	let serverName = $state('');
	let instanceURL = $state('');
	let workspaceId = $state('');
	let loading = $state(false);
	let error = $state('');
	let pageLoading = $state(true);
	let cancelHref = $state('/settings?tab=accounts');
	let submitSequence = 0;
	let active = true;

	onDestroy(() => {
		active = false;
		submitSequence += 1;
	});

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const continuation = readFediverseCodeContinuation();
		cancelHref = accountManagementReturnHref();

		if (continuation && continuation.provider === provider) {
			workspaceId = continuation.workspaceID;
			serverName = continuation.serverName;
			instanceURL = continuation.instanceURL;
		}

		const codeFromUrl = params.get('code');
		if (codeFromUrl) {
			code = codeFromUrl;
		}
		pageLoading = false;
	});

	async function submitCode() {
		if (!code.trim()) {
			error = copy.codeRequired;
			return;
		}
		if (!workspaceId) {
			error = copy.workspaceMissing;
			return;
		}
		if (!serverName && !instanceURL) {
			error = copy.instanceMissing;
			return;
		}

		const sequence = ++submitSequence;
		const actorID = get(auth).user?.id ?? '';
		const targetWorkspaceID = workspaceId;
		const isCurrentRequest = () =>
			active &&
			sequence === submitSequence &&
			get(auth).user?.id === actorID &&
			workspaceId === targetWorkspaceID;
		loading = true;
		error = '';

		try {
			const exchange =
				provider === 'pixelfed'
					? await client.POST('/accounts/pixelfed/exchange', {
							body: {
								workspace_id: targetWorkspaceID,
								server_name: serverName,
								instance_url: instanceURL,
								code: code.trim()
							}
						})
					: await client.POST('/accounts/mastodon/exchange', {
							body: {
								workspace_id: targetWorkspaceID,
								server_name: serverName,
								instance_url: instanceURL,
								code: code.trim()
							}
						});
			const { data, error: err } = exchange;
			if (err) throw new Error(err.detail || copy.exchangeFailed);
			if (!data?.workspace_id || !data.account_id) {
				throw new Error(copy.exchangeFailed);
			}
			if (get(auth).user?.id !== actorID) return;
			await invalidateAccountMutationDependencies(queryClient, data.workspace_id);
			if (!isCurrentRequest()) return;
			pageLoading = true;
			clearAccountManagementContinuation();
			await goto(
				resolveAppPath(
					continuationHrefForNormalizedConnection({
						workspaceID: data.workspace_id,
						accountIDs: data.account_ids ?? [data.account_id],
						openFreshComposer: data.open_fresh_composer
					})
				)
			);
		} catch (e) {
			if (!isCurrentRequest()) return;
			clearAccountManagementContinuation();
			await goto(resolveAppPath(accountManagementReturnHref('failed', targetWorkspaceID)));
		} finally {
			if (isCurrentRequest()) loading = false;
		}
	}
</script>

<svelte:head>
	<title>{copy.title}</title>
</svelte:head>

<StandaloneShell
	title={copy.connect}
	description={copy.description}
	loading={pageLoading}
	loadingLabel={m.common_loading()}
>
	<div class="space-y-4">
		{#if serverName || instanceURL}
			<p class="text-sm text-muted-foreground">
				{copy.server(serverName || instanceURL)}
			</p>
		{/if}

		<form
			class="space-y-4"
			onsubmit={(event: SubmitEvent) => {
				event.preventDefault();
				void submitCode();
			}}
		>
			<div class="space-y-2">
				<Label for="code">{copy.codeLabel}</Label>
				<Input
					type="text"
					id="code"
					bind:value={code}
					placeholder={copy.codePlaceholder}
					class="font-mono"
					required
				/>
			</div>

			{#if error}
				<InlineNotice tone="error" message={error} />
			{/if}

			<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<Button href={resolveAppPath(cancelHref)} variant="outline">{m.common_cancel()}</Button>
				<Button type="submit" disabled={loading}>
					{loading ? copy.connecting : copy.connectAction}
				</Button>
			</div>
		</form>
	</div>
</StandaloneShell>
