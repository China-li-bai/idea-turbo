# Software Engineering Global Rules

> Language-agnostic, framework-independent rules for AI-assisted programming.
> Based on DDD, CQRS, Event Sourcing, Schema-first, Local-first, Effect-TS principles.
> Copy this file to any project's `.trae/rules/` directory to enforce.

---

## 1. Architecture Design

### ARCH-01: Dependency Direction MUST Point Inward

Layers: Presentation → Application → Domain → Infrastructure.
Dependencies only flow toward inner layers. Domain layer has zero external dependencies.

```
VIOLATION:  Domain imports a UI widget or HTTP client
COMPLIANT:  Domain defines an interface; Infrastructure implements it
```

### ARCH-02: Module Boundaries MUST Be Enforced by Interfaces

Cross-module communication MUST go through explicitly defined interfaces/protocols.
Direct imports of another module's internal implementation are PROHIBITED.

```
VIOLATION:  OrderService directly accesses PaymentService._stripeClient
COMPLIANT:  OrderService depends on IPaymentGateway interface
```

### ARCH-03: Each Module MUST Have a Single Reason to Change

A module that handles both business logic and data formatting violates SRP.
Split by responsibility; compose via dependency injection.

### ARCH-04: Architecture Decisions MUST Be Documented

Any decision that affects 2+ modules or is non-trivially reversible MUST be recorded as an ADR
(Architecture Decision Record) with: Context, Decision, Consequences, Alternatives Considered.

### ARCH-05: Feature Modules MUST Be Self-Contained

A feature module MUST own its domain logic, data access, and UI.
Shared code goes into explicitly designated shared/common modules.
Circular dependencies between feature modules are PROHIBITED.

---

## 2. Data Management

### DATA-01: Single Source of Truth (SSOT) — MANDATORY

Every entity/concept in the system MUST have exactly ONE authoritative data source.
All other references are derived views or cached projections.

```
VIOLATION:  User profile stored in both localStorage and a global state object, updated independently
COMPLIANT:  UserProfileRepository is the sole source; UI reads from it via reactive streams
```

### DATA-02: Unidirectional Data Flow

Data flows in one direction: Intent → Action → State → View.
View MUST NOT directly mutate State. State changes MUST go through defined actions/events.

```
VIOLATION:  Widget directly modifies a global variable: globalCounter++
COMPLIANT:  Widget dispatches IncrementEvent; store handles event; widget observes state
```

### DATA-03: CQRS — Separate Read and Write Paths

Commands (writes) and Queries (reads) SHOULD use different models when complexity warrants it.
Write models optimize for business invariant enforcement.
Read models optimize for query performance.

### DATA-04: State Changes MUST Propagate via Events

When one module's state change affects another, propagation MUST happen through an event bus,
callback, or observer pattern — NEVER through direct method calls on the dependent module.

```
VIOLATION:  AuthService directly calls NotificationService.sendWelcome()
COMPLIANT:  AuthService emits UserLoggedIn event; NotificationService subscribes to it
```

### DATA-05: Local-First — Prefer Local Storage, Sync Incrementally

Design for offline-first operation. Local state is primary; remote sync is secondary.
Sync operations MUST be incremental and conflict-resolvable (version vectors, timestamps, or CRDTs).

### DATA-06: No Stale Data — Cache Invalidation Is Mandatory

Every cache MUST have an invalidation strategy: TTL, event-driven, or version-based.
A cache without invalidation is a bug waiting to happen.

---

## 3. Data Consistency

### CONSIST-01: Schema-First Design

Data models MUST be defined before business logic that operates on them.
Schema is the contract; code is the implementation.

```
VIOLATION:  Building API endpoints first, then retroactively defining data shapes
COMPLIANT:  Define Zod/Freezed/Protobuf/OpenAPI schema → generate types → implement logic
```

### CONSIST-02: Boundary Validation — Data Crossing Boundaries MUST Be Validated

When data crosses a module boundary, API boundary, or process boundary, it MUST be validated
against the target's schema. Trust nothing from outside your boundary.

```
VIOLATION:  API response used directly without validation
COMPLIANT:  API response validated against Zod/Freezed schema before use
```

### CONSIST-03: Immutable Data by Default

Data structures SHOULD be immutable. Use copyWith/clone patterns for modifications.
Mutable shared state is the #1 source of data inconsistency bugs.

```
VIOLATION:  user.name = "new name" (direct mutation of shared object)
COMPLIANT:  final updated = user.copyWith(name: "new name")
```

### CONSIST-04: Idempotent State Mutations

State-changing operations MUST be idempotent when possible.
Applying the same operation twice MUST produce the same result.

```
VIOLATION:  POST /transfer without idempotency key → double charge on retry
COMPLIANT:  POST /transfer with idempotency key → safe to retry
```

### CONSIST-05: Optimistic Concurrency Control

When concurrent modifications are possible, use version numbers, timestamps,
or ETags to detect conflicts. Last-write-wins is PROHIBITED for critical data.

```
VIOLATION:  UPDATE users SET name='X' WHERE id=1 (no version check)
COMPLIANT:  UPDATE users SET name='X', version=version+1 WHERE id=1 AND version=5
```

### CONSIST-06: No Silent Data Loss

Operations that could lose data (overwrites, deletes, merges) MUST log what was lost
or require explicit confirmation. Silent data loss is a critical bug.

---

## 4. Data Structure & Type Safety

### TYPE-01: No Type Escapes

`any`, `dynamic`, `unknown` (without narrowing), `Object` (without casting) are PROHIBITED
except at system boundaries (JSON parse, API responses) where they MUST be immediately narrowed
via schema validation.

```
VIOLATION:  Map<String, dynamic> userData = jsonDecode(response)
COMPLIANT:  final userData = UserSchema.parse(jsonDecode(response))
```

### TYPE-02: Distinguish Value Objects from Entities

Value Objects: compared by value (e.g., Money, Email, DateRange).
Entities: compared by identity (e.g., UserId, OrderId).
NEVER compare entities by their fields; always use the identity field.

### TYPE-03: Enums Over Magic Strings

Finite sets of values MUST be represented as enums, not string literals.
If the set is open-ended, use a branded type / newtype pattern.

```
VIOLATION:  status = "active" / "inactive" / "pending"
COMPLIANT:  enum Status { active, inactive, pending }
```

### TYPE-04: Explicit Optionality

Optional/nullable values MUST be explicitly declared. Implicit optionality is PROHIBITED.
Use Optional<T>, T?, or union types — never rely on null as a "maybe" sentinel.

### TYPE-05: Errors Are Types, Not Control Flow

Errors MUST be represented as types in the return signature (Result<T, E>, Either<E, T>),
not thrown as exceptions for expected failure cases.
Exceptions are reserved for truly unexpected/unrecoverable failures.

```
VIOLATION:  throw new ValidationError("email invalid")
COMPLIANT:  return Result.err(new ValidationError("email invalid"))
```

### TYPE-06: Branded Types for Domain Primitives

Domain primitives (UserId, OrderId, Email) SHOULD be branded/opaque types,
not raw strings/numbers. This prevents mixing up parameters at compile time.

```
VIOLATION:  void sendEmail(String userId, String email) → sendEmail("a@b.com", "user-1") // swapped!
COMPLIANT:  void sendEmail(UserId userId, Email email) → compile error if swapped
```

---

## 5. AI Programming Workflow

### WORK-01: Plan Before Code

Any feature touching 2+ files or involving state changes MUST have a written plan before implementation.
The plan MUST specify: affected modules, data flow, schema changes, rollback strategy.

### WORK-02: Architecture Reasoning for Cross-Module Changes

When a change affects 2+ modules, invoke architecture reasoning (dev-philosopher skill or equivalent)
before writing code. Document the reasoning in the commit message or ADR.

### WORK-03: Data Flow Audit for State Changes

When modifying state management code, audit the full data flow:
1. Where is the SSOT for this data? (DATA-01)
2. Is the data flow unidirectional? (DATA-02)
3. Are boundary validations in place? (CONSIST-02)
4. Is the mutation idempotent? (CONSIST-04)

### WORK-04: Incremental Modification Only

NEVER delete and rewrite large sections of code. Always modify incrementally.
If a rewrite is necessary, do it as a series of small, individually verifiable steps.

### WORK-05: Verification Closure

Every code change MUST have a corresponding verification method:
- Type check (compile-time)
- Unit test (behavior)
- Integration test (cross-module)
- Manual test (UI/UX)

At minimum, type check + unit test MUST pass before considering a change complete.

### WORK-06: No Speculative Code

Do not add code "just in case" or "we might need this later."
Every line of code MUST serve a current, documented requirement.
YAGNI (You Aren't Gonna Need It) is the default stance.

### WORK-07: Dependency Introduction Requires Justification

Adding a new dependency MUST include: what problem it solves, why existing solutions are insufficient,
bundle size impact, and maintenance status. Prefer stdlib/platform APIs over third-party packages.

---

## 6. Prohibited Patterns

These patterns are PROHIBITED in all projects using this ruleset:

| Pattern | Why | Instead |
|---------|-----|---------|
| Global mutable state | Unpredictable, untraceable | Dependency injection + reactive streams |
| God objects / God classes | Violates SRP, resists change | Decompose by responsibility |
| Stringly-typed identifiers | No compile-time safety | Branded types / newtypes |
| Silent error swallowing | Hides bugs | Explicit error types + logging |
| Copy-paste across modules | Divergence over time | Extract to shared module |
| Direct DB access from UI | Couples view to storage | Repository pattern |
| Hardcoded secrets | Security vulnerability | Environment variables / secret manager |
| Untyped API responses | Runtime crashes | Schema validation at boundary |

---

## Quick Reference: Rule Priority

```
MUST     = Non-negotiable. Violation is a bug.
SHOULD   = Strongly recommended. Deviation requires documented justification.
MAY      = Optional. Use judgment.
PROHIBITED = Never do this. No exceptions.
```

---

## Integration with Trae IDE Skills

When working in Trae, map these rules to skills:

| Rule Category | Relevant Skill | When to Invoke |
|---------------|---------------|----------------|
| Architecture | dev-philosopher | Before cross-module changes |
| Planning | writing-plans | Before any feature implementation |
| Implementation | coding-agent | During structured implementation |
| Data Architecture | unified-data-architecture | When data inconsistency detected |
| Local-first Data | data-center-architecture | When designing data layer |
| Database | Prisma / supabase-postgres-best-practices | When working with databases |
| Fullstack | fullstack-dev | When building web apps end-to-end |
