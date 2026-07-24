import * as Haptics from 'expo-haptics';

/** Wrapped so a rejected/unsupported call (e.g. web, where haptics don't exist) never surfaces
 * as an unhandled promise rejection - callers can fire-and-forget these. */
export function hapticImpact(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) {
  Haptics.impactAsync(style).catch(() => {});
}

export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
