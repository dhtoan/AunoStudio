package documentary

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
)

func Fingerprint(parts ...string) string {
	hash := sha256.New()
	var size [8]byte
	for _, part := range parts {
		binary.BigEndian.PutUint64(size[:], uint64(len(part)))
		_, _ = hash.Write(size[:])
		_, _ = hash.Write([]byte(part))
	}
	return hex.EncodeToString(hash.Sum(nil))
}

var directDependents = map[Step][]Step{
	StepSource:    {StepIdeas, StepScript},
	StepTopic:     {StepIdeas, StepScript, StepThumbnails},
	StepIdeas:     {StepScript},
	StepDuration:  {StepScript},
	StepScript:    {StepVoice, StepBeats, StepThumbnails},
	StepVoice:     {StepBeats},
	StepBeats:     {StepVisuals},
	StepVisuals:   {StepAnimation},
	StepAnimation: nil,
	StepThumbnails: nil,
	StepProject:   nil,
}

func DownstreamSteps(changed Step) []Step {
	seen := map[Step]bool{}
	queue := append([]Step(nil), directDependents[changed]...)
	for len(queue) > 0 {
		step := queue[0]
		queue = queue[1:]
		if seen[step] {
			continue
		}
		seen[step] = true
		queue = append(queue, directDependents[step]...)
	}
	ordered := make([]Step, 0, len(seen))
	for _, step := range AllSteps() {
		if seen[step] {
			ordered = append(ordered, step)
		}
	}
	return ordered
}

func InvalidateFrom(run *Run, changed Step) {
	if run == nil || len(run.StepStates) == 0 {
		return
	}
	for _, step := range DownstreamSteps(changed) {
		state, ok := run.StepStates[step]
		if !ok || state.Status == StepStatusPending {
			continue
		}
		state.Status = StepStatusStale
		run.StepStates[step] = state
	}
}
