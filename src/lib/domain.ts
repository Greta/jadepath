export type Student = {
	id: string;
	name: string;
	email: string;
	stage: 'Foundations' | 'Developing' | 'Advancing';
	status: 'Active' | 'Paused';
	joined: string;
	classIds: string[];
	milestones: string[];
	notes: string;
	color: number;
};
export type SchoolClass = {
	id: string;
	name: string;
	description: string;
	time: string;
	end: string;
	room: string;
	teacher: string;
	capacity: number;
};
export type Attendance = { studentId: string; classId: string; date: string; checkedAt: string };
export type SchoolData = {
	version: 1;
	students: Student[];
	classes: SchoolClass[];
	attendance: Attendance[];
};
export const milestones = [
	{
		id: 'stance',
		title: 'Find a steady stance',
		detail: 'Balance, alignment, and a comfortable foundation.'
	},
	{
		id: 'footwork',
		title: 'Move with intention',
		detail: 'Connect basic steps and changes of direction.'
	},
	{
		id: 'hands',
		title: 'Connect the hands',
		detail: 'Practice coordinated hand techniques with control.'
	},
	{
		id: 'form',
		title: 'Bring a form together',
		detail: 'Link a short sequence with a consistent rhythm.'
	},
	{
		id: 'partner',
		title: 'Practice with a partner',
		detail: 'Listen, adapt, and work together safely.'
	}
];
export const stages: Student['stage'][] = ['Foundations', 'Developing', 'Advancing'];
export function dateKey(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function enrolled(data: SchoolData, classId: string): Student[] {
	return data.students.filter((s) => s.status === 'Active' && s.classIds.includes(classId));
}
export function attendanceRoster(data: SchoolData, classId: string, date: string): Student[] {
	return data.students.filter(
		(s) =>
			(s.status === 'Active' && s.classIds.includes(classId)) ||
			isCheckedIn(data, s.id, classId, date)
	);
}
export function isCheckedIn(
	data: SchoolData,
	studentId: string,
	classId: string,
	date: string
): boolean {
	return data.attendance.some(
		(a) => a.studentId === studentId && a.classId === classId && a.date === date
	);
}
export function checkIn(
	data: SchoolData,
	studentId: string,
	classId: string,
	date: string
): SchoolData {
	if (
		!data.classes.some((c) => c.id === classId) ||
		!enrolled(data, classId).some((s) => s.id === studentId)
	)
		throw new Error('This student is not enrolled in the class.');
	if (isCheckedIn(data, studentId, classId, date)) return data;
	return {
		...data,
		attendance: [
			...data.attendance,
			{ studentId, classId, date, checkedAt: new Date().toISOString() }
		]
	};
}
export function undoCheckIn(
	data: SchoolData,
	studentId: string,
	classId: string,
	date: string
): SchoolData {
	return {
		...data,
		attendance: data.attendance.filter(
			(a) => !(a.studentId === studentId && a.classId === classId && a.date === date)
		)
	};
}
export function addStudent(
	data: SchoolData,
	input: Pick<Student, 'name' | 'email' | 'stage' | 'classIds'>
): SchoolData {
	const name = input.name.trim();
	const email = input.email.trim().toLowerCase();
	if (!name || name.length > 80) throw new Error('Please enter a name of up to 80 characters.');
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
		throw new Error('Please enter a valid email address.');
	if (email && data.students.some((s) => s.email.toLowerCase() === email))
		throw new Error('A student with that email is already here.');
	if (!stages.includes(input.stage)) throw new Error('Please choose a practice stage.');
	if (input.classIds.some((id) => !data.classes.some((c) => c.id === id)))
		throw new Error('Please choose an existing class.');
	return {
		...data,
		students: [
			...data.students,
			{
				...input,
				name,
				email,
				classIds: [...new Set(input.classIds)],
				id: crypto.randomUUID(),
				status: 'Active',
				joined: dateKey(),
				milestones: [],
				notes: '',
				color: data.students.length % 4
			}
		]
	};
}
export function updateStudent(data: SchoolData, student: Student): SchoolData {
	return { ...data, students: data.students.map((s) => (s.id === student.id ? student : s)) };
}
export function initials(name: string): string {
	return name
		.trim()
		.split(/\s+/)
		.map((w) => w[0])
		.slice(0, 2)
		.join('');
}
export function progress(student: Student): number {
	return Math.round((student.milestones.length / milestones.length) * 100);
}
