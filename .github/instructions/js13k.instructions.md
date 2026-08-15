---
description: JS13K Game Development Instructions for AI
name: JS13K Game Development
---

This file defines hard rules and project-specific conventions for AI-generated code in this repository.

## Purpose

- Enforce JS13K-friendly code style and decisions.
- Keep generated code small, zip-friendly, and compatible with the existing `esbuild` production pipeline.
- Avoid common web game patterns that are too large or inappropriate for a 13KB zipped bundle.

## Scope

- Apply to all source code and game assets in this repository, especially `src/**/*`, `index.html`, and `src/index.css`.
- Apply to generated code, edits, answers, refactors, and review feedback.
- Rules that specifically target production output, such as removing dead code, unused variables, comments, and debug-only branches, apply only to shipped or generated production code, not to explanatory answers or review feedback.

## Hard Rules

1. Bundle size is the top priority.
    - Do not add new runtime dependencies or any libraries.
    - Prefer plain code and built-in browser APIs over abstractions.
    - Avoid classes, helper libraries, and utility packages unless the abstraction is called in 3 or more distinct locations and saves more bytes than it adds.
2. Favor zip-friendly data formats.
    - Use raw numeric arrays, typed arrays, or compact strings instead of verbose JSON objects.
    - Prefer repeated numbers and simple ASCII text; they compress much better than encoded blobs.
    - Avoid base64, hex encoding, or other encodings that inflate size and compress poorly.
    - Keep asset data in formats that work well with standard zip compression.
3. Avoid unnecessary code and metadata.
    - Remove dead code, unused variables, comments, and debug-only branches in production output.
    - Do not emit extra bootstrap or helper functions unless strictly needed.
    - Keep functions small and direct; avoid over-abstraction.
4. Use efficient code patterns for JS13K.
    - Prefer array-based data packing over object-heavy structures when representing meshes, levels, or animation data.
    - Use concise syntax, local variable reuse, and simple loops instead of heavy abstractions.
    - Do not use JSON parsing or string decoding for game data unless it is smaller after compression than the equivalent raw code. When compression outcome is unknown, prefer raw numeric arrays over JSON parsing.
5. Keep asset and HTML output minimal.
    - Use a single bundled script and minimal CSS.
    - Avoid large inline data URIs in HTML or CSS unless they are demonstrably smaller after zipping.
    - Do not include unused assets or markup.
6. Keep the build pipeline compatible.
    - Generated code must work with the existing `scripts/build.ts` and `esbuild` setup.
    - Do not depend on node-only modules in browser runtime code.

## Principles

- Small byte size > readability for production code in this repo.
- If a choice increases runtime size, reject it unless the gain is compelling.
- If data is dense and repetitive, keep it in raw numeric form rather than compressed strings.
- Prefer explicit, low-overhead code over indirection.
- Treat PlayCanvas and external imports as expensive; avoid them when a simpler browser-native implementation is sufficient.

## Guidance for AI

- When asked to generate or refactor game code, choose the smallest workable implementation.
- When asked to add content, choose formats that compress well and reduce bundle weight.
- When asked to review code, flag anything that adds size without a strong functional need.
- Ask clarifying questions if a requested feature conflicts with size constraints or the JS13K nature of the project.
- If the user explicitly requests something that violates a hard rule (e.g., adding a library or using base64), refuse the specific violation, explain why it conflicts with JS13K constraints, and offer the nearest compliant alternative.
