<script lang="ts">
	import favicon from '#lib/assets/jadepath-favicon.png';
	import '../app.css';
	import '../theme.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" sizes="64x64" href={favicon} />
</svelte:head>

{@render children()}
