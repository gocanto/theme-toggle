import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

const trackedFiles = execFileSync('git', ['ls-files', '-z', '--', '*.cjs', '*.js', '*.mjs', '*.ts', '*.tsx', '*.vue'], {
	cwd: repoRoot,
	encoding: 'utf8',
})
	.split('\0')
	.filter(Boolean);

const patterns = [
	/\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s*)?(['"])(\.{1,2}\/[^'"]+)\1/g,
	/\bexport\s+(?:type\s+)?(?:[^'"]*?\s+from\s*)(['"])(\.{1,2}\/[^'"]+)\1/g,
	/\bimport\s*\(\s*(['"])(\.{1,2}\/[^'"]+)\1\s*\)/g,
	/\brequire\s*\(\s*(['"])(\.{1,2}\/[^'"]+)\1\s*\)/g,
];

const violations = [];

for (const file of trackedFiles) {
	const path = `${repoRoot}/${file}`;

	if (!existsSync(path)) {
		continue;
	}

	const source = readFileSync(path, 'utf8');

	for (const pattern of patterns) {
		pattern.lastIndex = 0;

		for (const match of source.matchAll(pattern)) {
			const index = match.index ?? 0;
			const line = source.slice(0, index).split('\n').length;
			const specifier = match[2];

			violations.push(`${file}:${line}: ${specifier}`);
		}
	}
}

if (violations.length > 0) {
	console.error(`Relative module specifiers are not allowed. Use repo aliases instead.\n${violations.join('\n')}`);
	process.exit(1);
}
