import { useMemo, type ComponentProps } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Tabs } from 'expo-router';

type TabBarRenderer = NonNullable<ComponentProps<typeof Tabs>['tabBar']>;
type TabBarProps = Parameters<TabBarRenderer>[0];

const ACTIVE = '#4f7c59';
const INACTIVE = '#9e9891';
const ICON_SIZE = 22;
const VISIBLE_TABS = 4;

export default function ScrollableTabBar({ state, descriptors, navigation }: TabBarProps) {
  const tabWidth = useMemo(() => Dimensions.get('window').width / VISIBLE_TABS, []);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={tabWidth * VISIBLE_TABS}
        decelerationRate="fast"
        contentContainerStyle={{ width: tabWidth * state.routes.length }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? ACTIVE : INACTIVE;
          const label = options.title ?? route.name;

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable key={route.key} onPress={onPress} style={[styles.tab, { width: tabWidth }]}>
              {options.tabBarIcon?.({ focused: isFocused, color, size: ICON_SIZE })}
              <Text style={[styles.label, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { backgroundColor: '#ffffff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e8e1d8' },
  tab: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 8, paddingBottom: 10 },
  label: { fontSize: 10, fontWeight: '700' },
});
