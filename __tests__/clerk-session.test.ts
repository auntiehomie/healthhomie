import { jest, beforeEach, it, expect } from "@jest/globals";
import handler from "../api/auth/clerk-session";
import { createClerkClient } from "@clerk/backend";
import { getSql } from "../lib/server/db";
import jwt from "jsonwebtoken";

jest.mock("@clerk/backend", () => ({ createClerkClient: jest.fn() }));
jest.mock("../lib/server/db", () => ({ getSql: jest.fn() }));
jest.mock("../lib/server/auth", () => ({
  hashPassword: jest
    .fn<() => Promise<string>>()
    .mockResolvedValue("random-password-hash"),
}));
const authenticateRequest = jest.fn<(...args: any[]) => Promise<any>>();
const getUser = jest.fn<(...args: any[]) => Promise<any>>();
const sql = jest.fn<(...args: any[]) => Promise<any>>();
function response() {
  const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}
beforeEach(() => {
  jest.clearAllMocks();
  process.env.CLERK_SECRET_KEY = "test-secret";
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = "test-key";
  process.env.AUTH_JWT_SECRET = "test-app-secret";
  process.env.APP_ORIGIN = "https://howdymornin.io";
  (
    createClerkClient as unknown as jest.Mock<(...args: any[]) => any>
  ).mockReturnValue({ authenticateRequest, users: { getUser } });
  (getSql as unknown as jest.Mock<(...args: any[]) => any>).mockReturnValue(
    sql,
  );
  authenticateRequest.mockResolvedValue({
    toAuth: () => ({ userId: "clerk-123" }),
  });
  getUser.mockResolvedValue({
    id: "clerk-123",
    primaryEmailAddressId: "email-1",
    emailAddresses: [
      {
        id: "email-1",
        emailAddress: "Person@Example.com",
        verification: { status: "verified" },
      },
    ],
  });
});
const request = {
  method: "POST",
  headers: { authorization: "Bearer session" },
};
it("retains an existing local ID and owner role after verified email linking", async () => {
  sql
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ id: "original-user", isOwner: true }]);
  const res = response();
  await handler(request as never, res as never);
  expect(res.status).toHaveBeenCalledWith(200);
  const payload = jwt.verify(
    (res.json.mock.calls[0][0] as { token: string }).token,
    "test-app-secret",
  ) as jwt.JwtPayload;
  expect(payload.sub).toBe("original-user");
  expect(payload.isOwner).toBe(true);
  expect(payload.exp! - payload.iat!).toBe(300);
  expect(authenticateRequest.mock.calls[0][1]).toEqual({
    authorizedParties: ["https://howdymornin.io"],
    acceptsToken: "session_token",
  });
  expect(sql.mock.calls[1].slice(1)).toContain("person@example.com");
});
it("rejects an unverified primary email before any database access", async () => {
  getUser.mockResolvedValueOnce({
    primaryEmailAddressId: "email-1",
    emailAddresses: [{ id: "email-1", verification: { status: "unverified" } }],
  });
  const res = response();
  await handler(request as never, res as never);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(sql).not.toHaveBeenCalled();
});
it("rejects an email already linked to a different Clerk identity", async () => {
  sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  const res = response();
  await handler(request as never, res as never);
  expect(res.status).toHaveBeenCalledWith(409);
  expect(sql.mock.calls[1][0].join("")).toContain(
    'users."clerkUserId" IS NULL OR',
  );
});
it("rejects unauthenticated sessions", async () => {
  authenticateRequest.mockResolvedValueOnce({ toAuth: () => null });
  const res = response();
  await handler(request as never, res as never);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(getUser).not.toHaveBeenCalled();
});
it("uses the immutable Clerk ID after the email changes", async () => {
  sql.mockResolvedValueOnce([{ id: "original-user", isOwner: false }]);
  const res = response();
  await handler(request as never, res as never);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(sql).toHaveBeenCalledTimes(1);
});
it("fails closed without production configuration", async () => {
  delete process.env.APP_ORIGIN;
  const res = response();
  await handler(request as never, res as never);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(authenticateRequest).not.toHaveBeenCalled();
});
