import { expect, test } from "@playwright/test";
import { authenticatePage, createWorkspace, registerUser } from "../helpers";

interface FrameCapture {
  frame: number;
  width: number;
  height: number;
  pixels: number[];
}

interface MotionTestHook {
  seedDeterministicProject(): Promise<{ projectId: string; probeFrames: number[] }>;
  capturePreviewFrame(frame: number): Promise<FrameCapture>;
  captureExportFrame(frame: number): Promise<FrameCapture>;
  reloadProject(projectId: string): Promise<void>;
}

function changedPixelMetrics(left: FrameCapture, right: FrameCapture) {
  expect(right.frame).toBe(left.frame);
  expect(right.width).toBe(left.width);
  expect(right.height).toBe(left.height);
  expect(right.pixels).toHaveLength(left.pixels.length);
  let changed = 0;
  let maxDelta = 0;
  for (let index = 0; index < left.pixels.length; index += 4) {
    let pixelChanged = false;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs((left.pixels[index + channel] ?? 0) - (right.pixels[index + channel] ?? 0));
      maxDelta = Math.max(maxDelta, delta);
      if (delta > 0) pixelChanged = true;
    }
    if (pixelChanged) changed += 1;
  }
  return {
    changedPixelRatio: changed / Math.max(1, left.pixels.length / 4),
    maxChannelDelta: maxDelta,
  };
}

test("preview and export pre-encode frames are deterministic across reload", async ({ page, request }) => {
  test.setTimeout(120_000);
  const unique = Date.now().toString(36);
  const auth = await registerUser(request, `auno-motion-determinism-${unique}@example.com`);
  await createWorkspace(request, auth.token, "Auno Motion Determinism E2E");
  await authenticatePage(page, auth.token);
  await page.goto("/video-editor");

  const fixture = await page.evaluate(async () => {
    const hook = (window as typeof window & { __AUNO_MOTION_TEST__?: MotionTestHook }).__AUNO_MOTION_TEST__;
    if (!hook) throw new Error("Auno motion test hook is unavailable");
    return hook.seedDeterministicProject();
  });
  expect(fixture.probeFrames.length).toBeGreaterThanOrEqual(5);

  const beforeReload: FrameCapture[] = [];
  for (const frame of fixture.probeFrames) {
    const captures = await page.evaluate(async (frameNumber) => {
      const hook = (window as typeof window & { __AUNO_MOTION_TEST__?: MotionTestHook }).__AUNO_MOTION_TEST__!;
      return {
        preview: await hook.capturePreviewFrame(frameNumber),
        exported: await hook.captureExportFrame(frameNumber),
      };
    }, frame);
    const metrics = changedPixelMetrics(captures.preview, captures.exported);
    expect(metrics.changedPixelRatio).toBeLessThanOrEqual(0.0001);
    expect(metrics.maxChannelDelta).toBeLessThanOrEqual(1);
    beforeReload.push(captures.preview);
  }

  await page.evaluate(async (projectId) => {
    const hook = (window as typeof window & { __AUNO_MOTION_TEST__?: MotionTestHook }).__AUNO_MOTION_TEST__!;
    await hook.reloadProject(projectId);
  }, fixture.projectId);

  for (const [index, frame] of fixture.probeFrames.entries()) {
    const afterReload = await page.evaluate(async (frameNumber) => {
      const hook = (window as typeof window & { __AUNO_MOTION_TEST__?: MotionTestHook }).__AUNO_MOTION_TEST__!;
      return hook.capturePreviewFrame(frameNumber);
    }, frame);
    const metrics = changedPixelMetrics(beforeReload[index]!, afterReload);
    expect(metrics.changedPixelRatio).toBeLessThanOrEqual(0.0001);
    expect(metrics.maxChannelDelta).toBeLessThanOrEqual(1);
  }
});
