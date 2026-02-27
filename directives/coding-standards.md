# Directive: Coding Standards

**Version:** 1.0
**Last Updated:** 2026-02-26
**Owner:** Agent Foundry Team

---

## Goal

Establish consistent, maintainable, and secure coding practices across the entire Agent Foundry codebase so that any developer or AI agent can read, modify, and extend the system with confidence.

---

## Inputs

- TypeScript source files in `/services`, `/client`, `/execution`, and `/tests`.
- This directive and the rules defined in `CLAUDE.md`.

---

## Language and Runtime

- **Language:** TypeScript in strict mode (`"strict": true` in every `tsconfig.json`).
- **Runtime:** Node.js 20+ for backend services. Vite + React for the client.
- **Module system:** ES Modules (`"type": "module"` in `package.json`). Use `import`/`export`, not `require`.

---

## Backend Standards

### Framework

- Express.js for HTTP services.
- Each service follows the structure:

```
services/<service-name>/
  src/
    index.ts          # entry point, server bootstrap
    routes/           # Express route definitions
    controllers/      # request handling, delegates to services
    services/         # business logic
    models/           # Sequelize model definitions
    middleware/       # auth, validation, error handling
    utils/            # shared helpers
    types/            # TypeScript interfaces and types
  tests/
    unit/
    integration/
  package.json
  tsconfig.json
  .env.example
```

### ORM

- Sequelize with TypeScript model definitions.
- Migrations are required for every schema change. No `sync({ force: true })` outside of test fixtures.

### Error Responses

All API errors must follow this structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description of the problem.",
    "details": []
  }
}
```

Standard error codes:

| HTTP Status | Code               | When to Use                          |
| ----------- | ------------------ | ------------------------------------ |
| 400         | `VALIDATION_ERROR` | Invalid input                        |
| 401         | `UNAUTHORIZED`     | Missing or invalid credentials       |
| 403         | `FORBIDDEN`        | Valid credentials, insufficient role |
| 404         | `NOT_FOUND`        | Resource does not exist              |
| 409         | `CONFLICT`         | Duplicate resource or state conflict |
| 500         | `INTERNAL_ERROR`   | Unhandled server error               |

### Middleware

- **Error handling:** Centralized error-handling middleware at the end of the middleware chain. Individual routes must not send raw error responses.
- **Validation:** Use `express-validator` for request validation. Validate in route definitions or dedicated validation middleware, not in controllers.
- **Authentication:** JWT-based. Middleware extracts and verifies the token, attaches the user to `req.user`.

---

## Frontend Standards

### Framework

- React 18+ with functional components only. No class components.
- State management: Redux Toolkit (`@reduxjs/toolkit`).
- Styling: Tailwind CSS. No inline styles except for truly dynamic values.
- Routing: React Router v6.

### Component Structure

```
client/src/
  components/        # reusable UI components
  features/          # feature-specific slices (Redux Toolkit pattern)
  pages/             # route-level page components
  hooks/             # custom React hooks
  services/          # API client functions
  utils/             # helpers
  types/             # shared TypeScript types
```

### Component Rules

- One component per file.
- Co-locate component-specific types in the same file or a sibling `types.ts`.
- Props must be typed with an explicit interface (e.g., `interface UserCardProps`).
- Use `React.FC` sparingly; prefer typed function declarations.

---

## Naming Conventions

| Element                      | Convention   | Example                     |
| ---------------------------- | ------------ | --------------------------- |
| Variables and functions      | camelCase    | `getUserById`, `isActive`   |
| React components             | PascalCase   | `UserCard`, `DashboardPage` |
| Classes and types/interfaces | PascalCase   | `ComplianceRule`, `UserDto` |
| Service file names           | kebab-case   | `user-service.ts`           |
| React component file names   | PascalCase   | `UserCard.tsx`              |
| Test files                   | match source | `user-service.test.ts`      |
| Environment variables        | UPPER_SNAKE  | `DATABASE_URL`              |
| Database tables              | snake_case   | `compliance_rules`          |
| Database columns             | snake_case   | `created_at`                |

---

## Error Handling

- Never swallow errors silently. Every `catch` block must log or rethrow.
- Use structured logging (e.g., `pino` or `winston`) with consistent fields: `level`, `message`, `service`, `timestamp`, `requestId`.
- Controllers catch service-layer errors and map them to the standard error response format.
- Unhandled promise rejections and uncaught exceptions must be caught at the process level, logged, and result in a graceful shutdown.

---

## Security

- **No secrets in code.** All secrets come from environment variables.
- **Parameterized queries.** Sequelize handles this by default. Never concatenate user input into raw SQL.
- **Input validation.** Validate and sanitize every external input with `express-validator`.
- **XSS prevention.** Sanitize HTML output. React's JSX escaping handles most cases; avoid `dangerouslySetInnerHTML`.
- **CORS.** Configured per service, restricted to known origins.
- **Rate limiting.** Applied at the API Gateway level.
- **Dependency auditing.** Run `npm audit` regularly. No known high-severity vulnerabilities in production.

---

## Tests

- **Test-first development** as mandated by `CLAUDE.md`: write failing tests before implementation.
- See `directives/testing-standards.md` for full testing requirements.

---

## Outputs

- Clean, type-safe TypeScript code.
- Consistent project structure across all services.
- Standardized error responses consumable by the client.
- A codebase that a junior developer can navigate and understand.

---

## Edge Cases

- **Shared types across services:** Place them in a shared `packages/types` directory if needed. Do not duplicate type definitions.
- **Circular dependencies:** If detected by the compiler, refactor into a shared module or invert the dependency.
- **Legacy patterns:** If existing code does not follow these standards, refactor it when modifying the file. Do not leave new code in non-compliant form.

---

## Verification

- `npm run lint` passes with zero errors.
- `npm run build` compiles without TypeScript errors.
- `npm run test` passes with target coverage met.
- Code review confirms adherence to naming, structure, and error-handling standards.
