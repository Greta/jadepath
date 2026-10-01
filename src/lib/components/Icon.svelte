<script lang="ts">
	let { name, size = 20 }: { name: string; size?: number } = $props();
	const paths: Record<string, string> = {
		overview: 'M3 10 12 3l9 7v10H3V10Zm6 10v-7h6v7',
		students:
			'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
		classes: 'M4 5h16v16H4V5Zm0 5h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2',
		attendance: 'm7 13 3 3 7-7M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M15 3h6v6',
		progress: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
		arrow: 'M4 12h16m-6-6 6 6-6 6',
		chevron: 'm9 5 7 7-7 7',
		plus: 'M12 5v14M5 12h14',
		search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
		close: 'm6 6 12 12M6 18 18 6',
		check: 'm5 12 4 4L19 6',
		clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
		leaf: 'M20 4C9 2 3 7 5 14c2 7 13 7 15-10ZM4 21 15 10',
		reset: 'M3 11a9 9 0 1 1 3 8M3 4v7h7',
		location: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
	};
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.65"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"><path d={paths[name] ?? paths.leaf} /></svg
>
