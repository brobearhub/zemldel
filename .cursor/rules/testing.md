---
description: Enforce unified testing architecture for NestJS using Vitest
alwaysApply: true
---

# 🧪 Testing Architecture Rule (NestJS)

## 🎯 Goal

All testing in the project must follow a unified, scalable, and production-ready architecture.

The testing system must be:

- deterministic
- isolated
- fast
- aligned with backend architecture (NestJS + TypeScript)

---

# 🧩 Testing Stack (MANDATORY)

The project uses the following testing stack:

- Test runner: :contentReference[oaicite:0]{index=0}
- HTTP testing: :contentReference[oaicite:1]{index=1}
- NestJS testing utilities: :contentReference[oaicite:2]{index=2}

---

# 📦 Allowed Libraries (STRICT)

Only the following libraries are allowed for testing:

## Core

- vitest
- @vitest/ui (optional)
- supertest
- @nestjs/testing

## Utilities

- ts-node (for runtime TS support)

---

# 🚫 Forbidden Libraries

Do NOT use:

- jest
- ts-jest
- @types/jest
- mocha
- chai
- sinon
- any Jest-based plugins

---

# 📁 Test Structure

Tests must follow this structure:

src/
  modules/
    <module>/
      __tests__/
        *.service.spec.ts        # unit tests
        *.integration.spec.ts    # integration tests

test/
  e2e/
    *.e2e-spec.ts               # end-to-end tests

---

# 🧪 Test Types

## 1. Unit Tests

- test pure business logic
- no NestJS module required
- no database
- no HTTP layer

---

## 2. Integration Tests

- must use @nestjs/testing
- test module wiring and dependency injection

Rules:

- avoid mocking internal logic
- mock only external services (APIs, queues, etc.)

---

## 3. E2E Tests

- must use real NestJS application instance
- must use Supertest for HTTP calls

---

# 🚫 Mocking Rules

Allowed:

- external APIs
- third-party services

Forbidden:

- mocking internal business logic
- mocking core domain services

---

# ⚙️ Configuration Rules

Vitest config must include:

- environment: node
- globals: true

---

# 🗄️ Database Strategy (PLANNED)

The project is designed to support database testing, but it is NOT implemented yet.

Future approach:

- Database: PostgreSQL (test environment)
- Optional: :contentReference[oaicite:3]{index=3} for isolated DB per test run

Current rules:

- do NOT implement database testing yet
- do NOT mock database layer incorrectly
- write tests in a way that can be extended to real DB later

---

# 🧠 Design Principles

- tests must be readable and minimal
- avoid over-testing
- prioritize business logic and edge cases
- tests must not depend on execution order

---

# ⚡ Scripts Convention

Expected scripts:

- test
- test:unit
- test:e2e
- test:ui

---

# ❗ Critical Rules

- Do NOT introduce Jest in any form
- Do NOT use deprecated dependencies
- Do NOT break test isolation
- Do NOT couple tests with implementation details

---

# 🧩 Future Evolution

The testing system must be ready to evolve into:

- DB-backed tests (PostgreSQL)
- containerized test environments
- parallel test execution
- multi-tenant testing scenarios
