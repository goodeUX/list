import { StyleSheet } from 'react-native';

import { absoluteFill } from '@/lib/absoluteFill';
import { radius, space } from '@/lib/design';

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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flexGrow: 1,
  },
  field: {
    gap: space[2],
  },
  label: {},
  nameInput: {},
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {},
  limitError: {
    marginTop: space[2],
  },
  openLink: {
    marginTop: space[1],
  },
  subItemRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space[3],
    paddingVertical: space[2],
  },
  subItemCheckbox: {
    alignItems: 'center',
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
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
