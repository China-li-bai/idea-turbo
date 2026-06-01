## ADDED Requirements

### Requirement: ChatNotifier manages chat message state
ChatNotifier SHALL maintain an immutable list of ChatMessage objects as the single source of truth for chat history. The list SHALL NOT be directly mutable by consumers.

#### Scenario: Initial empty state
- **WHEN** ChatNotifier is created
- **THEN** messages SHALL be an empty immutable list

#### Scenario: Message list immutability
- **WHEN** a consumer reads messages from ChatNotifier
- **THEN** the returned list SHALL be unmodifiable and any attempt to add/remove directly SHALL throw

### Requirement: ChatNotifier sends user messages
ChatNotifier SHALL provide a `sendMessage(String text)` method that appends a user message, invokes AiService, and appends the assistant response.

#### Scenario: Successful message send
- **WHEN** `sendMessage("你好")` is called and AiService returns a response
- **THEN** messages list SHALL contain the user message followed by the assistant response, in order

#### Scenario: Send while already sending
- **WHEN** `sendMessage` is called while `isSending` is true
- **THEN** the call SHALL be ignored and no duplicate message SHALL be added

#### Scenario: Send while initializing
- **WHEN** `sendMessage` is called while `isInitializing` is true
- **THEN** the call SHALL be ignored

#### Scenario: AI service failure
- **WHEN** AiService throws an exception during generation
- **THEN** error SHALL be set to a non-null error message, isSending SHALL be false, and the user message SHALL remain in the list

### Requirement: ChatNotifier persists messages
ChatNotifier SHALL persist messages to SharedPreferences on every mutation (add/clear) and load them on initialization.

#### Scenario: Messages persisted after send
- **WHEN** a message is successfully sent
- **THEN** the full message list SHALL be written to SharedPreferences under the key `local_chat_messages_v1`

#### Scenario: Messages loaded on initialize
- **WHEN** ChatNotifier is initialized and SharedPreferences contains saved messages
- **THEN** the messages list SHALL be populated from the stored data

#### Scenario: Corrupted stored data
- **WHEN** SharedPreferences contains data that cannot be parsed as valid messages
- **THEN** corrupted entries SHALL be silently skipped and valid entries SHALL be loaded

### Requirement: ChatNotifier clears messages
ChatNotifier SHALL provide a `clearMessages()` method that removes all messages from state and storage.

#### Scenario: Clear all messages
- **WHEN** `clearMessages()` is called
- **THEN** messages SHALL be an empty list and SharedPreferences key SHALL be removed

### Requirement: ChatNotifier manages AiService lifecycle
ChatNotifier SHALL own the AiService instance and manage its initialization and disposal.

#### Scenario: Initialize AiService
- **WHEN** `initialize(modelPath)` is called
- **THEN** AiService SHALL be initialized with the given model path and `isInitializing` SHALL transition from true to false

#### Scenario: Initialize with invalid model path
- **WHEN** `initialize(modelPath)` is called and AiService fails to load
- **THEN** `isInitializing` SHALL be false and `error` SHALL contain a model load failure message

#### Scenario: Dispose AiService
- **WHEN** ChatNotifier is disposed
- **THEN** AiService.dispose() SHALL be called

### Requirement: ChatNotifier exposes reactive state
ChatNotifier SHALL extend ChangeNotifier and call `notifyListeners()` after every state change.

#### Scenario: State change notification
- **WHEN** any state field (messages, isSending, isInitializing, error) changes
- **THEN** `notifyListeners()` SHALL be called exactly once per logical state transition

### Requirement: ChatMessage is an immutable value object
ChatMessage SHALL be an immutable class with role, text, and createdAt fields. It SHALL support JSON serialization/deserialization.

#### Scenario: JSON round-trip
- **WHEN** a ChatMessage is serialized to JSON and deserialized back
- **THEN** the resulting object SHALL have identical role, text, and createdAt values
