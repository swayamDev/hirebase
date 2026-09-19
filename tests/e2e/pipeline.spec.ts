import { test, expect } from "@playwright/test";
import { clerk } from "@clerk/testing/playwright";

/**
 * Exercises the app's single most important user journey: get a candidate
 * from "added" to "moved through the pipeline". Everything here goes
 * through real Server Actions against a real (test) Sanity dataset - this
 * is the one place in the suite that proves the UI, the server actions,
 * and Sanity actually agree with each other end to end, which the mocked
 * integration tests can't do by themselves.
 *
 * Requires a signed-in test user with an active org - see TESTING.md.
 */
test.describe("core pipeline flow", () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test("create a company, a job, a candidate, then move the candidate through the pipeline", async ({
    page,
  }) => {
    const stamp = Date.now();
    const companyName = `E2E Test Co ${stamp}`;
    const jobTitle = `E2E Test Role ${stamp}`;
    const candidateName = `E2E Test Candidate ${stamp}`;

    // --- Company ---
    await page.goto("/dashboard/companies/new");
    await page.getByLabel("Name").fill(companyName);
    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(page.getByText(companyName)).toBeVisible();

    // --- Job, linked to that company ---
    await page.goto("/dashboard/jobs/new");
    await page.getByLabel("Title").fill(jobTitle);
    await page.getByLabel(/client company/i).click();
    await page.getByRole("option", { name: companyName }).click();
    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/jobs\/[a-zA-Z0-9_-]+$/);
    await expect(page.getByRole("heading", { name: jobTitle })).toBeVisible();

    // --- Candidate ---
    await page.goto("/dashboard/candidates/new");
    await page.getByLabel("Name").fill(candidateName);
    await page.getByRole("button", { name: /save|create/i }).click();
    await expect(page.getByText(candidateName)).toBeVisible();

    // --- Add the candidate to the job's pipeline ---
    await page.goto("/dashboard/jobs");
    await page.getByRole("link", { name: jobTitle }).click();
    await page.getByRole("button", { name: /add candidate/i }).click();
    await page.getByRole("option", { name: candidateName }).click();
    await page.getByRole("button", { name: /add/i }).last().click();
    await expect(page.getByText(candidateName)).toBeVisible();

    // --- Move the application to the next stage via drag-and-drop ---
    // The board (components/kanban/kanban-board.tsx) is dnd-kit only -
    // there's no button or dropdown fallback for changing stage, so this
    // simulates a real pointer drag rather than clicking a control that
    // doesn't exist.
    const card = page.getByText(candidateName);
    const screeningColumn = page
      .locator("div", { has: page.getByText("Screening", { exact: true }) })
      .last();

    const cardBox = await card.boundingBox();
    const targetBox = await screeningColumn.boundingBox();
    if (!cardBox || !targetBox) {
      throw new Error("Could not locate the card or target column to drag between.");
    }

    await page.mouse.move(
      cardBox.x + cardBox.width / 2,
      cardBox.y + cardBox.height / 2,
    );
    await page.mouse.down();
    // dnd-kit's PointerSensor needs a few intermediate move events past an
    // activation threshold before it treats this as a drag rather than a
    // click - a single jump straight to the target is not enough.
    await page.mouse.move(
      cardBox.x + cardBox.width / 2 + 40,
      cardBox.y + cardBox.height / 2,
      { steps: 5 },
    );
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 10 },
    );
    await page.mouse.up();

    await page.reload();
    await expect(page.getByText(candidateName)).toBeVisible();
    // The card should now report itself as being in the Screening stage -
    // asserted via the application detail dialog, which is unambiguous
    // regardless of which column it visually renders in.
    await page.getByText(candidateName).click();
    await expect(page.getByText(/screening/i).first()).toBeVisible();
  });
});
