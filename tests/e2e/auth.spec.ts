import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

test.describe("authentication", () => {
  test("an unauthenticated visitor is redirected away from the dashboard", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("a signed-in user with an active org can sign in and reach the dashboard", async ({
    page,
  }) => {
    const email = process.env.E2E_CLERK_USER_EMAIL;
    const password = process.env.E2E_CLERK_USER_PASSWORD;
    test.skip(
      !email || !password,
      "Set E2E_CLERK_USER_EMAIL / E2E_CLERK_USER_PASSWORD to run this test - see TESTING.md",
    );

    await page.goto("/");
    await clerk.signIn({
      page,
      signInParams: { strategy: "password", identifier: email!, password: password! },
    });
    await page.goto("/dashboard");

    // Either the dashboard itself, or onboarding if this test user has no
    // org yet - both are valid signed-in states, unlike the redirect-to
    // sign-in above.
    await expect(page).toHaveURL(/\/dashboard|\/onboarding/);
  });

  test("signing out returns the dashboard to the sign-in redirect", async ({
    page,
  }) => {
    const email = process.env.E2E_CLERK_USER_EMAIL;
    const password = process.env.E2E_CLERK_USER_PASSWORD;
    test.skip(!email || !password, "Requires E2E_CLERK_USER_EMAIL / PASSWORD");

    await page.goto("/");
    await clerk.signIn({
      page,
      signInParams: { strategy: "password", identifier: email!, password: password! },
    });
    await clerk.signOut({ page });
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
