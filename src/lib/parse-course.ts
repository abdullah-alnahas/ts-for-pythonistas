export interface Lesson {
	slug: string;
	order: number;
	title: string;
	subtitle: string;
	body: string;
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
	const m = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
	if (!m) return { meta: {}, body: raw };
	const meta: Record<string, string> = {};
	for (const line of m[1].split('\n')) {
		const idx = line.indexOf(':');
		if (idx === -1) continue;
		meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
	}
	return { meta, body: raw.slice(m[0].length) };
}

/** Turn a Vite `import.meta.glob('./*.md', {as raw})` result into ordered lessons. */
export function parseCourse(files: Record<string, string>): Lesson[] {
	return Object.entries(files)
		.map(([path, raw]) => {
			const file = path.replace(/^\.\//, '').replace(/\.md$/, '');
			const order = parseInt(file.slice(0, 2), 10);
			const slug = file.slice(3);
			const { meta, body } = parseFrontmatter(raw);
			return {
				slug,
				order,
				title: meta.title ?? slug,
				subtitle: meta.subtitle ?? '',
				body
			};
		})
		.sort((a, b) => a.order - b.order);
}
