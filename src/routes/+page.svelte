<script lang="ts">
	import { onMount } from 'svelte';
	import { brand } from '#lib/brand.ts';
	import logo from '#lib/assets/jadepath-flowing.webp';
	import { createDemo } from '#lib/demo.ts';
	import { createLocalRepository, type SchoolRepository } from '#lib/repository.ts';
	import {
		addStudent,
		attendanceRoster,
		checkIn,
		dateKey,
		enrolled,
		initials,
		isCheckedIn,
		milestones,
		progress,
		stages,
		undoCheckIn,
		updateStudent,
		type SchoolData,
		type Student
	} from '#lib/domain.ts';
	import Icon from '#lib/components/Icon.svelte';
	import Modal from '#lib/components/Modal.svelte';

	const navigation = ['Overview', 'Students', 'Classes', 'Attendance', 'Progress'];
	let view = $state('Overview');
	let data = $state<SchoolData>({ version: 1, students: [], classes: [], attendance: [] });
	let ready = $state(false);
	let today = $state('');
	let todayLabel = $state('');
	let repository: SchoolRepository;
	let query = $state('');
	let stageFilter = $state('All stages');
	let statusFilter = $state('Active');
	let selectedClass = $state('roots');
	let attendanceDate = $state('');
	let modal = $state<'add' | 'profile' | 'reset' | null>(null);
	let profile = $state<Student | null>(null);
	let formError = $state('');
	let newName = $state('');
	let newEmail = $state('');
	let newStage = $state<Student['stage']>('Foundations');
	let newClasses = $state<string[]>(['roots']);
	let message = $state('');
	let storageMessage = $state('');
	let toastTimer: ReturnType<typeof setTimeout>;
	const active = $derived(data.students.filter((s) => s.status === 'Active'));
	const filtered = $derived(
		data.students.filter(
			(s) =>
				s.name.toLowerCase().includes(query.trim().toLowerCase()) &&
				(stageFilter === 'All stages' || s.stage === stageFilter) &&
				(statusFilter === 'All students' || s.status === statusFilter)
		)
	);
	const roster = $derived(
		attendanceRoster(data, selectedClass, attendanceDate).filter((s) =>
			s.name.toLowerCase().includes(query.trim().toLowerCase())
		)
	);
	const currentClass = $derived(data.classes.find((c) => c.id === selectedClass));
	const checkInsToday = $derived(data.attendance.filter((a) => a.date === today).length);
	const reviewStudents = $derived(active.filter((s) => s.milestones.length >= 4));
	const recentDays = $derived.by(() => {
		if (!today) return [];
		return Array.from({ length: 7 }, (_, i) => {
			const d = new Date(`${today}T12:00:00`);
			d.setDate(d.getDate() - 6 + i);
			const key = dateKey(d);
			return {
				date: key,
				label: d.toLocaleDateString('en-US', { weekday: 'short' }),
				count: data.attendance.filter((a) => a.date === key).length
			};
		});
	});
	const weekCount = $derived(recentDays.reduce((sum, d) => sum + d.count, 0));
	const maxCount = $derived(Math.max(...recentDays.map((d) => d.count), 1));
	const titles: Record<string, string> = {
		Overview: 'A little progress, every practice.',
		Students: 'Every student has a path.',
		Classes: 'Make room for practice.',
		Attendance: 'Welcome to the mat.',
		Progress: 'Small steps. Strong foundations.'
	};
	const descriptions: Record<string, string> = {
		Overview: 'Your school at a glance. A little less admin, a little more kung fu.',
		Students: 'Familiar faces, new beginnings, and everything in between.',
		Classes: 'A simple daily schedule for our demo school.',
		Attendance: 'Choose a class, find a student, and check them in.',
		Progress: 'A place to notice the work, not just the milestones.'
	};

	onMount(() => {
		const now = new Date();
		today = dateKey(now);
		attendanceDate = today;
		todayLabel = now.toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
		let storage: Storage | null = null;
		try {
			storage = window.localStorage;
		} catch {
			/* The demo also works without storage. */
		}
		repository = createLocalRepository(storage);
		const result = repository.load();
		data = result.data;
		storageMessage = result.message ?? '';
		ready = true;
		return () => clearTimeout(toastTimer);
	});
	function navigate(next: string) {
		view = next;
		query = '';
	}
	function notify(text: string) {
		message = text;
		clearTimeout(toastTimer);
		toastTimer = setTimeout(() => (message = ''), 4500);
	}
	function save(next: SchoolData, text: string) {
		data = next;
		storageMessage = repository.save(next)
			? ''
			: 'Your changes are here, but could not be saved in this browser. Keep this page open to continue.';
		notify(text);
	}
	function openProfile(student: Student) {
		profile = { ...student, classIds: [...student.classIds], milestones: [...student.milestones] };
		modal = 'profile';
	}
	function openAttendance(classId: string) {
		selectedClass = classId;
		attendanceDate = today;
		navigate('Attendance');
	}
	function openAdd() {
		newName = '';
		newEmail = '';
		newStage = 'Foundations';
		newClasses = ['roots'];
		formError = '';
		modal = 'add';
	}
	function submitStudent(event: SubmitEvent) {
		event.preventDefault();
		try {
			save(
				addStudent(data, { name: newName, email: newEmail, stage: newStage, classIds: newClasses }),
				`${newName.trim()} is on the roster.`
			);
			modal = null;
		} catch (error) {
			formError =
				error instanceof Error ? error.message : 'Please check the details and try again.';
		}
	}
	function toggleAttendance(student: Student) {
		const checked = isCheckedIn(data, student.id, selectedClass, attendanceDate);
		save(
			checked
				? undoCheckIn(data, student.id, selectedClass, attendanceDate)
				: checkIn(data, student.id, selectedClass, attendanceDate),
			checked ? `${student.name}'s check-in was undone.` : `${student.name} is checked in.`
		);
	}
	function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		if (profile) {
			save(updateStudent(data, profile), `${profile.name}'s profile is saved.`);
			modal = null;
		}
	}
	function timeLabel(time: string) {
		const [h, m] = time.split(':').map(Number);
		return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
	}
	function lastSeen(student: Student) {
		const date = data.attendance
			.filter((a) => a.studentId === student.id)
			.map((a) => a.date)
			.sort()
			.at(-1);
		return date
			? date === today
				? 'Today'
				: new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric'
					})
			: 'Not yet';
	}
</script>

<svelte:head
	><title>{brand.name} · {view}</title><meta
		name="description"
		content="A little less admin, a little more kung fu. A student and attendance demo for martial arts schools."
	/></svelte:head
>

<a href="#main" class="skip-link">Skip to content</a>
<div class="app-shell">
	<aside class="sidebar">
		<a
			class="brand"
			href="#overview"
			onclick={() => navigate('Overview')}
			aria-label={`${brand.name} overview`}
			><span class="brand-mark"><img src={logo} alt="" width="48" height="48" /></span><span
				>{brand.name}<small>{brand.tagline}</small></span
			></a
		>
		<div class="school-label">
			<span class="eyebrow">YOUR SCHOOL</span><strong>{brand.school}</strong><span class="muted"
				>A welcoming place to practice</span
			>
		</div>
		<nav aria-label="Main navigation">
			{#each navigation as item}<button
					class:active={view === item}
					aria-current={view === item ? 'page' : undefined}
					onclick={() => navigate(item)}
					><Icon name={item.toLowerCase()} /><span>{item}</span
					>{#if item === 'Students' && ready}<span class="nav-count">{data.students.length}</span
						>{/if}</button
				>{/each}
		</nav>
		<div class="sidebar-bottom">
			<div class="demo-card">
				<span class="demo-dot"></span><strong>A little look around</strong>
				<p>This is a demo school. Every student and class is fictional.</p>
				<button class="text-button" onclick={() => (modal = 'reset')} disabled={!ready}
					><Icon name="reset" size={15} />Reset the demo</button
				>
			</div>
			<div class="instructor">
				<span class="avatar color-0">AC</span>
				<div>
					<strong>Sifu {brand.instructor}</strong><small>School administrator · Demo</small>
				</div>
			</div>
		</div>
	</aside>

	<div class="workspace">
		<header class="topbar">
			<span class="breadcrumb">Your school <span>/</span> <strong>{view}</strong></span>
			<div class="topbar-right">
				<span class="date-label">{todayLabel}</span><span class="demo-badge">DEMO SCHOOL</span>
			</div>
		</header>
		<main id="main">
			<div class="page-heading">
				<div>
					<p class="eyebrow">
						{view === 'Overview'
							? `WELCOME BACK, ${brand.instructor.toUpperCase()}`
							: view.toUpperCase()}
					</p>
					<h1>{titles[view]}</h1>
					<p class="intro">{descriptions[view]}</p>
				</div>
				<button class="button primary" onclick={openAdd} disabled={!ready}
					><Icon name="plus" size={18} />Add student</button
				>
			</div>
			{#if storageMessage}<div class="notice" role="status">{storageMessage}</div>{/if}
			{#if !ready}<div class="empty" role="status">Opening the school…</div>
			{:else if view === 'Overview'}
				<div class="stats">
					<article>
						<span class="stat-icon"><Icon name="students" /></span><span class="stat-label"
							>Active students</span
						><strong>{active.length}</strong><small
							>{data.students.filter((s) => s.status === 'Paused').length} taking a little break</small
						>
					</article>
					<article>
						<span class="stat-icon"><Icon name="classes" /></span><span class="stat-label"
							>Classes today</span
						><strong>{data.classes.length}</strong><small>Space to learn, move, and grow</small>
					</article>
					<article>
						<span class="stat-icon"><Icon name="attendance" /></span><span class="stat-label"
							>Checked in today</span
						><strong>{checkInsToday}</strong><small>Student visits across all classes</small>
					</article>
					<article>
						<span class="stat-icon"><Icon name="progress" /></span><span class="stat-label"
							>Ready for a check-in</span
						><strong>{reviewStudents.length}</strong><small>Four or more milestones reached</small>
					</article>
				</div>
				<div class="overview-grid">
					<section class="panel schedule">
						<div class="section-heading">
							<div>
								<span class="eyebrow">ON THE MAT</span>
								<h2>Today’s classes</h2>
							</div>
							<button class="text-button" onclick={() => navigate('Classes')}
								>View classes <Icon name="arrow" size={16} /></button
							>
						</div>
						{#each data.classes as c, i}<div class="class-row">
								<div class="class-time">
									<strong>{timeLabel(c.time).split(' ')[0]}</strong><small
										>{timeLabel(c.time).split(' ')[1]}</small
									>
								</div>
								<div class={`class-line tone-${i}`}></div>
								<div class="class-details">
									<h3>{c.name}</h3>
									<p>{c.teacher} <span>·</span> {c.room}</p>
									<small
										>{data.attendance.filter((a) => a.classId === c.id && a.date === today).length} check-ins
										·
										{enrolled(data, c.id).length} enrolled</small
									>
								</div>
								<button class="button secondary small" onclick={() => openAttendance(c.id)}
									>Check in <Icon name="arrow" size={16} /></button
								>
							</div>{/each}
					</section>
					<section class="practice-card">
						<div class="practice-art" aria-hidden="true">
							<span class="sun"></span><svg viewBox="0 0 300 180"
								><path d="M-20 158 80 39l130 143M89 170l93-97 139 98" /><path
									d="m57 67 24 14 15-19M158 97l25 11 23-12"
								/><path class="path" d="M182 181c-70-23 42-48-25-69" /></svg
							>
						</div>
						<span class="eyebrow">THE LONG VIEW</span>
						<h2>Good things take practice.</h2>
						<p>Notice the small wins. They’re the ones that build a strong foundation.</p>
						<button class="text-button" onclick={() => navigate('Progress')}
							>Follow their progress <Icon name="arrow" size={16} /></button
						>
					</section>
					<section class="panel">
						<div class="section-heading">
							<div>
								<span class="eyebrow">KEEP SHOWING UP</span>
								<h2>A week of practice</h2>
							</div>
							<span class="soft-tag">{weekCount} visits</span>
						</div>
						<div
							class="chart"
							role="img"
							aria-label={recentDays.map((d) => `${d.label}: ${d.count} visits`).join(', ')}
						>
							{#each recentDays as day}<div class="chart-column">
									<span>{day.count}</span>
									<div class="bar-track">
										<div
											class:today={day.date === today}
											class="bar"
											style={`height: ${Math.max(3, (day.count / maxCount) * 100)}%`}
										></div>
									</div>
									<small>{day.label}</small>
								</div>{/each}
						</div>
						<p class="panel-footnote">Class visits over the last seven days</p>
					</section>
					<section class="panel">
						<div class="section-heading">
							<div>
								<span class="eyebrow">GROWING TOGETHER</span>
								<h2>Time for a little encouragement</h2>
							</div>
						</div>
						<p class="muted section-description">
							These students have reached at least four practice milestones.
						</p>
						{#each reviewStudents.slice(0, 3) as student}<button
								class="student-mini"
								onclick={() => openProfile(student)}
								><span class={`avatar color-${student.color}`}>{initials(student.name)}</span><span
									><strong>{student.name}</strong><small
										>{student.milestones.length} of {milestones.length} milestones</small
									></span
								><Icon name="chevron" size={17} /></button
							>{/each}{#if reviewStudents.length === 0}<p class="empty">
								Every path starts somewhere. Progress will appear here.
							</p>{/if}
					</section>
				</div>
			{:else if view === 'Students' || view === 'Progress'}
				<div class="toolbar">
					<label class="search-box"
						><Icon name="search" size={18} /><input
							aria-label="Search students"
							placeholder="Find a student…"
							bind:value={query}
						/></label
					>
					<div class="filters">
						<select aria-label="Filter by stage" bind:value={stageFilter}
							><option>All stages</option>{#each stages as stage}<option>{stage}</option
								>{/each}</select
						><select aria-label="Filter by status" bind:value={statusFilter}
							><option>Active</option><option>Paused</option><option>All students</option></select
						>
					</div>
				</div>
				{#if view === 'Students'}<section class="panel table-panel">
						<div class="table-scroll">
							<table>
								<caption class="sr-only">Student roster</caption><thead
									><tr
										><th>Student</th><th>Practice stage</th><th>Classes</th><th>Last practice</th
										><th><span class="sr-only">Open profile</span></th></tr
									></thead
								><tbody
									>{#each filtered as student}<tr
											><td
												><button class="name-button" onclick={() => openProfile(student)}
													><span class={`avatar color-${student.color}`}
														>{initials(student.name)}</span
													><span
														><strong>{student.name}</strong><small
															>{student.email || 'No email added'}</small
														></span
													></button
												></td
											><td
												><span class={`stage stage-${student.stage.toLowerCase()}`}
													>{student.stage}</span
												></td
											><td
												>{student.classIds.length}
												{student.classIds.length === 1 ? 'class' : 'classes'}</td
											><td>{lastSeen(student)}</td><td
												><button
													class="icon-button"
													aria-label={`Open ${student.name}'s profile`}
													onclick={() => openProfile(student)}
													><Icon name="chevron" size={18} /></button
												></td
											></tr
										>{/each}</tbody
								>
							</table>
						</div>
						{#if !filtered.length}<div class="empty">
								No students found. Try another name or filter.
							</div>{/if}
						<div class="table-footer">
							{filtered.length}
							{filtered.length === 1 ? 'student' : 'students'} shown
							<span>Fictional people. Real possibilities.</span>
						</div>
					</section>
				{:else}<p class="muted curriculum-note">
						A sample practice path for the demo. These milestones are learning notes, not a
						universal kung fu ranking system.
					</p>
					<div class="progress-grid">
						{#each filtered as student}<button
								class="panel progress-card"
								onclick={() => openProfile(student)}
								><div class="student-card-heading">
									<span class={`avatar color-${student.color}`}>{initials(student.name)}</span><span
										><strong>{student.name}</strong><small>{student.stage}</small></span
									><Icon name="arrow" size={18} />
								</div>
								<div class="progress-caption">
									<span>Practice milestones</span><strong
										>{student.milestones.length} / {milestones.length}</strong
									>
								</div>
								<div class="progress-track">
									<span style={`width: ${progress(student)}%`}></span>
								</div>
								<p>
									{student.milestones.length === milestones.length
										? 'A lovely moment to reflect on the next step.'
										: milestones.find((m) => !student.milestones.includes(m.id))?.title}
								</p></button
							>{/each}
					</div>
					{#if !filtered.length}<div class="empty">
							No students found. Try another name or filter.
						</div>{/if}{/if}
			{:else if view === 'Classes'}
				<div class="section-heading">
					<h2>The daily rhythm</h2>
					<span class="soft-tag">{todayLabel}</span>
				</div>
				<div class="class-grid">
					{#each data.classes as c, i}<article class={`panel class-card tone-${i}`}>
							<span class="class-number">0{i + 1}</span><span class="eyebrow"
								>{timeLabel(c.time)} — {timeLabel(c.end)}</span
							>
							<h2>{c.name}</h2>
							<p>{c.description}</p>
							<div class="class-meta">
								<span><Icon name="students" size={17} />{c.teacher}</span><span
									><Icon name="location" size={17} />{c.room}</span
								>
							</div>
							<div class="enrollment">
								<span>{enrolled(data, c.id).length} students enrolled</span><small
									>Room for {c.capacity}</small
								>
							</div>
							<div class="progress-track">
								<span
									style={`width: ${Math.min(100, (enrolled(data, c.id).length / c.capacity) * 100)}%`}
								></span>
							</div>
							<button class="button secondary" onclick={() => openAttendance(c.id)}
								>Open class roster <Icon name="arrow" size={17} /></button
							>
						</article>{/each}
				</div>
				<div class="quiet-note">
					<Icon name="leaf" />
					<p>
						For now, these three demo classes run each day. We can shape the schedule around your
						school as Jadepath grows.
					</p>
				</div>
			{:else if view === 'Attendance'}
				<div class="attendance-controls">
					<label
						>Class<select bind:value={selectedClass}
							>{#each data.classes as c}<option value={c.id}>{c.name} · {timeLabel(c.time)}</option
								>{/each}</select
						></label
					><label
						>Practice date<input
							type="date"
							bind:value={attendanceDate}
							max={today}
							min="2020-01-01"
						/></label
					>
				</div>
				<section class="panel">
					<div class="section-heading">
						<div>
							<span class="eyebrow">{currentClass?.room.toUpperCase()}</span>
							<h2>{currentClass?.name}</h2>
							<p class="muted">
								{data.attendance.filter(
									(a) => a.classId === selectedClass && a.date === attendanceDate
								).length} check-ins · {enrolled(data, selectedClass).length} currently enrolled
							</p>
						</div>
						<span class="soft-tag"
							>{attendanceDate === today ? 'Today’s practice' : 'Past practice'}</span
						>
					</div>
					<label class="search-box roster-search"
						><Icon name="search" size={18} /><input
							aria-label="Search class roster"
							placeholder="Find a student in this class…"
							bind:value={query}
						/></label
					>
					{#each roster as student}{@const checked = isCheckedIn(
							data,
							student.id,
							selectedClass,
							attendanceDate
						)}
						<div class="attendance-row">
							<button class="name-button" onclick={() => openProfile(student)}
								><span class={`avatar color-${student.color}`}>{initials(student.name)}</span><span
									><strong>{student.name}</strong><small>{student.stage}</small></span
								></button
							><button
								class="button small"
								class:checked
								class:secondary={!checked}
								aria-label={checked
									? `Undo check-in for ${student.name}`
									: `Check in ${student.name}`}
								aria-pressed={checked}
								disabled={!attendanceDate ||
									attendanceDate > today ||
									attendanceDate < '2020-01-01'}
								onclick={() => toggleAttendance(student)}
								><Icon name={checked ? 'check' : 'plus'} size={17} />{checked
									? 'Checked in · Undo'
									: 'Check in'}</button
							>
						</div>{/each}{#if !roster.length}<div class="empty">
							No matching students in this class.
						</div>{/if}
				</section>
			{/if}
			<footer class="page-footer">
				<span>{brand.name} <span class="footer-dot">·</span> {brand.tagline}</span><span
					>Fictional demo data <span class="footer-dot">·</span> Changes stay in this browser</span
				>
				<button class="text-button mobile-reset" onclick={() => (modal = 'reset')} disabled={!ready}
					><Icon name="reset" size={14} />Reset the demo</button
				>
			</footer>
		</main>
	</div>
</div>
<div class="toast" class:visible={!!message} role="status" aria-live="polite">
	{#if message}<Icon name="check" size={18} />{message}{/if}
</div>

{#if modal === 'add'}
	<Modal title="A new beginning" onclose={() => (modal = null)}
		><p class="muted modal-intro">Add a fictional student and give them a place on the roster.</p>
		<form onsubmit={submitStudent}>
			<label
				>Student name<input
					bind:value={newName}
					required
					maxlength="80"
					placeholder="e.g. Riley Morgan"
					autocomplete="off"
				/></label
			><label
				>Email <span class="optional">optional</span><input
					bind:value={newEmail}
					type="email"
					maxlength="160"
					placeholder="riley@example.test"
					autocomplete="off"
				/></label
			><label
				>Practice stage<select bind:value={newStage}
					>{#each stages as stage}<option>{stage}</option>{/each}</select
				></label
			>
			<fieldset>
				<legend>Classes</legend>{#each data.classes as c}<label class="check-label"
						><input type="checkbox" value={c.id} bind:group={newClasses} />{c.name}<small
							>{timeLabel(c.time)}</small
						></label
					>{/each}
			</fieldset>
			{#if formError}<p class="form-error" role="alert">{formError}</p>{/if}
			<div class="dialog-actions">
				<button type="button" class="button secondary" onclick={() => (modal = null)}>Cancel</button
				><button class="button primary" type="submit"
					>Add student <Icon name="plus" size={17} /></button
				>
			</div>
		</form></Modal
	>
{:else if modal === 'profile' && profile}
	<Modal title="Student profile" onclose={() => (modal = null)} wide
		><div class="profile-heading">
			<span class={`avatar large color-${profile.color}`}>{initials(profile.name)}</span>
			<div>
				<h3>{profile.name}</h3>
				<p>{profile.email || 'No email added'}</p>
				<small
					>Joined {new Date(`${profile.joined}T12:00:00`).toLocaleDateString('en-US', {
						month: 'long',
						year: 'numeric'
					})}</small
				>
			</div>
		</div>
		<form onsubmit={saveProfile}>
			<div class="form-columns">
				<label
					>Practice stage<select bind:value={profile.stage}
						>{#each stages as stage}<option>{stage}</option>{/each}</select
					></label
				><label
					>Status<select bind:value={profile.status}
						><option>Active</option><option>Paused</option></select
					></label
				>
			</div>
			<fieldset>
				<legend>Enrolled classes</legend>{#each data.classes as c}<label class="check-label"
						><input type="checkbox" value={c.id} bind:group={profile.classIds} />{c.name}</label
					>{/each}
			</fieldset>
			<fieldset class="milestones">
				<legend
					>Practice milestones <span>{profile.milestones.length} / {milestones.length}</span
					></legend
				>{#each milestones as m}<label class="check-label"
						><input type="checkbox" value={m.id} bind:group={profile.milestones} /><span
							><strong>{m.title}</strong><small>{m.detail}</small></span
						></label
					>{/each}
			</fieldset>
			<label
				>Instructor notes<textarea
					bind:value={profile.notes}
					rows="3"
					maxlength="1500"
					placeholder="A small win, a useful reminder, something to revisit…"></textarea></label
			>
			<div class="profile-attendance">
				<Icon name="attendance" size={18} /><span
					>{data.attendance.filter((a) => a.studentId === profile?.id).length} recorded visits
					<span class="footer-dot">·</span>
					Last practice: {lastSeen(profile)}</span
				>
			</div>
			<div class="dialog-actions">
				<button class="button secondary" type="button" onclick={() => (modal = null)}>Cancel</button
				><button class="button primary" type="submit"
					>Save profile <Icon name="check" size={17} /></button
				>
			</div>
		</form></Modal
	>
{:else if modal === 'reset'}
	<Modal title="A fresh start?" onclose={() => (modal = null)}
		><p class="modal-intro">
			This puts the original demo students and classes back. Any changes you’ve made in this browser
			will be replaced.
		</p>
		<div class="dialog-actions">
			<button class="button secondary" onclick={() => (modal = null)}>Keep my changes</button
			><button
				class="button primary"
				onclick={() => {
					save(createDemo(), 'The demo is ready for a fresh start.');
					modal = null;
				}}>Reset demo</button
			>
		</div></Modal
	>
{/if}
