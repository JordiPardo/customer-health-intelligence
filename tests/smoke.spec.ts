import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("landing page loads with primary CTAs", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", {
        name: /predict which customers will churn/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View demo" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Start free trial" }).first(),
    ).toBeVisible();
  });

  test("public demo dashboard loads without login", async ({ page }) => {
    await page.goto("/demo/dashboard");

    await expect(page).toHaveURL(/\/demo\/dashboard$/);
    await expect(page.getByText("Demo mode")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Demo workspace")).toBeVisible();
  });

  test("login page shows sign-in form and demo escape hatch", async ({
    page,
  }) => {
    await page.goto("/login");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "View demo without signing in" }),
    ).toBeVisible();
  });

  test("methodology case study page loads", async ({ page }) => {
    await page.goto("/methodology");

    await expect(page).toHaveURL(/\/methodology$/);
    await expect(
      page.getByRole("heading", {
        name: /how this demo models customer retention/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View live demo" })).toBeVisible();
  });
});
