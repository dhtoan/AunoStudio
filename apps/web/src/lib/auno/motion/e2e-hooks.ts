import {
	frameProbeFrames,
	planMotionGraph,
	validateMotionGraph,
	type MotionStyleId
} from '@auno/motion';
import { workspaceCtx } from '$lib/stores/workspace.svelte';
import { CloudVideoProjectRepository } from '$lib/video-editor/cloud/project-repository';
import { createBlankProject } from '$lib/video-editor/project/defaults';
import type { Project, TimelineItem } from '$lib/video-editor/project/types';
import { editorSession } from '$lib/video-editor/editor.svelte';
import { captureCanvasProbe, captureExportRendererProbe } from './runtime-probe';
import { seekPreviewMotionProbe } from './frame-probe';
import { measureRuntimeVisualQA } from './runtime-visual-qa';

interface BrowserFrameCapture {
	frame: number;
	width: number;
	height: number;
	pixels: number[];
}

interface MotionBrowserTestHook {
	seedDeterministicProject(): Promise<{ projectId: string; probeFrames: number[] }>;
	capturePreviewFrame(frame: number): Promise<BrowserFrameCapture>;
	captureExportFrame(frame: number): Promise<BrowserFrameCapture>;
	reloadProject(projectId: string): Promise<void>;
}

interface MotionBrowserQAHook {
	inspect(input: {
		style: string;
		progress: 0.25 | 0.5 | 0.75;
		scenario?: string;
	}): Promise<{
		frame: number;
		issues: Array<{ code: string; severity: 'warning' | 'error'; message: string }>;
	}>;
}

declare global {
	interface Window {
		__AUNO_MOTION_TEST__?: MotionBrowserTestHook;
		__AUNO_MOTION_QA_TEST__?: MotionBrowserQAHook;
	}
}

const TEST_TOTAL_FRAMES = 300;
const TEST_WIDTH = 320;
const TEST_HEIGHT = 240;
const TEST_FPS = 30;

function backgroundItem(): TimelineItem {
	return {
		id: 'auno-e2e-scene-background',
		trackId: 'track-video-main',
		from: 0,
		durationInFrames: TEST_TOTAL_FRAMES,
		label: 'Auno deterministic motion background',
		type: 'background',
		background: {
			kind: 'pattern',
			pattern: 'grid',
			foreground: '#F3E3C7',
			background: '#111827',
			scale: 1.1,
			rotation: 0,
			offsetX: 0,
			offsetY: 0,
			density: 0.62,
			foregroundOpacity: 0.38
		},
		transform: {
			x: TEST_WIDTH / 2,
			y: TEST_HEIGHT / 2,
			width: TEST_WIDTH,
			height: TEST_HEIGHT,
			opacity: 1
		},
		keyframes: {
			backgroundRotation: {
				frames: [0, TEST_TOTAL_FRAMES - 1],
				values: [-4, 11],
				ids: ['auno:e2e:bg-rotation:0', 'auno:e2e:bg-rotation:1'],
				easings: ['ease-in-out', 'ease-in-out']
			},
			backgroundOffsetX: {
				frames: [0, TEST_TOTAL_FRAMES - 1],
				values: [-0.08, 0.08],
				ids: ['auno:e2e:bg-x:0', 'auno:e2e:bg-x:1'],
				easings: ['ease-in-out', 'ease-in-out']
			},
			backgroundOffsetY: {
				frames: [0, TEST_TOTAL_FRAMES - 1],
				values: [0.05, -0.05],
				ids: ['auno:e2e:bg-y:0', 'auno:e2e:bg-y:1'],
				easings: ['ease-in-out', 'ease-in-out']
			}
		}
	};
}

function deterministicProject(): Project {
	const project = createBlankProject('Auno Motion Determinism E2E', {
		width: TEST_WIDTH,
		height: TEST_HEIGHT,
		fps: TEST_FPS
	});
	return {
		...project,
		duration: TEST_TOTAL_FRAMES / TEST_FPS,
		description: 'Auno test-only deterministic native motion fixture',
		metadata: {
			...project.metadata,
			backgroundColor: '#111827'
		},
		timeline: {
			...project.timeline!,
			items: [backgroundItem()],
			currentFrame: 0
		}
	};
}

async function workspaceId(): Promise<string> {
	if (!workspaceCtx.currentWorkspace?.id) await workspaceCtx.initialize();
	const id = workspaceCtx.currentWorkspace?.id;
	if (!id) throw new Error('Auno E2E motion fixture requires an active workspace');
	return id;
}

async function nextAnimationFrames(count = 4): Promise<void> {
	for (let index = 0; index < count; index += 1) {
		await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
	}
}

function browserCapture(
	probe: { frame: number; width: number; height: number; rgba: Uint8ClampedArray }
): BrowserFrameCapture {
	return {
		frame: probe.frame,
		width: probe.width,
		height: probe.height,
		pixels: Array.from(probe.rgba)
	};
}

async function waitForEditorProject(projectId?: string): Promise<Project> {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const project = editorSession.project;
		if (!editorSession.loading && project && (!projectId || project.id === projectId)) return project;
		await new Promise((resolve) => setTimeout(resolve, 25));
	}
	throw new Error(`Auno E2E editor project ${projectId ?? ''} did not become ready`);
}

async function waitForPreviewCanvas(): Promise<HTMLCanvasElement> {
	for (let attempt = 0; attempt < 120; attempt += 1) {
		const canvas = document.querySelector<HTMLCanvasElement>('[data-stacked-preview]');
		if (canvas && canvas.width > 1 && canvas.height > 1) return canvas;
		await nextAnimationFrames(1);
	}
	throw new Error('Auno E2E stacked preview canvas is unavailable');
}

async function seedDeterministicProject(): Promise<{ projectId: string; probeFrames: number[] }> {
	const id = await workspaceId();
	const project = deterministicProject();
	const repository = new CloudVideoProjectRepository<Project>(id);
	await repository.createWithId(project.id, project.name, project);
	return { projectId: project.id, probeFrames: frameProbeFrames(TEST_TOTAL_FRAMES) };
}

async function capturePreviewFrame(frame: number): Promise<BrowserFrameCapture> {
	const project = await waitForEditorProject();
	const normalized = seekPreviewMotionProbe(frame);
	editorSession.syncTimelineClock();
	await nextAnimationFrames();
	const canvas = await waitForPreviewCanvas();
	if (canvas.width !== project.metadata.width || canvas.height !== project.metadata.height) {
		throw new Error(
			`Auno E2E preview must render at project resolution; got ${canvas.width}x${canvas.height}, expected ${project.metadata.width}x${project.metadata.height}`
		);
	}
	return browserCapture(captureCanvasProbe(canvas, normalized));
}

async function captureExportFrame(frame: number): Promise<BrowserFrameCapture> {
	const project = await waitForEditorProject();
	return browserCapture(await captureExportRendererProbe(project, frame));
}

async function reloadProject(projectId: string): Promise<void> {
	await editorSession.load(projectId, await workspaceId());
	await waitForEditorProject(projectId);
	await nextAnimationFrames();
}

function runtimeMeasurement(style: MotionStyleId, scenario: string | undefined) {
	const stage = document.createElement('div');
	stage.dataset.aunoMotionQaFixture = style;
	stage.style.cssText = [
		'position:fixed',
		'left:-12000px',
		'top:0',
		'width:360px',
		'height:640px',
		'background:#111827',
		'overflow:hidden'
	].join(';');
	const subject = document.createElement('div');
	subject.dataset.aunoQaSubject = 'hero';
	subject.style.cssText = 'position:absolute;left:72px;top:96px;width:216px;height:360px;background:#E5E7EB';
	const text = document.createElement('div');
	text.dataset.aunoQaText = 'title';
	text.textContent = scenario ? `${style} · ${scenario}` : style;
	text.style.cssText = [
		'position:absolute',
		'left:54px',
		'top:500px',
		'width:252px',
		'height:56px',
		'color:#FFFFFF',
		'background:#111827',
		'font:700 18px/1.2 sans-serif'
	].join(';');
	stage.append(subject, text);
	document.body.append(stage);
	try {
		const stageRect = stage.getBoundingClientRect();
		const textRect = text.getBoundingClientRect();
		return {
			sceneId: scenario ? `vox-${scenario}` : `style-${style}`,
			stage: {
				x: stageRect.left,
				y: stageRect.top,
				width: stageRect.width,
				height: stageRect.height
			},
			visibleItems: ['hero', 'title'],
			requiredSubjectIds: ['hero'],
			textRects: [
				{
					itemId: 'title',
					left: textRect.left,
					right: textRect.right,
					top: textRect.top,
					bottom: textRect.bottom,
					sizeClass: 'normal' as const
				}
			],
			assets: [{ itemId: 'hero', status: 'ready' as const, required: true }],
			contrastSamples: [
				{
					itemId: 'title',
					foreground: '#FFFFFF',
					background: '#111827',
					sizeClass: 'normal' as const
				}
			]
		};
	} finally {
		stage.remove();
	}
}

async function inspectMotionStyle(input: {
	style: string;
	progress: 0.25 | 0.5 | 0.75;
	scenario?: string;
}) {
	const style = input.style as MotionStyleId;
	const visualIntent = input.scenario ?? `${style}-hero`;
	const graph = planMotionGraph({
		projectId: `auno-e2e-${style}-${visualIntent}`,
		style,
		seed: 20260915,
		brandPalette: ['#111827', '#F9FAFB', '#D7A66B'],
		scenes: [
			{
				id: `scene-${visualIntent}`,
				title: visualIntent,
				voice: `Runtime QA fixture for ${visualIntent}.`,
				visualIntent,
				durationSeconds: 10
			}
		]
	});
	const structural = validateMotionGraph(graph).map((issue) => ({
		code: issue.code,
		severity: issue.severity,
		message: issue.message
	}));
	const runtime = measureRuntimeVisualQA(runtimeMeasurement(style, input.scenario)).map((issue) => ({
		code: issue.code,
		severity: issue.severity,
		message: issue.message
	}));
	return {
		frame: Math.min(TEST_TOTAL_FRAMES - 1, Math.max(0, Math.round((TEST_TOTAL_FRAMES - 1) * input.progress))),
		issues: [...structural, ...runtime]
	};
}

export function installAunoMotionE2EHooks(): () => void {
	const previousMotion = window.__AUNO_MOTION_TEST__;
	const previousQA = window.__AUNO_MOTION_QA_TEST__;
	window.__AUNO_MOTION_TEST__ = {
		seedDeterministicProject,
		capturePreviewFrame,
		captureExportFrame,
		reloadProject
	};
	window.__AUNO_MOTION_QA_TEST__ = { inspect: inspectMotionStyle };
	return () => {
		if (previousMotion) window.__AUNO_MOTION_TEST__ = previousMotion;
		else delete window.__AUNO_MOTION_TEST__;
		if (previousQA) window.__AUNO_MOTION_QA_TEST__ = previousQA;
		else delete window.__AUNO_MOTION_QA_TEST__;
	};
}
