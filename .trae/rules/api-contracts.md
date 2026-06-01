# API & Service Contract Constraints

> Applied when modifying service interfaces, LLM integration, or cross-module APIs.
> Globs: **/*service*.dart, **/*repository*.dart, **/llm/**/*.dart, **/api/**/*.dart

## Service Interface Rules

### 1. Interface Segregation

Each service MUST define a clear interface (abstract class in Dart):
- Service consumers depend on the interface, not the implementation
- Interfaces live in `domain/repositories/` or feature barrel files
- Implementations live in `data/repositories/` or `services/`

### 2. Error Types as Return Values

- Use `Result<T, E>` or `Either<E, T>` patterns for expected failures
- Reserve exceptions for truly unexpected/unrecoverable failures
- NEVER silently swallow errors
- Service methods MUST declare possible failure modes in their return type

### 3. LLM Service Contracts

The LLM integration layer (`features/social/llm/`) MUST:
- Define abstract `LlmService` interface
- Support both local (llamadart) and remote (API) backends
- Validate all LLM responses before processing
- Handle timeouts and fallbacks gracefully
- Never expose raw prompt templates outside the service boundary

### 4. Cross-Feature Communication

When feature A needs data from feature B:
```
VIOLATION:  MemoryService directly accesses PetService._state
COMPLIANT:  MemoryService depends on IPetRepository interface
```

### 5. Idempotent Operations

State-changing operations MUST be idempotent when possible:
- Memory extraction: same input → same extracted insights
- Xiang capture: same trigger → same capture result
- Pet state transitions: same event → same resulting state
