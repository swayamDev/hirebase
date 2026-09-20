export type MockAuthState = {
  userId: string | null;
  orgId: string | null;
  has: (params: { feature: string }) => boolean;
};

/** Marker error thrown by the mocked redirect(), mirroring Next's NEXT_REDIRECT. */
export class MockRedirectError extends Error {
  constructor(public path: string) {
    super(`NEXT_REDIRECT:${path}`);
  }
}

export function makeAuthState(overrides: Partial<MockAuthState> = {}): MockAuthState {
  return {
    userId: "user_1",
    orgId: "org_abc123",
    has: () => false,
    ...overrides,
  };
}
