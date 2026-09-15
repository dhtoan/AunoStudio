import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

function productionFiles(): string[] {
  const root = dirname(fileURLToPath(import.meta.url));
  return readdirSync(root)
    .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
    .map((name) => join(root, name));
}

describe('Auno Motion deterministic production code', () => {
  it('does not depend on wall clock or ambient random state', () => {
    for (const file of productionFiles()) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toContain('Math.random(');
      expect(source, file).not.toContain('Date.now(');
      expect(source, file).not.toContain('performance.now(');
    }
  });
});
