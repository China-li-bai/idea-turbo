## ADDED Requirements

### Requirement: ModelSelectionNotifier manages model path state
ModelSelectionNotifier SHALL maintain the currently selected model path as the single source of truth for which local model is active.

#### Scenario: Initial checking state
- **WHEN** ModelSelectionNotifier is created
- **THEN** `isChecking` SHALL be true and `selectedModelPath` SHALL be null

#### Scenario: Model found on device
- **WHEN** `checkExistingModel()` finds a valid model file on device
- **THEN** `selectedModelPath` SHALL be set to the file path, `isChecking` SHALL be false

#### Scenario: No model on device
- **WHEN** `checkExistingModel()` finds no model files on device
- **THEN** `selectedModelPath` SHALL be null, `isChecking` SHALL be false

### Requirement: ModelSelectionNotifier persists model selection
ModelSelectionNotifier SHALL persist the selected model filename to SharedPreferences and restore it on check.

#### Scenario: Persist selected model
- **WHEN** a model is selected via `selectModel(config)`
- **THEN** the model filename SHALL be written to SharedPreferences under the key `selected_model_filename`

#### Scenario: Restore previously selected model
- **WHEN** `checkExistingModel()` runs and SharedPreferences contains a previously selected filename
- **THEN** that model SHALL be checked first, and if the file exists, used as `selectedModelPath`

#### Scenario: Previously selected model file deleted
- **WHEN** SharedPreferences references a filename but the file no longer exists on disk
- **THEN** the system SHALL fall back to the default model or other available models

### Requirement: ModelSelectionNotifier evaluates device performance
ModelSelectionNotifier SHALL provide device performance evaluation including tier and recommended models.

#### Scenario: Device performance available
- **WHEN** `checkExistingModel()` completes
- **THEN** `devicePerformance` SHALL contain the DevicePerformance object with tier and recommended models

### Requirement: ModelSelectionNotifier selects a model
ModelSelectionNotifier SHALL provide a `selectModel(ModelConfig config)` method that resolves the file path and updates state.

#### Scenario: Select existing model
- **WHEN** `selectModel(config)` is called and the model file exists on device
- **THEN** `selectedModelPath` SHALL be updated to the model's file path

#### Scenario: Select non-existent model
- **WHEN** `selectModel(config)` is called and the model file does not exist on device
- **THEN** `selectedModelPath` SHALL remain unchanged and `error` SHALL be set

### Requirement: ModelSelectionNotifier exposes reactive state
ModelSelectionNotifier SHALL extend ChangeNotifier and call `notifyListeners()` after every state change.

#### Scenario: State change notification
- **WHEN** any state field (selectedModelPath, isChecking, devicePerformance, error) changes
- **THEN** `notifyListeners()` SHALL be called
