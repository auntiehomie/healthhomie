// Type scale for iOS/Android mobile UI: display for screen heroes, title for section headings,
// body for content at three weights of emphasis, caption/chip for the smallest supporting text.
// Sizes and the display/title/body/caption/chip hierarchy follow the standard native scale (SF
// Pro on iOS, Roboto on Android — this app loads no custom font, so both render as intended);
// weight is kept to Regular/Medium/Bold (400/500/700) rather than the heavier 800/900 values
// scattered through the app previously, matching how that scale is meant to be used.
export const typography = {
  display1: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const },
  display2: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title1: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const },
  title2: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  bodyLarge: { fontSize: 17, lineHeight: 24, fontWeight: '400' as const },
  bodyLargeEmphasis: { fontSize: 17, lineHeight: 24, fontWeight: '500' as const },
  bodyMedium: { fontSize: 15, lineHeight: 21, fontWeight: '400' as const },
  bodyMediumEmphasis: { fontSize: 15, lineHeight: 21, fontWeight: '500' as const },
  bodySmall: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  bodySmallEmphasis: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
  chip: { fontSize: 11, lineHeight: 14, fontWeight: '500' as const },
};
