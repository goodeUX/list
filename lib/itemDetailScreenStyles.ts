import { StyleSheet } from 'react-native';

import { absoluteFill } from '@/lib/absoluteFill';
import { radius, space } from '@/lib/design';
import { ITEM_CHECKBOX_SIZE, ITEM_CHECKBOX_TEXT_GAP } from '@/lib/itemRowMetrics';

export const itemDetailStyles = StyleSheet.create({
  screen: {
    ...absoluteFill,
  },
  flex: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space[3],
  },
  shareButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  // The item name, left-aligned in whatever space the header buttons leave.
  // minWidth 0 lets it shrink so long names truncate rather than push the
  // delete button off screen.
  headerTitle: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: 'left',
  },
  headerTitleText: {
    textAlign: 'left',
  },
  content: {
    flexGrow: 1,
  },
  fields: {
    gap: space[6],
  },
  fieldsAboveSubItems: {
    marginBottom: space[4],
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {},
  openLink: {
    marginTop: space[1],
  },
  // Sub-item checkbox and name spacing match an item on the list page.
  subItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: ITEM_CHECKBOX_TEXT_GAP,
    paddingVertical: space[2],
  },
  subItemCheckbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: ITEM_CHECKBOX_SIZE,
    justifyContent: 'center',
    width: ITEM_CHECKBOX_SIZE,
  },
  subItemLabel: {
    flex: 1,
  },
  subItemInput: {
    flex: 1,
    paddingVertical: space[2],
  },
  subItemAction: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
});
