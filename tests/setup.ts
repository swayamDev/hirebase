import "@testing-library/jest-dom/vitest";

// lib/sanity/client.ts reads these at module load time. Tests never make a
// real network call (the client itself is always mocked - see
// tests/unit/mocks/sanity-client.ts), but the module still needs to import
// cleanly, so these just need to be non-empty strings.
process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ??= "test-project";
process.env.NEXT_PUBLIC_SANITY_DATASET ??= "test-dataset";
process.env.SANITY_API_READ_TOKEN ??= "test-read-token";
process.env.SANITY_API_WRITE_TOKEN ??= "test-write-token";
