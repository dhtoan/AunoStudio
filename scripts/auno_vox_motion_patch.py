from pathlib import Path

styles = Path('packages/auno-motion/src/styles.ts')
text = styles.read_text()
if "'documentary-paper-collage':" not in text:
    marker = '\n  }\n};\n\nexport function motionStyle'
    if marker not in text:
        raise SystemExit('styles tail anchor missing')
    vox = '''
  },
  'documentary-paper-collage': {
    id: 'documentary-paper-collage',
    label: 'Vox Style',
    brief: {
      palette: ['#D7C3A3', '#171411', '#69635B', '#C92828', '#B78A28'],
      typography: 'condensed-editorial-typewriter-label',
      cameraLanguage: 'locked-documentary-tabletop',
      motionSignature: 'paper-assembly-stop-motion',
      backgroundLanguage: 'archival-newsprint-paper',
      transitionLanguage: ['hard-cut', 'crossfade']
    },
    text: { inPreset: 'cascade', outPreset: 'fade-down', intensity: 0.42, staggerFrames: 2 },
    camera: { scaleDelta: 0.006, xTravel: 0.003, yTravel: 0.003, rotationDegrees: 0.08 },
    background: { scaleDelta: 0.014, rotationDegrees: 0.4, drift: 0.008, smoothness: 0.38 },
    transition: 'hard-cut'
  }
};

export function motionStyle'''
    text = text.replace(marker, '\n' + vox, 1)
styles.write_text(text)

planner = Path('packages/auno-motion/src/planner.ts')
text = planner.read_text()
import_anchor = "import { refineEditorialFashion } from './editorial-fashion';\n"
if "refineDocumentaryPaperCollage" not in text:
    if import_anchor not in text:
        raise SystemExit('planner import anchor missing')
    text = text.replace(import_anchor, import_anchor + "import { refineDocumentaryPaperCollage } from './documentary-paper-collage';\n", 1)
old = '''    const refinement = input.style === 'editorial-fashion'
      ? refineEditorialFashion(scene, index, baseCamera, {
          ...style.text,
          intensity: userIntensity
        })
      : {
          camera: baseCamera,
          text: { ...style.text, intensity: userIntensity },
          backgroundScaleMultiplier: 1,
          backgroundDriftMultiplier: 1
        };
'''
new = '''    const plannedText = { ...style.text, intensity: userIntensity };
    const refinement = input.style === 'editorial-fashion'
      ? refineEditorialFashion(scene, index, baseCamera, plannedText)
      : input.style === 'documentary-paper-collage'
        ? refineDocumentaryPaperCollage(baseCamera, plannedText)
        : {
            camera: baseCamera,
            text: plannedText,
            backgroundScaleMultiplier: 1,
            backgroundDriftMultiplier: 1
          };
'''
if 'const plannedText =' not in text:
    if old not in text:
        raise SystemExit('planner refinement anchor missing')
    text = text.replace(old, new, 1)
planner.write_text(text)
