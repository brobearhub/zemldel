# ENGINEERING RULES

## PURPOSE

Define coding standards, development philosophy, and quality expectations.

This file ensures consistent, maintainable, and production-ready code.

---

# GENERAL PRINCIPLES

* Prefer simplicity over cleverness
* Write code for humans, not machines
* Avoid premature optimization
* Optimize for readability and maintainability

---

# CODE STYLE

* Use clear and descriptive naming
* Avoid abbreviations unless obvious
* Functions should do one thing
* Keep functions small

---

# FILE STRUCTURE

* One responsibility per file
* Avoid large files (>300–400 lines)
* Split logic when complexity grows

---

# NAMING

Use consistent naming:

* variables → camelCase
* components → PascalCase
* files → kebab-case or consistent convention

---

# FUNCTIONS

Rules:

* small and focused
* no hidden side effects
* explicit inputs and outputs

Avoid:

* large multi-purpose functions
* deeply nested logic

---

# TYPES & SAFETY

* always use types
* avoid `any`
* prefer explicit typing over implicit

---

# ERROR HANDLING

* always handle errors
* never ignore failures
* provide meaningful error messages

---

# REUSABILITY

* extract reusable logic
* avoid duplication
* prefer composition over inheritance

---

# STATE MANAGEMENT

* keep state minimal
* avoid global state unless necessary
* colocate state when possible

---

# SIDE EFFECTS

* isolate side effects
* do not mix pure logic with effects

---

# PERFORMANCE

* avoid unnecessary renders
* memoize when needed
* do not over-optimize early

---

# TESTABILITY

* write code that is easy to test
* avoid hidden dependencies
* keep logic deterministic

---

# CODE SMELLS (AVOID)

* large components
* duplicated logic
* unclear naming
* magic numbers
* deeply nested conditions

---

# MVP MINDSET

* deliver working solution first
* iterate after
* avoid overengineering

---

# WHEN UNSURE

→ choose simplest solution
→ prioritize readability
→ follow architecture rules

---

# FINAL PRINCIPLE

Code should feel:

* clean
* predictable
* easy to change

NOT:

* complex
* fragile
* over-engineered
