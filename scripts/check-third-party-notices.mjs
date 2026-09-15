import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
	'LICENSE',
	'licenses/openpost/LICENSE',
	'licenses/bang-motion/LICENSE',
	'NOTICE.md',
	'docs/compliance/third-party-inventory.md'
];
for (const path of requiredFiles) {
	if (!existsSync(path)) {
		console.error(`Missing required third-party notice/license file: ${path}`);
		process.exit(1);
	}
}

const notice = readFileSync('NOTICE.md', 'utf8');
const inventory = readFileSync('docs/compliance/third-party-inventory.md', 'utf8');
const requiredNoticeTerms = ['## OpenPost', 'AGPL-3.0-only', '## Bang Motion', '0f1bd1103835890354496d009af62885fe0a05d5', 'MIT'];
for (const term of requiredNoticeTerms) {
	if (!notice.includes(term)) {
		console.error(`NOTICE.md is missing required provenance term: ${term}`);
		process.exit(1);
	}
}
for (const term of ['OpenPost', 'Bang Motion', 'licenses/bang-motion/LICENSE']) {
	if (!inventory.includes(term)) {
		console.error(`Third-party inventory is missing required entry/detail: ${term}`);
		process.exit(1);
	}
}

console.log('Third-party notices and required license paths are present.');
