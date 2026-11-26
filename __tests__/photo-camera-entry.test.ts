import { expect, jest, test } from '@jest/globals';
import React from 'react';
const { renderToStaticMarkup } = jest.requireActual<{ renderToStaticMarkup: (element: React.ReactNode) => string }>('react-dom/server');
import { PhotoMealCapture } from '../components/health/PhotoMealCapture';

jest.mock('react-native', () => ({ Platform: { OS: 'ios' }, Text: 'span', TextInput: 'input', View: 'div' }));
jest.mock('expo-camera', () => ({ CameraView: () => React.createElement('div', null, 'Camera preview'), useCameraPermissions: () => [{ granted: true }, jest.fn()] }));
jest.mock('../components/ui/PressableFeedback', () => ({ PressableFeedback: 'button' }));
jest.mock('../lib/services/authClient', () => ({}));
jest.mock('../lib/db/database', () => ({}));
jest.mock('../lib/theme/ThemeContext', () => ({ useTheme: () => ({ colors: {} }) }));

test('journal autoOpen skips the extra camera-open tap when permission is granted', () => {
  const html = renderToStaticMarkup(React.createElement(PhotoMealCapture, { autoOpen: true, onFound: jest.fn() }));
  expect(html).toContain('Camera preview');
  expect(html).toContain('Snap and estimate');
  expect(html).not.toContain('Open meal camera');
});

test('existing callers keep the explicit camera-open step', () => {
  const html = renderToStaticMarkup(React.createElement(PhotoMealCapture, { onFound: jest.fn() }));
  expect(html).toContain('Open meal camera');
  expect(html).not.toContain('Camera preview');
});
