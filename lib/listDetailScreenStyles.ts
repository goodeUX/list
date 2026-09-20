import { StyleSheet } from 'react-native';

import { absoluteFill } from '@/lib/absoluteFill';
import { radius, space } from '@/lib/design';

export const ADD_SUBMIT_BUTTON_SIZE = 40;

export const listDetailStyles = StyleSheet.create({
  screen: {
    ...absoluteFill,
  },
  screenMenuOpen: {
    overflow: 'visible',
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space[3],
  },
  headerMenuOpen: {
    overflow: 'visible',
    zIndex: 10,
  },
  menuBackdrop: {
    ...absoluteFill,
    backgroundColor: 'transparent',
    zIndex: 5,
  },
  shareButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  titleBlock: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: space[3],
  },
  titleTextBlock: {
    flex: 1,
    gap: 2,
    minHeight: 30,
  },
  emoji: {
    fontSize: 28,
    lineHeight: 32,
  },
  title: {},
  addInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[2],
    paddingLeft: space[4],
    paddingVertical: space[1],
  },
  // Lifts the suggestion panel above the item list that follows it, and no
  // higher: the menu backdrop (5) and the header's options menu (10) must
  // both still sit above the input row.
  addInputWrapper: {
    zIndex: 1,
  },
  addInput: {
    flex: 1,
    minHeight: ADD_SUBMIT_BUTTON_SIZE - 4,
    paddingVertical: space[2],
  },
  addSubmitButton: {
    alignItems: 'center',
    height: ADD_SUBMIT_BUTTON_SIZE,
    justifyContent: 'center',
    width: ADD_SUBMIT_BUTTON_SIZE,
  },
  readOnlyBanner: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: space[2],
  },
  readOnlyText: {
    flex: 1,
  },
  readOnlyUpgrade: {},
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyList: {
    alignItems: 'center',
    paddingHorizontal: space[6],
  },
  emptyListImage: {
    height: 168,
    width: 168,
  },
  emptyText: {
    marginTop: space[4],
    textAlign: 'center',
  },
});
