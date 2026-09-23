import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/contexts/ThemeContext';

export const SUB_ITEM_CONNECTOR_SIZE = 24;

/**
 * The "└" that joins a sub-item to its parent on the list page (Figma node
 * 104:912). Drawn to the design's vector: a 2px line down from y=3 that turns
 * right with a 5px outer / 3px inner radius to finish at x=21, y=13 — here as
 * a view's left and bottom borders, since the app doesn't render SVG.
 */
export default function SubItemConnector() {
  const { colors } = useTheme();

  return (
    <View style={styles.box}>
      <View style={[styles.stroke, { borderColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: SUB_ITEM_CONNECTOR_SIZE,
    width: SUB_ITEM_CONNECTOR_SIZE,
  },
  stroke: {
    borderBottomLeftRadius: 5,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    height: 10,
    left: 11,
    position: 'absolute',
    top: 3,
    width: 10,
  },
});
