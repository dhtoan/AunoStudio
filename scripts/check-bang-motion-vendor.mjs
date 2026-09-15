import { existsSync, readFileSync } from 'node:fs';

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

console.log(`Bang Motion vendor snapshot present and pinned to ${pin}.`);
