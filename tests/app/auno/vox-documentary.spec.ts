import { expect, test } from "@playwright/test";
import { authenticatePage, createWorkspace, registerUser } from "../helpers";

interface VoxFixtureSummary {
  runId: string;
  projectId: string;
  mode: "documentary-long-form";
  style: "documentary-paper-collage";
  ideaCount: number;
  selectedIdeaId: string;
  targetDurationSeconds: number;
  scriptWordCount: number;
  scriptTargetWordCount: number;
  beatCount: number;
  visualPlanCount: number;
  nativeTimelineItemCount: number;
  compositionItemId: string;
  compositionId: string;
  controlId: string;
}

interface VoxDocumentaryTestHook {
  runFixture(): Promise<VoxFixtureSummary>;
  setCompositionOverride(input: {
    itemId: string;
    controlId: string;
    value: string;
  }): Promise<void>;
  readCompositionOverride(input: { itemId: string; controlId: string }): string | null;
  reloadProject(projectId: string): Promise<void>;
  seekBeat(index: number): Promise<{ index: number; frame: number; itemId: string; itemCount: number }>;
  exportEntryState(): Promise<{ available: boolean; durationFrames: number }>;
}

async function waitForVoxHook(page: Parameters<typeof authenticatePage>[0]): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as typeof window & { __AUNO_DOCUMENTARY_TEST__?: VoxDocumentaryTestHook })
            .__AUNO_DOCUMENTARY_TEST__,
        ),
      ),
    )
    .toBe(true);
}

test("Vox long-form fixture reaches an editable 120-beat native project and persists motion edits", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const unique = Date.now().toString(36);
  const auth = await registerUser(request, `auno-vox-documentary-${unique}@example.com`);
  const workspace = (await createWorkspace(request, auth.token, "Auno Vox Documentary E2E")) as {
    id: string;
  };
  expect(workspace.id).toBeTruthy();
  await authenticatePage(page, auth.token);
  await page.goto("/video-editor");
  await waitForVoxHook(page);

  const fixture = await page.evaluate(async () => {
    const hook = (window as typeof window & { __AUNO_DOCUMENTARY_TEST__?: VoxDocumentaryTestHook })
      .__AUNO_DOCUMENTARY_TEST__;
    if (!hook) throw new Error("Auno documentary test hook is unavailable");
    return hook.runFixture();
  });

  expect(fixture.mode).toBe("documentary-long-form");
  expect(fixture.style).toBe("documentary-paper-collage");
  expect(fixture.ideaCount).toBe(10);
  expect(fixture.selectedIdeaId).toBeTruthy();
  expect(fixture.targetDurationSeconds).toBe(300);
  expect(fixture.scriptTargetWordCount).toBe(750);
  expect(fixture.scriptWordCount).toBeGreaterThanOrEqual(700);
  expect(fixture.beatCount).toBe(120);
  expect(fixture.visualPlanCount).toBe(120);
  expect(fixture.nativeTimelineItemCount).toBeGreaterThan(fixture.beatCount);
  expect(fixture.compositionItemId).toBeTruthy();
  expect(fixture.compositionId).toBeTruthy();
  expect(fixture.controlId).toBe("paper-jitter");

  await page.goto(`/video-editor/${fixture.projectId}?storage=cloud`);
  await waitForVoxHook(page);

  await page.evaluate(
    async ({ itemId, controlId }) => {
      const hook = (window as typeof window & { __AUNO_DOCUMENTARY_TEST__?: VoxDocumentaryTestHook })
        .__AUNO_DOCUMENTARY_TEST__!;
      await hook.setCompositionOverride({ itemId, controlId, value: "0.35" });
    },
    { itemId: fixture.compositionItemId, controlId: fixture.controlId },
  );

  await page.evaluate(async (projectId) => {
    const hook = (window as typeof window & { __AUNO_DOCUMENTARY_TEST__?: VoxDocumentaryTestHook })
      .__AUNO_DOCUMENTARY_TEST__!;
    await hook.reloadProject(projectId);
  }, fixture.projectId);

  const persisted = await page.evaluate(
    ({ itemId, controlId }) => {
      const hook = (window as typeof window & { __AUNO_DOCUMENTARY_TEST__?: VoxDocumentaryTestHook })
        .__AUNO_DOCUMENTARY_TEST__!;
      return hook.readCompositionOverride({ itemId, controlId });
    },
    { itemId: fixture.compositionItemId, controlId: fixture.controlId },
  );
  expect(persisted).toBe("0.35");

  const lastBeat = await page.evaluate(async () => {
    const hook = (window as typeof window & { __AUNO_DOCUMENTARY_TEST__?: VoxDocumentaryTestHook })
      .__AUNO_DOCUMENTARY_TEST__!;
    return hook.seekBeat(119);
  });
  expect(lastBeat.index).toBe(119);
  expect(lastBeat.itemCount).toBeGreaterThanOrEqual(120);
  expect(lastBeat.frame).toBeGreaterThan(8_000);
  expect(lastBeat.itemId).toContain("beat-");

  const exportEntry = await page.evaluate(async () => {
    const hook = (window as typeof window & { __AUNO_DOCUMENTARY_TEST__?: VoxDocumentaryTestHook })
      .__AUNO_DOCUMENTARY_TEST__!;
    return hook.exportEntryState();
  });
  expect(exportEntry.available).toBe(true);
  expect(exportEntry.durationFrames).toBe(9_000);
});
