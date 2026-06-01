## ADDED Requirements

### Requirement: AppProviders injects all Notifiers into the widget tree
AppProviders SHALL be a StatefulWidget that creates and provides all application-level Notifiers via InheritedNotifier wrappers at the top of the widget tree.

#### Scenario: All Notifiers available
- **WHEN** AppProviders is inserted above the app widget tree
- **THEN** ChatNotifier and ModelSelectionNotifier SHALL be accessible from any descendant widget via static `of(context)` methods

#### Scenario: Notifier disposal
- **WHEN** AppProviders is removed from the widget tree
- **THEN** all created Notifiers SHALL have their `dispose()` method called

### Requirement: InheritedNotifier wrappers provide type-safe access
Each Notifier SHALL have a corresponding InheritedNotifier wrapper that provides type-safe `of(context)` and `maybeOf(context)` static methods.

#### Scenario: Access ChatNotifier from descendant
- **WHEN** a descendant widget calls `ChatNotifierProvider.of(context)`
- **THEN** it SHALL return the nearest ChatNotifier instance

#### Scenario: Access ModelSelectionNotifier from descendant
- **WHEN** a descendant widget calls `ModelSelectionNotifierProvider.of(context)`
- **THEN** it SHALL return the nearest ModelSelectionNotifier instance

#### Scenario: Access without provider in tree
- **WHEN** `of(context)` is called but no corresponding provider exists in the widget tree
- **THEN** an assertion error SHALL be thrown in debug mode

### Requirement: AppProviders supports extension for future Notifiers
AppProviders SHALL be designed to allow adding new Notifiers (e.g., MemoryNotifier, PetNotifier) without modifying existing provider wrappers.

#### Scenario: Add new Notifier
- **WHEN** a new InheritedNotifier wrapper is created for a future mnemosyne feature
- **THEN** it SHALL be composable within AppProviders by wrapping it around the existing child widget

### Requirement: Widgets read state via providers, not constructor parameters
After migration, Widget classes SHALL NOT receive state or service instances via constructor parameters. All state access SHALL go through InheritedNotifier providers.

#### Scenario: PetAppShell reads ChatNotifier
- **WHEN** PetAppShell needs to send a message or read chat state
- **THEN** it SHALL obtain ChatNotifier via `ChatNotifierProvider.of(context)`, not via constructor injection

#### Scenario: AppEntry reads ModelSelectionNotifier
- **WHEN** AppEntry needs to check model selection state
- **THEN** it SHALL obtain ModelSelectionNotifier via `ModelSelectionNotifierProvider.of(context)`, not via constructor injection
