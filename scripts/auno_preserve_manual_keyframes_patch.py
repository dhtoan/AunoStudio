from pathlib import Path

path = Path('apps/web/src/lib/auno/motion/native-compiler.ts')
text = path.read_text()
old = """function mergeKeyframes(item: TimelineItem, next: ItemKeyframes): ItemKeyframes {\n\treturn { ...(item.keyframes ?? {}), ...next };\n}\n"""
new = """function aunoOwnedTrack(track: KeyframeTrack | undefined): boolean {\n\treturn Boolean(track?.ids?.length && track.ids.every((id) => id.startsWith('auno:')));\n}\n\nfunction mergeKeyframes(item: TimelineItem, next: ItemKeyframes): ItemKeyframes {\n\tconst merged: ItemKeyframes = { ...(item.keyframes ?? {}) };\n\tfor (const [property, track] of Object.entries(next)) {\n\t\tif (!track) continue;\n\t\tconst existing = merged[property as keyof ItemKeyframes];\n\t\t// Regeneration owns only Auno-authored tracks. Any manual/legacy track is preserved.\n\t\tif (existing && !aunoOwnedTrack(existing)) continue;\n\t\tmerged[property as keyof ItemKeyframes] = track;\n\t}\n\treturn merged;\n}\n"""
if old not in text:
    raise SystemExit('missing mergeKeyframes anchor')
path.write_text(text.replace(old, new, 1))
