package aunomotion

// SceneGraph is the minimal server-side mirror required to author native OpenPost
// motion overlays. It intentionally does not duplicate the entire web editor model.
type SceneGraph struct {
	SchemaVersion int      `json:"schemaVersion"`
	Style         string   `json:"style"`
	Seed          uint32   `json:"seed"`
	Brief         Brief    `json:"brief"`
	Scenes        []Scene  `json:"scenes"`
}

type Brief struct {
	Palette              []string `json:"palette"`
	Typography           string   `json:"typography"`
	CameraLanguage       string   `json:"cameraLanguage"`
	MotionSignature      string   `json:"motionSignature"`
	BackgroundLanguage  string   `json:"backgroundLanguage"`
	TransitionLanguage  []string `json:"transitionLanguage"`
}

type Scene struct {
	ID              string  `json:"id"`
	SourceSceneID   string  `json:"sourceSceneId"`
	VisualIntent    string  `json:"visualIntent"`
	StartSeconds    float64 `json:"startSeconds"`
	DurationSeconds float64 `json:"durationSeconds"`
}

type NativeOverlay struct {
	Composition NativeComposition `json:"composition"`
	TimelineItem NativeTimelineItem `json:"timelineItem"`
}

type NativeComposition struct {
	ID                  string                    `json:"id"`
	Name                string                    `json:"name"`
	EditorKind          string                    `json:"editorKind"`
	CompositionControls NativeCompositionControls `json:"compositionControls"`
	Items               []NativeItem              `json:"items"`
	Tracks              []NativeTrack             `json:"tracks"`
	Transitions         []any                     `json:"transitions"`
	FPS                 float64                   `json:"fps"`
	Width               int                       `json:"width"`
	Height              int                       `json:"height"`
	DurationInFrames    int                       `json:"durationInFrames"`
	BackgroundColor     string                    `json:"backgroundColor"`
}

type NativeCompositionControls struct {
	Version  int                    `json:"version"`
	Controls []NativeControl        `json:"controls"`
}

type NativeControl struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	TargetItemID string `json:"targetItemId"`
	Property     string `json:"property"`
	Kind         string `json:"kind"`
	DefaultValue string `json:"defaultValue"`
}

type NativeTrack struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Kind    string `json:"kind"`
	Height  int    `json:"height"`
	Locked  bool   `json:"locked"`
	Visible bool   `json:"visible"`
	Muted   bool   `json:"muted"`
	Solo    bool   `json:"solo"`
	Order   int    `json:"order"`
}

type NativeTransform struct {
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Width    float64 `json:"width"`
	Height   float64 `json:"height"`
	Opacity  float64 `json:"opacity"`
	ScaleX   float64 `json:"scaleX,omitempty"`
	ScaleY   float64 `json:"scaleY,omitempty"`
	Rotation float64 `json:"rotation,omitempty"`
}

type NativeKeyframeTrack struct {
	Frames  []int     `json:"frames"`
	Values  []float64 `json:"values"`
	IDs     []string  `json:"ids"`
	Easings []string  `json:"easings"`
}

type NativeItem struct {
	ID               string                         `json:"id"`
	TrackID          string                         `json:"trackId"`
	From             int                            `json:"from"`
	DurationInFrames int                            `json:"durationInFrames"`
	Label            string                         `json:"label"`
	Type             string                         `json:"type"`
	ShapeType        string                         `json:"shapeType,omitempty"`
	FillEnabled      bool                           `json:"fillEnabled,omitempty"`
	FillType         string                         `json:"fillType,omitempty"`
	FillColor        string                         `json:"fillColor,omitempty"`
	StrokeEnabled    bool                           `json:"strokeEnabled,omitempty"`
	StrokeColor      string                         `json:"strokeColor,omitempty"`
	StrokeWidth      float64                        `json:"strokeWidth,omitempty"`
	Transform        NativeTransform                `json:"transform"`
	Keyframes        map[string]NativeKeyframeTrack `json:"keyframes,omitempty"`
}

type NativeTimelineItem struct {
	ID                          string            `json:"id"`
	TrackID                     string            `json:"trackId"`
	From                        int               `json:"from"`
	DurationInFrames            int               `json:"durationInFrames"`
	Label                       string            `json:"label"`
	Type                        string            `json:"type"`
	CompositionID               string            `json:"compositionId"`
	CompositionWidth            int               `json:"compositionWidth"`
	CompositionHeight           int               `json:"compositionHeight"`
	CompositionControlOverrides map[string]string `json:"compositionControlOverrides,omitempty"`
	Transform                   NativeTransform   `json:"transform"`
}
