import { jest, beforeEach, it, expect } from "@jest/globals";
import handler from "../api/auth/forgot-password";
import { getSql } from "../lib/server/db";
import { sendEmail } from "../lib/server/email";
jest.mock("../lib/server/db", () => ({
  getSql: jest.fn(),
  DatabaseNotConfiguredError: class extends Error {},
}));
jest.mock("../lib/server/passwordResetStore", () => ({
  createPasswordResetToken: jest
    .fn<() => Promise<string>>()
    .mockResolvedValue("reset-token"),
}));
jest.mock("../lib/server/email", () => ({
  sendEmail: jest.fn(),
  EmailNotConfiguredError: class extends Error {},
}));
jest.mock("../lib/server/rateLimit", () => ({
  passwordResetRateLimit: () => false,
}));
const sql = jest.fn<(...args: unknown[]) => Promise<unknown[]>>();
function response() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}
beforeEach(() => {
  jest.clearAllMocks();
  process.env.RESEND_API_KEY = "test-key";
  process.env.RESEND_FROM_EMAIL = "Howdy <support@example.com>";
  process.env.APP_ORIGIN = "https://howdymornin.io";
  (getSql as unknown as jest.Mock<() => typeof sql>).mockReturnValue(sql);
});
const req = {
  method: "POST",
  headers: { host: "attacker.example", "x-forwarded-host": "attacker.example" },
  body: { email: "person@example.com" },
};
it("rejects the test sender before looking up an account", async () => {
  process.env.RESEND_FROM_EMAIL = "onboarding@resend.dev";
  const res = response();
  await handler(req as never, res as never);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(getSql).not.toHaveBeenCalled();
});
it("does not display provider errors or leaked recipient addresses", async () => {
  sql.mockResolvedValueOnce([{ id: "local-id" }]);
  (
    sendEmail as unknown as jest.Mock<() => Promise<void>>
  ).mockRejectedValueOnce(new Error("403 private-provider-owner@example.com"));
  const res = response();
  await handler(req as never, res as never);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(JSON.stringify(res.json.mock.calls)).not.toContain(
    "private-provider-owner",
  );
  expect(JSON.stringify(res.json.mock.calls)).toContain("/support");
});
it("builds recovery links only from the configured app origin", async () => {
  sql.mockResolvedValueOnce([{ id: "local-id" }]);
  (
    sendEmail as unknown as jest.Mock<() => Promise<void>>
  ).mockResolvedValueOnce();
  const res = response();
  await handler(req as never, res as never);
  const mail = (sendEmail as unknown as jest.Mock).mock.calls[0][0] as {
    html: string;
  };
  expect(mail.html).toContain(
    "https://howdymornin.io/reset-password?token=reset-token",
  );
  expect(mail.html).not.toContain("attacker.example");
});
