import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marketingSocialEntries } from '@openpost/social-images';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(scriptDir, '../dist');
const problems = [];
const imageUrls = new Set();

function outputFile(routePath) {
	return routePath === '/'
		? path.join(dist, 'index.html')
		: path.join(dist, `${routePath.slice(1)}.html`);
}

function count(html, value) {
	return html.split(value).length - 1;
}

for (const entry of marketingSocialEntries) {
	const file = outputFile(entry.path);
	let html;
	try {
		html = await readFile(file, 'utf8');
	} catch (error) {
		problems.push(`${entry.path}: missing prerendered HTML at ${path.relative(dist, file)}`);
		continue;
	}

	const image = entry.imageUrl;
	imageUrls.add(image);
	const serializedImage = image.replaceAll('&', '&amp;');
	const expected = [
		['property="og:title"', entry.socialTitle],
		['property="og:description"', entry.description],
		['property="og:url"', entry.canonical],
		['property="og:image"', serializedImage],
		['property="og:image:alt"', entry.imageAlt],
		['name="twitter:card"', 'summary_large_image'],
		['name="twitter:image"', serializedImage]
	];

	for (const [attribute, value] of expected) {
		if (!html.includes(attribute) || !html.includes(value)) {
			problems.push(`${entry.path}: missing ${attribute} with ${value}`);
		}
	}

	if (count(html, 'property="og:image"') !== 1) {
		problems.push(`${entry.path}: expected exactly one og:image tag`);
	}
	const imageFile = path.join(dist, new URL(image).pathname.slice(1));
	try {
		const png = await readFile(imageFile);
		if (!png.subarray(1, 4).equals(Buffer.from('PNG'))) {
			problems.push(`${entry.path}: social image is not a PNG`);
		} else if (png.readUInt32BE(16) !== 1200 || png.readUInt32BE(20) !== 630) {
			problems.push(`${entry.path}: social image is not 1200x630`);
		}
	} catch {
		problems.push(`${entry.path}: missing social image at ${path.relative(dist, imageFile)}`);
	}
}

if (imageUrls.size !== marketingSocialEntries.length) {
	problems.push('marketing routes do not have unique social image URLs');
}
const generatedImages = (await readdir(path.join(dist, 'og'))).filter((file) =>
	file.endsWith('.png')
);
if (generatedImages.length !== marketingSocialEntries.length) {
	problems.push(
		`expected ${marketingSocialEntries.length} generated images, found ${generatedImages.length}`
	);
}

if (problems.length) {
	console.error(
		`Marketing social metadata check failed:\n${problems.map((item) => `- ${item}`).join('\n')}`
	);
	process.exit(1);
}

console.log(`Checked social metadata for ${marketingSocialEntries.length} marketing routes.`);
