import { expect, test } from "@playwright/test";
import { authenticatePage, createWorkspace, registerUser } from "../helpers";

const MOTION_STYLES = [
  "editorial-fashion",
  "luxury-product",
  "visual-journalism",
  "white-catalog",
  "continuous-action",
  "cartoon-collage",
  "vintage-sketch",
  "breaking-news",
  "minimal-data",
  "documentary-paper-collage",
] as const;

const VOX_SCENARIOS = [
  "cold-open",
  "map-document",
  "connection-board",
  "evidence-number",
  "final-beat",
] as const;

interface RuntimeQAIssue {
  code: string;
  severity: "warning" | "error";
  message: string;
}

interface MotionQATestHook {
  inspect(input: {
    style: string;
    progress: 0.25 | 0.5 | 0.75;
    scenario?: string;
  }): Promise<{ frame: number; issues: RuntimeQAIssue[] }>;
}

test("all ten Motion Styles expose clean structured runtime QA at fixed probes", async ({ page, request }) => {
  test.setTimeout(120_000);
  const unique = Date.now().toString(36);
  const auth = await registerUser(request, `auno-motion-visual-qa-${unique}@example.com`);
  await createWorkspace(request, auth.token, "Auno Motion Visual QA E2E");
  await authenticatePage(page, auth.token);
  await page.goto("/video-editor");

  for (const style of MOTION_STYLES) {
    for (const progress of [0.25, 0.5, 0.75] as const) {
      const result = await page.evaluate(
        async ({ styleId, probe }) => {
          const hook = (window as typeof window & { __AUNO_MOTION_QA_TEST__?: MotionQATestHook })
            .__AUNO_MOTION_QA_TEST__;
          if (!hook) throw new Error("Auno motion runtime QA test hook is unavailable");
          return hook.inspect({ style: styleId, progress: probe });
        },
        { styleId: style, probe: progress },
      );
      expect(result.frame).toBeGreaterThanOrEqual(0);
      expect(result.issues.filter((issue) => issue.severity === "error"), `${style}@${progress}`).toEqual([]);
    }
  }
});

test("Vox signature documentary beats remain free of runtime visual blockers", async ({ page, request }) => {
  test.setTimeout(120_000);
  const unique = Date.now().toString(36);
  const auth = await registerUser(request, `auno-vox-visual-qa-${unique}@example.com`);
  await createWorkspace(request, auth.token, "Auno Vox Visual QA E2E");
  await authenticatePage(page, auth.token);
  await page.goto("/video-editor");

  for (const scenario of VOX_SCENARIOS) {
    const result = await page.evaluate(async (scenarioName) => {
      const hook = (window as typeof window & { __AUNO_MOTION_QA_TEST__?: MotionQATestHook })
        .__AUNO_MOTION_QA_TEST__;
      if (!hook) throw new Error("Auno motion runtime QA test hook is unavailable");
      return hook.inspect({ style: "documentary-paper-collage", progress: 0.5, scenario: scenarioName });
    }, scenario);
    expect(
      result.issues.filter((issue) => issue.severity === "error"),
      `documentary-paper-collage:${scenario}`,
    ).toEqual([]);
  }
});
