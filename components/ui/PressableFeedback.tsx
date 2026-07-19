import { Pressable as RNPressable, type PressableProps } from 'react-native';

/**
 * Drop-in replacement for RN's Pressable that always dims on press, whether or not the
 * caller's own `style` already reacts to the pressed state — most Pressables in this app had
 * no press feedback at all (a plain style prop, not the `({ pressed }) => ...}` form), so button
 * taps gave no visual confirmation. Imported aliased as `Pressable` at each call site, so no JSX
 * changes are needed anywhere it's used.
 */
export function PressableFeedback({ style, ...rest }: PressableProps) {
  return (
    <RNPressable
      {...rest}
      style={(state) => {
        const resolved = typeof style === 'function' ? style(state) : style;
        return [resolved, state.pressed && { opacity: 0.6 }];
      }}
    />
  );
}
