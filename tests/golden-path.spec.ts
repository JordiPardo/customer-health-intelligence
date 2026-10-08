import { test, expect } from "@playwright/test";

/**
 * End-to-end demo journey — the path shown in interviews and README.
 * Requires a running app with seeded Supabase data (local dev + .env.local,
 * or set PLAYWRIGHT_BASE_URL to your production demo URL in CI).
 */
test.describe("golden path", () => {
  test.describe.configure({ mode: "serial" });

  test("demo: portfolio health → account → playbooks → experiments", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    // 1. Portfolio health (predict + quantify risk)
    await page.goto("/demo/dashboard");
    await expect(page).toHaveURL(/\/demo\/dashboard$/);
    await expect(page.getByText("Demo mode")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(
      page.getByText("How healthy is my portfolio?"),
    ).toBeVisible();
    await expect(page.getByText("Portfolio health")).toBeVisible();
    await expect(page.getByText(/Expected MRR at risk/i).first()).toBeVisible();

    // 2. Triage — which accounts need attention
    await page.getByRole("link", { name: "Customers", exact: true }).click();
    await expect(page).toHaveURL(/\/demo\/customers$/);
    await expect(
      page.getByText("Which accounts need attention right now?"),
    ).toBeVisible();
    await expect(page.getByText(/Expected MRR at risk/i).first()).toBeVisible();

    const firstCustomer = page.locator("table tbody tr").first().getByRole("link");
    await expect(firstCustomer).toBeVisible();
    const customerName = (await firstCustomer.textContent())?.trim();
    expect(customerName).toBeTruthy();

    // 3. Account decision — why at risk + AI Copilot
    await firstCustomer.click();
    await expect(page).toHaveURL(/\/demo\/customers\/[^/]+$/);
    await expect(
      page.getByRole("heading", { name: customerName! }),
    ).toBeVisible();
    await expect(
      page.getByText("Why is this account at risk — and what should you do about it?"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI Copilot" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Generate brief" }),
    ).toBeVisible();
    await expect(page.getByText("Account health")).toBeVisible();

    // 4. Playbooks — what interventions work
    await page.getByRole("link", { name: "Playbooks", exact: true }).click();
    await expect(page).toHaveURL(/\/demo\/playbooks$/);
    await expect(
      page.getByText("Which interventions actually reduce churn?"),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: /All estimates/i })).toBeVisible();

    // 5. Experiments — proven impact
    await page.getByRole("link", { name: "Experiments", exact: true }).click();
    await expect(page).toHaveURL(/\/demo\/experiments$/);
    await expect(
      page.getByText("Which actions have proven, measurable impact?"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /Completed|Running/i }).first(),
    ).toBeVisible();

    // 6. Experiment detail — validation drill-down
    const experimentLink = page
      .locator('main a[href^="/demo/experiments/"]')
      .first();
    await expect(experimentLink).toBeVisible();
    await experimentLink.click();
    await expect(page).toHaveURL(/\/demo\/experiments\/[^/]+$/);
    await expect(page.getByText("Experiment result")).toBeVisible();
  });
});
