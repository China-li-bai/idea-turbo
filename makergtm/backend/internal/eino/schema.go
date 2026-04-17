package eino

import "launchcircle-backend/internal/eino/types"

type GenerateInput = types.GenerateInput

const MaxProductDescLength = types.MaxProductDescLength

func SanitizeInput(input *GenerateInput) error {
	return types.SanitizeInput((*types.GenerateInput)(input))
}

type Fact = types.Fact
type Stage1Output = types.Stage1Output
type CompressedCase = types.CompressedCase
type Stage2Output = types.Stage2Output
type GeneratedCopy = types.GeneratedCopy
type Stage3Output = types.Stage3Output
type QualityMetrics = types.QualityMetrics
type Stage4Output = types.Stage4Output
type RefinementInstruction = types.RefinementInstruction
type Stage5Output = types.Stage5Output
type PipelineState = types.PipelineState

func NewPipelineState(input *GenerateInput) *PipelineState {
	return (*PipelineState)(types.NewPipelineState((*types.GenerateInput)(input)))
}

type ProgressEvent = types.ProgressEvent
type ProgressCallback = types.ProgressCallback

const (
	EventGenerationStart = types.EventGenerationStart
	EventStageComplete   = types.EventStageComplete
	EventQualityResult   = types.EventQualityResult
	EventRefinement      = types.EventRefinement
	EventPlatformDone    = types.EventPlatformDone
	EventAllDone         = types.EventAllDone
	EventError           = types.EventError
)
