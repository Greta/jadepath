import { createDemo } from './demo';
import { milestones, stages, type SchoolData } from './domain';
// Only this adapter knows about storage. A live version can use an authenticated API.
export const STORAGE_KEY = 'jadepath-demo-v1';
export interface SchoolRepository {
	load(): { data: SchoolData; message?: string };
	save(data: SchoolData): boolean;
}
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export function isSchoolData(value: unknown): value is SchoolData {
	if (!value || typeof value !== 'object') return false;
	const data = value as SchoolData;
	if (
		data.version !== 1 ||
		!Array.isArray(data.students) ||
		!Array.isArray(data.classes) ||
		!Array.isArray(data.attendance)
	)
		return false;
	const str = (v: unknown) => typeof v === 'string';
	if (
		!data.classes.every(
			(c) =>
				c &&
				[c.id, c.name, c.description, c.time, c.end, c.room, c.teacher].every(str) &&
				Number.isInteger(c.capacity) &&
				c.capacity > 0
		)
	)
		return false;
	if (new Set(data.classes.map((c) => c.id)).size !== data.classes.length) return false;
	if (
		!data.students.every(
			(s) =>
				s &&
				[s.id, s.name, s.email, s.joined, s.notes].every(str) &&
				stages.includes(s.stage) &&
				['Active', 'Paused'].includes(s.status) &&
				Number.isInteger(s.color) &&
				Array.isArray(s.classIds) &&
				s.classIds.every((id) => data.classes.some((c) => c.id === id)) &&
				Array.isArray(s.milestones) &&
				new Set(s.milestones).size === s.milestones.length &&
				s.milestones.every((id) => milestones.some((m) => m.id === id))
		)
	)
		return false;
	if (new Set(data.students.map((s) => s.id)).size !== data.students.length) return false;
	if (
		!data.attendance.every(
			(a) =>
				a &&
				[a.studentId, a.classId, a.date, a.checkedAt].every(str) &&
				data.students.some((s) => s.id === a.studentId) &&
				data.classes.some((c) => c.id === a.classId)
		)
	)
		return false;
	return (
		new Set(data.attendance.map((a) => `${a.studentId}/${a.classId}/${a.date}`)).size ===
		data.attendance.length
	);
}
export function createLocalRepository(storage: StorageLike | null): SchoolRepository {
	return {
		load() {
			if (!storage)
				return {
					data: createDemo(),
					message: 'Browser storage is unavailable. Changes will last until you leave this page.'
				};
			try {
				const saved = storage.getItem(STORAGE_KEY);
				if (!saved) return { data: createDemo() };
				const parsed: unknown = JSON.parse(saved);
				if (!isSchoolData(parsed)) throw new Error('Unsupported demo data');
				return { data: parsed };
			} catch {
				return {
					data: createDemo(),
					message: 'The saved demo could not be loaded. A fresh demo is ready.'
				};
			}
		},
		save(data) {
			try {
				if (!storage) return false;
				storage.setItem(STORAGE_KEY, JSON.stringify(data));
				return true;
			} catch {
				return false;
			}
		}
	};
}
