# Architecture Constraints

> This rule is ALWAYS applied. Enforces architectural boundaries for the idea-turbo monorepo.

## Module Dependency Graph

```
flutter_demo/ (Presentation)
    ↓ depends on
packages/mnemosyne/ (Domain + Application)
    ↓ depends on
packages/edgevec/ (Infrastructure - vector search)
```

## Mandatory Rules

### 1. Dependency Direction

- `flutter_demo/` MAY import from `packages/mnemosyne/`
- `packages/mnemosyne/` MUST NOT import from `flutter_demo/`
- `packages/mnemosyne/lib/features/{module}/domain/` has ZERO external dependencies
- Cross-feature communication in mnemosyne MUST go through defined interfaces in `lib/features/{module}/domain/repositories/`

### 2. Feature Module Boundaries (mnemosyne)

Each feature under `packages/mnemosyne/lib/features/` MUST be self-contained:
- `memory/` — emotional memory CRUD, extraction, retrieval, decay
- `pet/` — pet state machine, vitality, solo play, emotional gating
- `xiang/` — recall triggers, capture, decay, profile
- `social/` — NPC pool, LBS routing, safety, proxy, reports
- `commerce/` — subscription, virtual goods, payment

Direct imports between features are PROHIBITED. Use:
- Domain interfaces (`domain/repositories/`)
- Event-based propagation
- Service locator / dependency injection

### 3. DDD Layering Within Features

```
features/{module}/
├── domain/          # Entities, value objects, repository interfaces, use cases
│   ├── entities/    # NO external imports
│   ├── repositories/  # Abstract interfaces only
│   └── usecases/    # Business logic, depends only on domain
├── data/            # Repository implementations, data sources, models
│   ├── datasources/
│   ├── models/      # Data transfer objects
│   └── repositories/  # Implements domain interfaces
└── {module}.dart    # Barrel export
```

### 4. Architecture Decision Records

Any change affecting 2+ features MUST be documented as an ADR in the change's OpenSpec `design.md` with:
- Context: Why this decision is needed
- Decision: What was chosen
- Consequences: Trade-offs and implications
- Alternatives: What was considered and rejected
