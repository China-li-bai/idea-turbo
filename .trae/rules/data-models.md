# Data Model Constraints

> Applied when modifying data models, entities, or storage-related code.
> Globs: **/*entity*.dart, **/*model*.dart, **/*datasource*.dart, **/*repository*.dart

## Single Source of Truth (SSOT)

Each data concept has exactly ONE authoritative source:

| Concept | SSOT Location | Type |
|---------|--------------|------|
| Memory items | `ObjectBox` via `ObjectBoxMemoryDataSource` | Local DB |
| Memory vectors | `edgevec` via `EmbeddingService` | Vector index |
| Pet state | `PetLocalDataSource` → `PetRepositoryImpl` | Local DB |
| Xiang profiles | `XiangConfig` + `XiangProfile` | Config + Local |
| NPC entities | `NpcPoolService` | In-memory pool |

All other references are derived views or cached projections.

## Data Flow Rules

1. **Unidirectional**: Intent → Action → State → View
2. **No direct mutation**: UI MUST NOT directly modify state objects
3. **Event propagation**: Cross-module state changes MUST use event bus or observer pattern
4. **Local-first**: Local state is primary; remote sync is secondary and incremental

## Schema-First for New Models

When adding a new data model:
1. Define the entity in `domain/entities/` FIRST
2. Define the repository interface in `domain/repositories/`
3. Implement the data model (DTO) in `data/models/`
4. Implement the data source in `data/datasources/`
5. Implement the repository in `data/repositories/`

NEVER implement bottom-up (data source → entity).

## Immutable Data

- Entity fields SHOULD be `final`
- Use `copyWith()` pattern for modifications
- NEVER directly mutate shared state objects

## Boundary Validation

- Data crossing feature boundaries MUST be validated against the target's schema
- API responses MUST be validated before use (no raw Map<String, dynamic>)
- Use typed models at all boundaries
