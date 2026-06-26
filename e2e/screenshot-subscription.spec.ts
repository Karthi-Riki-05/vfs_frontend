import { test } from "@playwright/test";
import path from "path";

test("screenshot subscription page", async ({ page }) => {
  // Fresh login via NextAuth credentials flow
  const csrfRes = await page.request.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();
  await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: "prouser@valueflowtest.com",
      password: "Test@1234",
      json: "true",
    },
  });

  const cases = [
    {
      url: "/subscription/success?type=pro&plan=ValueCharts+Pro&app_context=pro",
      file: "success-pro.png",
    },
    {
      url: "/subscription/success?type=purchase&plan=Unlimited+Flows&app_context=pro",
      file: "success-purchase.png",
    },
    {
      url: "/subscription/success?type=addon&plan=Standard+100-flow+Add-on&app_context=pro",
      file: "success-addon.png",
    },
    {
      url: "/subscription/success?type=team&plan=Team+Plan+%285+members%29&app_context=team",
      file: "success-team.png",
    },
    {
      url: "/subscription/success?type=ai_credits&credits=100&packType=standard&app_context=pro",
      file: "success-ai.png",
    },
  ];

  for (const c of cases) {
    await page.goto(c.url);
    await page.waitForSelector("text=Payment Successful", { timeout: 12000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(__dirname, c.file),
      fullPage: true,
    });
    console.log("Saved", c.file);
  }
});
