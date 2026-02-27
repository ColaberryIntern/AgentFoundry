# Directive: Testing Standards

**Version:** 1.0
**Last Updated:** 2026-02-26
**Owner:** Agent Foundry Team

---

## Goal

Ensure every piece of functionality in Agent Foundry is validated by automated tests before it reaches production. Tests are first-class citizens: they are written before implementation code and serve as the source of truth for expected behavior.

---

## Inputs

- Source code in `/services`, `/client`, `/execution`.
- This directive and the test-first mandate in `CLAUDE.md`.

---

## Core Principle: Test-First Development

The development cycle is:

1. **Write a failing test** that describes the expected behavior.
2. **Implement** the minimum code to make the test pass.
3. **Refactor** while keeping tests green.
4. **Repeat.**

No implementation code should be written without a corresponding test. If a bug is found, write a test that reproduces it before fixing it.

---

## Test Frameworks

| Layer                | Framework                | Location                             |
| -------------------- | ------------------------ | ------------------------------------ |
| Backend unit         | Jest                     | `services/<name>/tests/unit/`        |
| Backend integration  | Jest + Supertest         | `services/<name>/tests/integration/` |
| Frontend unit        | Vitest                   | `client/src/**/*.test.ts(x)`         |
| Frontend integration | Vitest + Testing Library | `client/src/**/*.test.ts(x)`         |
| End-to-end           | Playwright               | `tests/e2e/`                         |

---

## Coverage Targets

| Metric            | Target |
| ----------------- | ------ |
| Line coverage     | > 80%  |
| Branch coverage   | > 70%  |
| Function coverage | > 80%  |

Coverage is enforced in CI. A pull request that drops coverage below these thresholds must not be merged.

---

## Test Naming Convention

Use nested `describe` blocks with clear `it` statements:

```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a user with valid input', async () => {
      // ...
    });

    it('should throw VALIDATION_ERROR when email is missing', async () => {
      // ...
    });

    it('should throw CONFLICT when email already exists', async () => {
      // ...
    });
  });
});
```

Rules:

- Outer `describe`: service, component, or module name.
- Inner `describe`: method, endpoint, or feature name.
- `it` block: starts with `should` and describes the expected behavior in plain English.
- Each `it` block tests exactly one behavior.

---

## Test Structure (AAA Pattern)

Every test follows **Arrange, Act, Assert**:

```typescript
it('should return 404 when user does not exist', async () => {
  // Arrange
  const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

  // Act
  const response = await request(app).get(`/users/${nonExistentId}`);

  // Assert
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe('NOT_FOUND');
});
```

---

## What to Test

### Unit Tests

- Business logic in service classes.
- Utility functions and helpers.
- Input validation logic.
- Error mapping and transformation.
- State management reducers and selectors (frontend).

### Integration Tests

- API endpoint happy-path responses (correct status code, response shape).
- API endpoint error-path responses (400, 401, 403, 404, 409).
- Database queries through the ORM (use a test database or transactions that roll back).
- Message queue publishing and consuming (use test queues).

### End-to-End Tests

- Full user journeys: registration, login, dashboard interaction, logout.
- Cross-service flows: creating a resource in one service and verifying it appears in another.
- WebSocket connection and notification delivery.
- Error states visible to the user (form validation, permission denied screens).

---

## Mocking Strategy

- **Mock external services**, not internal logic. If `UserService` calls `NotificationService`, mock the notification client, not the user service internals.
- **Mock at the boundary.** Database calls are mocked in unit tests but real in integration tests (against a test database).
- **Never mock what you own** in integration tests. The point is to test real interactions.
- Use `jest.mock()` or `vi.mock()` for module-level mocks. Use dependency injection where possible to make mocking straightforward.

---

## Test Isolation

- Each test must be independent. No test should depend on the outcome of another.
- Use `beforeEach` to set up clean state. Use `afterEach` to tear down.
- Integration tests that touch the database must either:
  - Use transactions that roll back after each test, or
  - Truncate tables in `beforeEach`.
- Avoid shared mutable state between tests.

---

## CI Requirements

- All tests must pass before a pull request can be merged.
- Test runs must complete within 10 minutes for unit + integration, 20 minutes for E2E.
- Flaky tests must be fixed immediately. A test that fails intermittently is worse than no test.
- Coverage reports are generated on every CI run and posted to the pull request.

---

## Outputs

- A comprehensive test suite that validates all service behavior.
- Coverage reports meeting or exceeding the defined thresholds.
- Confidence that any change that breaks existing behavior is caught before merge.

---

## Edge Cases

- **Async operations:** Always `await` async calls in tests. Use `jest.useFakeTimers()` or `vi.useFakeTimers()` for time-dependent logic.
- **Environment differences:** Tests must not depend on a specific OS, timezone, or locale. Use deterministic dates and controlled inputs.
- **Large data sets:** Test with minimal data. Performance tests are separate from correctness tests.
- **Third-party API changes:** Mock external APIs. Add contract tests if a third-party integration is critical.

---

## Safety Constraints

- Tests must not call production endpoints or external paid services.
- Test databases must be isolated from development databases. Use a separate `DATABASE_URL` in the test environment.
- Secrets in test configuration must use placeholder values, never real credentials.

---

## Verification

- `npm run test` exits with code 0.
- `npm run test:coverage` shows all metrics above threshold.
- `npm run test:e2e` passes all Playwright specs.
- CI pipeline reports green status on all test jobs.
