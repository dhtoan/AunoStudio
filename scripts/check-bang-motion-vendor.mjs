import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const pin = '0f1bd1103835890354496d009af62885fe0a05d5';
const required = [
	'third_party/bang-motion/SKILL.md',
	'third_party/bang-motion/README.md',
	'third_party/bang-motion/LICENSE',
	'third_party/bang-motion/references/architecture.md',
	'third_party/bang-motion/references/techniques.md',
	'third_party/bang-motion/UPSTREAM.md'
];

const missing = required.filter((path) => !existsSync(path));
if (missing.length) {
	console.error(`Bang Motion vendor snapshot is incomplete: ${missing.join(', ')}`);
	process.exit(1);
}

const upstream = readFileSync('third_party/bang-motion/UPSTREAM.md', 'utf8');
if (!upstream.includes(pin)) {
	console.error(`Bang Motion UPSTREAM.md must pin ${pin}.`);
	process.exit(1);
}

if (existsSync('third_party/bang-motion/.git')) {
	console.error('Vendored Bang Motion snapshot must not contain a nested .git directory.');
	process.exit(1);
}

const productionRoots = ['packages/auno-motion/src', 'apps/web/src/lib/auno', 'apps/server/internal/aunomotion'];
const sourceExtensions = new Set(['.ts', '.svelte', '.go', '.js', '.mjs']);
const forbidden = 'third_party/bang-motion';
const violations = [];

function scan(path) {
	if (!existsSync(path)) return;
	const stats = statSync(path);
	if (stats.isDirectory()) {
		for (const entry of readdirSync(path)) scan(join(path, entry));
		return;
	}
	const dot = path.lastIndexOf('.');
	const extension = dot >= 0 ? path.slice(dot) : '';
	if (!sourceExtensions.has(extension)) return;
	if (readFileSync(path, 'utf8').includes(forbidden)) violations.push(path);
}

for (const root of productionRoots) scan(root);
if (violations.length) {
	console.error(`Production runtime must not import the Bang Motion reference snapshot: ${violations.join(', ')}`);
	process.exit(1);
}

console.log(`Bang Motion vendor snapshot present and pinned to ${pin}; production runtime is isolated from the reference tree.`);
