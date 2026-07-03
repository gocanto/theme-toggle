import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import ts from 'typescript';

interface SourceChunk {
	file: string;
	text: string;
	lineOffset: number;
	scriptKind: ts.ScriptKind;
}

interface Finding {
	file: string;
	line: number;
	column: number;
	value: string;
}

const PATH_SEPARATOR = '/';
const CURRENT_DIRECTORY_PREFIX = `.${PATH_SEPARATOR}`;
const PARENT_DIRECTORY_PREFIX = `..${PATH_SEPARATOR}`;
const CHECKED_PATHS = ['apps', 'packages', 'scripts'];
const VUE_SCRIPT_BLOCK = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.vue']);

const rootResult = spawnSync('git', ['rev-parse', '--show-toplevel'], {
	encoding: 'utf8',
});

if (rootResult.status !== 0) {
	process.stderr.write(rootResult.stderr || 'check-paths: failed to resolve repo root\n');
	process.exit(rootResult.status ?? 1);
}

const repoRoot = rootResult.stdout.trim();

const listed = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...CHECKED_PATHS], {
	cwd: repoRoot,
	encoding: 'utf8',
});

if (listed.status !== 0) {
	process.stderr.write(listed.stderr || 'check-paths: git ls-files failed\n');
	process.exit(listed.status ?? 1);
}

const files = listed.stdout
	.split('\0')
	.filter((file) => file.length > 0)
	.filter((file) => isCheckedFile(file))
	.filter((file) => existsSync(resolve(repoRoot, file)));

const findings = files.flatMap((file) => scanFile(file, readFileSync(resolve(repoRoot, file), 'utf8')));

if (findings.length > 0) {
	process.stderr.write(`Relative path syntax is not allowed. Use configured aliases instead of ${CURRENT_DIRECTORY_PREFIX} or ${PARENT_DIRECTORY_PREFIX}.\n\n`);

	for (const finding of findings) {
		process.stderr.write(`${finding.file}:${finding.line}:${finding.column} ${finding.value}\n`);
	}

	process.exit(1);
}

process.stdout.write('No relative path syntax found.\n');

function scanFile(file: string, text: string) {
	return extractChunks(file, text).flatMap((chunk) => scanChunk(chunk));
}

function isCheckedFile(file: string) {
	if (!SOURCE_EXTENSIONS.has(extname(file))) {
		return false;
	}

	return CHECKED_PATHS.some((base) => file === base || file.startsWith(`${base}${PATH_SEPARATOR}`));
}

function extractChunks(file: string, text: string): SourceChunk[] {
	const extension = extname(file);

	if (extension !== '.vue') {
		return [
			{
				file,
				text,
				lineOffset: 0,
				scriptKind: extension === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
			},
		];
	}

	const chunks: SourceChunk[] = [];

	for (const match of text.matchAll(VUE_SCRIPT_BLOCK)) {
		const script = match[1] ?? '';
		const start = match.index ?? 0;
		const scriptStart = start + match[0].indexOf('>') + 1;

		chunks.push({
			file,
			text: script,
			lineOffset: countLines(text.slice(0, scriptStart)),
			scriptKind: ts.ScriptKind.TS,
		});
	}

	return chunks;
}

function scanChunk(chunk: SourceChunk) {
	const sourceFile = ts.createSourceFile(chunk.file, chunk.text, ts.ScriptTarget.Latest, true, chunk.scriptKind);
	const findings: Finding[] = [];

	function visit(node: ts.Node) {
		if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && isRelativePathSyntax(node.text)) {
			const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));

			findings.push({
				file: chunk.file,
				line: position.line + chunk.lineOffset + 1,
				column: position.character + 1,
				value: node.text,
			});
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	return findings;
}

function isRelativePathSyntax(value: string) {
	return value.startsWith(CURRENT_DIRECTORY_PREFIX) || value.startsWith(PARENT_DIRECTORY_PREFIX);
}

function countLines(value: string) {
	return value.split('\n').length - 1;
}
