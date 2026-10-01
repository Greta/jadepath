import { describe, expect, it } from 'vitest';
import { createDemo } from './demo';
import {
	addStudent,
	attendanceRoster,
	checkIn,
	enrolled,
	isCheckedIn,
	undoCheckIn,
	updateStudent
} from './domain';
import { createLocalRepository, isSchoolData } from './repository';

const today = new Date(2026, 9, 1, 12);
describe('class attendance', () => {
	it('keeps a recorded visit accessible after a student pauses or leaves the class', () => {
		const demo = createDemo(today);
		const updated = updateStudent(demo, { ...demo.students[0], status: 'Paused', classIds: [] });
		expect(attendanceRoster(updated, 'roots', '2026-10-01').some((s) => s.id === 'student-1')).toBe(
			true
		);
		const undone = undoCheckIn(updated, 'student-1', 'roots', '2026-10-01');
		expect(attendanceRoster(undone, 'roots', '2026-10-01').some((s) => s.id === 'student-1')).toBe(
			false
		);
	});
	it('records one check-in per student, class, and date even if retried', () => {
		const demo = createDemo(today);
		const checked = checkIn(demo, 'student-3', 'roots', '2026-10-01');
		const retried = checkIn(checked, 'student-3', 'roots', '2026-10-01');
		expect(retried.attendance.length).toBe(demo.attendance.length + 1);
		expect(isCheckedIn(retried, 'student-3', 'roots', '2026-10-01')).toBe(true);
		expect(isCheckedIn(demo, 'student-3', 'roots', '2026-10-01')).toBe(false);
	});
	it('keeps attendance separate across classes and dates', () => {
		let demo = createDemo(today);
		demo = checkIn(demo, 'student-3', 'roots', '2026-10-01');
		demo = checkIn(demo, 'student-3', 'flow', '2026-10-01');
		const next = undoCheckIn(demo, 'student-3', 'roots', '2026-10-01');
		expect(isCheckedIn(next, 'student-3', 'roots', '2026-10-01')).toBe(false);
		expect(isCheckedIn(next, 'student-3', 'flow', '2026-10-01')).toBe(true);
		expect(next.attendance.filter((a) => a.date < '2026-10-01')).toEqual(
			demo.attendance.filter((a) => a.date < '2026-10-01')
		);
	});
	it('rejects an unenrolled or paused student and excludes paused students from the roster', () => {
		const demo = createDemo(today);
		expect(() => checkIn(demo, 'student-11', 'roots', '2026-10-01')).toThrow();
		expect(() => checkIn(demo, 'student-13', 'forms', '2026-10-01')).toThrow();
		expect(enrolled(demo, 'forms').some((s) => s.id === 'student-13')).toBe(false);
	});
});
describe('student records', () => {
	it('normalizes names and email and rejects case-insensitive duplicate email', () => {
		const demo = createDemo(today);
		const next = addStudent(demo, {
			name: '  Riley Morgan  ',
			email: ' RILEY@EXAMPLE.TEST ',
			stage: 'Foundations',
			classIds: ['roots', 'roots']
		});
		expect(next.students.at(-1)).toMatchObject({
			name: 'Riley Morgan',
			email: 'riley@example.test',
			classIds: ['roots']
		});
		expect(demo.students.length).toBe(14);
		expect(() =>
			addStudent(next, {
				name: 'Another Riley',
				email: 'Riley@Example.Test',
				stage: 'Foundations',
				classIds: []
			})
		).toThrow('already here');
	});
	it('allows an optional email, but rejects blank names, invalid email, and unknown classes', () => {
		const demo = createDemo(today);
		const valid = {
			name: 'Riley',
			email: '',
			stage: 'Foundations' as const,
			classIds: [] as string[]
		};
		expect(addStudent(demo, valid).students.at(-1)?.email).toBe('');
		expect(() => addStudent(demo, { ...valid, name: '  ' })).toThrow();
		expect(() => addStudent(demo, { ...valid, email: 'invalid' })).toThrow();
		expect(() => addStudent(demo, { ...valid, classIds: ['missing'] })).toThrow();
	});
	it('updates only the chosen profile and preserves attendance', () => {
		const demo = createDemo(today);
		const edited = {
			...demo.students[0],
			notes: 'A stronger stance today',
			milestones: ['stance']
		};
		const next = updateStudent(demo, edited);
		expect(next.students[0].notes).toBe(edited.notes);
		expect(next.students.slice(1)).toEqual(demo.students.slice(1));
		expect(next.attendance).toEqual(demo.attendance);
		expect(demo.students[0].notes).not.toBe(edited.notes);
	});
});
describe('demo storage', () => {
	it('round-trips edited records and check-ins through storage', () => {
		let saved = '';
		const repo = createLocalRepository({
			getItem: () => saved || null,
			setItem: (_key, value) => {
				saved = value;
			}
		});
		const data = checkIn(createDemo(today), 'student-3', 'roots', '2026-10-01');
		expect(repo.save(data)).toBe(true);
		expect(repo.load().data).toEqual(data);
	});
	it('recovers from corrupt data with an explanation and valid fresh data', () => {
		const repo = createLocalRepository({ getItem: () => '{broken', setItem: () => {} });
		const result = repo.load();
		expect(result.message).toContain('could not be loaded');
		expect(isSchoolData(result.data)).toBe(true);
	});
	it('rejects unsupported schemas and inconsistent attendance', () => {
		const data = createDemo(today);
		expect(isSchoolData({ ...data, version: 2 })).toBe(false);
		expect(isSchoolData({ ...data, attendance: [...data.attendance, data.attendance[0]] })).toBe(
			false
		);
		expect(
			isSchoolData({
				...data,
				attendance: [
					{ studentId: 'missing', classId: 'roots', date: '2026-10-01', checkedAt: 'now' }
				]
			})
		).toBe(false);
		expect(
			isSchoolData({ ...data, students: [{ ...data.students[0], milestones: ['missing'] }] })
		).toBe(false);
	});
	it('keeps the demo usable when storage is blocked or full', () => {
		const repo = createLocalRepository(null);
		expect(repo.load().data.students.length).toBe(14);
		expect(repo.load().message).toContain('unavailable');
		expect(repo.save(createDemo(today))).toBe(false);
		const full = createLocalRepository({
			getItem: () => null,
			setItem: () => {
				throw new Error('Quota');
			}
		});
		expect(full.save(createDemo(today))).toBe(false);
	});
});
