import type { ViewStyle } from 'react-native';

/** Subtle card elevation - low-opacity shadow on iOS/web, `elevation` on Android. Kept as one
 * shared constant (not per-theme) since card surfaces are always lighter than the page
 * background in both themes, so a soft dark shadow reads as lift either way. */
export const cardShadow: ViewStyle = {
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 3,
};
