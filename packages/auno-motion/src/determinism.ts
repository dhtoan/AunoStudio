export function normalizeMotionSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  const normalized = Math.abs(Math.trunc(seed)) >>> 0;
  return normalized === 0 ? 1 : normalized;
}

export function hashMotionSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return normalizeMotionSeed(hash);
}

export function seededUnit(seed: number, salt = 0): number {
  let value = normalizeMotionSeed(seed + Math.imul(salt + 1, 0x9e3779b1));
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return (value >>> 0) / 0xffffffff;
}

export function seededSigned(seed: number, salt = 0): number {
  return seededUnit(seed, salt) * 2 - 1;
}

export function deterministicChoice<T>(values: readonly T[], seed: number, salt = 0): T {
  if (values.length === 0) throw new Error('deterministicChoice requires at least one value');
  const index = Math.min(values.length - 1, Math.floor(seededUnit(seed, salt) * values.length));
  return values[index]!;
}
