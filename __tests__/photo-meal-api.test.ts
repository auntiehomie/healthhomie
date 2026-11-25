import { beforeEach, expect, jest, test } from '@jest/globals';
import type { VercelRequest, VercelResponse } from '@vercel/node';
jest.mock('../lib/server/auth', () => ({ requireUserId: jest.fn(() => 'user'), AuthError: class AuthError extends Error {} }));
const create = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('@anthropic-ai/sdk', () => ({ __esModule: true, default: jest.fn(() => ({ messages: { create } })) }));
import handler from '../api/ai/food-photo';
import { requireUserId, AuthError } from '../lib/server/auth';

beforeEach(() => { jest.clearAllMocks(); process.env.ANTHROPIC_API_KEY = 'test-only'; });
async function request(body: unknown, method = 'POST') {
  const res = { setHeader: jest.fn(), status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  await handler({ body, method, headers: {}, url: '/api/ai/food-photo' } as VercelRequest, res as unknown as VercelResponse);
  return res;
}
test('authenticates before spending AI tokens', async () => {
  jest.mocked(requireUserId).mockImplementationOnce(() => { throw new AuthError('Login required'); });
  expect((await request({ image: '/9j/AA==' })).status).toHaveBeenCalledWith(401);
  expect(create).not.toHaveBeenCalled();
});
test('rejects unsupported methods, invalid input, and missing config', async () => {
  expect((await request({}, 'GET')).status).toHaveBeenCalledWith(405);
  expect((await request({ image: 'https://bad.test' })).status).toHaveBeenCalledWith(400);
  delete process.env.ANTHROPIC_API_KEY;
  expect((await request({ image: '/9j/AA==' })).status).toHaveBeenCalledWith(503);
});
test('returns validated estimates without saving or exposing raw images', async () => {
  create.mockResolvedValueOnce({ content: [{ type: 'text', text: '{"items":[{"name":"Rice","calories":200,"proteinG":4,"carbsG":44,"fatG":1}]}' }], stop_reason: 'end_turn' });
  const res = await request({ image: '/9j/AA==' });
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({ items: [{ name: 'Rice', calories: 200, proteinG: 4, carbsG: 44, fatG: 1 }] });
});
test('rejects malformed model output', async () => {
  create.mockResolvedValueOnce({ content: [{ type: 'text', text: 'bad' }] });
  expect((await request({ image: '/9j/AA==' })).status).toHaveBeenCalledWith(502);
});
