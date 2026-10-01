import { dateKey, type SchoolData, type Student } from './domain';
export function createDemo(today = new Date()): SchoolData {
	const classes: SchoolData['classes'] = [
		{
			id: 'roots',
			name: 'Strong roots',
			description: 'A welcoming start. Stances, balance, and the basics.',
			time: '16:00',
			end: '17:00',
			room: 'Main hall',
			teacher: 'Sifu Alex',
			capacity: 16
		},
		{
			id: 'flow',
			name: 'Foundations & flow',
			description: 'Connect your footwork, hand techniques, and first forms.',
			time: '17:30',
			end: '18:30',
			room: 'Main hall',
			teacher: 'Sifu Alex',
			capacity: 18
		},
		{
			id: 'forms',
			name: 'Forms practice',
			description: 'Slow things down. Make space for detail and refinement.',
			time: '19:00',
			end: '20:15',
			room: 'Practice room',
			teacher: 'Sifu Morgan',
			capacity: 12
		}
	];
	const names = [
		'Maya Chen',
		'Jordan Ellis',
		'Leo Park',
		'Amara Okafor',
		'Noah Rivera',
		'Sofia Bennett',
		'Eli Brooks',
		'Priya Shah',
		'Theo Martin',
		'Avery Kim',
		'Luca Reyes',
		'Nora Adams',
		'Sam Taylor',
		'Isla Reed'
	];
	const milestoneIds = ['stance', 'footwork', 'hands', 'form', 'partner'];
	const students: Student[] = names.map((name, i) => ({
		id: `student-${i + 1}`,
		name,
		email: `${name.toLowerCase().replace(' ', '.')}@example.test`,
		stage: i < 4 ? 'Foundations' : i < 10 ? 'Developing' : 'Advancing',
		status: i === 12 ? 'Paused' : 'Active',
		joined: dateKey(new Date(today.getFullYear(), today.getMonth() - ((i % 5) + 1), 12)),
		classIds: i < 4 ? ['roots', 'flow'] : i < 10 ? ['flow'] : ['forms'],
		milestones: milestoneIds.slice(0, [2, 1, 3, 2, 4, 3, 2, 4, 3, 1, 5, 4, 2, 4][i]),
		notes:
			i === 0
				? 'Finding more confidence in her footwork. Leave a little extra time for transitions.'
				: i === 4
					? 'Ready to revisit the opening sequence at our next practice.'
					: '',
		color: i % 4
	}));
	const attendance: SchoolData['attendance'] = [];
	for (let daysAgo = 1; daysAgo <= 21; daysAgo++) {
		const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysAgo);
		if (day.getDay() === 0) continue;
		students
			.filter((s, i) => s.status === 'Active' && (daysAgo + i) % 3 !== 0)
			.forEach((s) => {
				attendance.push({
					studentId: s.id,
					classId: s.classIds[0],
					date: dateKey(day),
					checkedAt: new Date(day.getFullYear(), day.getMonth(), day.getDate(), 16, 0).toISOString()
				});
			});
	}
	students.slice(0, 2).forEach((s) =>
		attendance.push({
			studentId: s.id,
			classId: 'roots',
			date: dateKey(today),
			checkedAt: new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate(),
				15,
				55
			).toISOString()
		})
	);
	return { version: 1, classes, students, attendance };
}
