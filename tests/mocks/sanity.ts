import { vi } from "vitest";

/**
 * A controllable stand-in for the next-sanity client. Every method is a
 * vi.fn() so tests can set return values (`fetch.mockResolvedValueOnce`,
 * etc.) and assert on call arguments. `.patch()` and its chain return an
 * object whose `.commit()` resolves by default - override per test with
 * `client.patch().commit.mockRejectedValueOnce(...)` where needed.
 */
export function createMockSanityClient() {
  const commit = vi.fn().mockResolvedValue({});
  const set = vi.fn(() => chainObj);
  const setIfMissing = vi.fn(() => chainObj);
  const inc = vi.fn(() => chainObj);
  const chainObj = { set, setIfMissing, inc, commit };
  const patch = vi.fn((_id: string) => chainObj);

  const client = {
    fetch: vi.fn(),
    create: vi.fn(),
    createOrReplace: vi.fn(),
    createIfNotExists: vi.fn(),
    patch,
    delete: vi.fn().mockResolvedValue({}),
    // exposed so tests can reach the chained fns directly if needed
    __chain: { commit, set, setIfMissing, inc, patch },
  };
  return client;
}

export type MockSanityClient = ReturnType<typeof createMockSanityClient>;
