export const DOCUMENTARY_FIXTURE_BEAT_COUNT = 120;

export interface DocumentaryFixtureBeat {
  id: string;
  index: number;
  narration: string;
  startSeconds: number;
  durationSeconds: number;
  coreIdea: string;
  visualIntent: string;
  requiredSubjectIds: string[];
}

export interface DocumentaryE2EFixture {
  id: string;
  mode: "documentary-long-form";
  style: "documentary-paper-collage";
  title: string;
  targetDurationSeconds: number;
  language: string;
  ideas: Array<{ id: string; title: string; hook: string }>;
  selectedIdeaId: string;
  script: { text: string; wordCount: number; targetWordCount: number };
  beats: DocumentaryFixtureBeat[];
}

export function buildDocumentaryFixture(
  beatCount = DOCUMENTARY_FIXTURE_BEAT_COUNT,
): DocumentaryE2EFixture {
  const safeBeatCount = Math.max(1, Math.floor(beatCount));
  const beatDuration = 2.5;
  const beats = Array.from({ length: safeBeatCount }, (_, index) => ({
    id: `beat-${String(index + 1).padStart(3, "0")}`,
    index,
    narration: `Evidence beat ${index + 1} establishes one precise documentary fact.`,
    startSeconds: index * beatDuration,
    durationSeconds: beatDuration,
    coreIdea: `Evidence ${index + 1}`,
    visualIntent:
      index % 5 === 0
        ? "motion-composition"
        : index % 5 === 1
          ? "document"
          : index % 5 === 2
            ? "map"
            : index % 5 === 3
              ? "evidence-number"
              : "archival-photo",
    requiredSubjectIds: [],
  }));
  const ideas = Array.from({ length: 10 }, (_, index) => ({
    id: `idea-${index + 1}`,
    title: `Documentary idea ${index + 1}`,
    hook: `On January ${index + 1}, 2000, one record changed the investigation.`,
  }));
  const scriptText = beats.map((beat) => beat.narration).join(" ");
  return {
    id: "vox-e2e-120-beats",
    mode: "documentary-long-form",
    style: "documentary-paper-collage",
    title: "Vox deterministic 120-beat fixture",
    targetDurationSeconds: safeBeatCount * beatDuration,
    language: "en-US",
    ideas,
    selectedIdeaId: ideas[0]!.id,
    script: {
      text: scriptText,
      wordCount: scriptText.split(/\s+/u).filter(Boolean).length,
      targetWordCount: Math.round(safeBeatCount * beatDuration * 2.5),
    },
    beats,
  };
}
