<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	let {
		title,
		children,
		onclose,
		wide = false
	}: { title: string; children: Snippet; onclose: () => void; wide?: boolean } = $props();
	let element: HTMLDialogElement;
	onMount(() => {
		const previous = document.activeElement as HTMLElement | null;
		element.showModal();
		return () => {
			element.close();
			previous?.focus();
		};
	});
</script>

<dialog
	bind:this={element}
	class:wide
	aria-label={title}
	oncancel={(e) => {
		e.preventDefault();
		onclose();
	}}
>
	<div class="dialog-top">
		<h2>{title}</h2>
		<button class="icon-button" aria-label="Close dialog" onclick={onclose}
			><Icon name="close" /></button
		>
	</div>
	{@render children()}
</dialog>
