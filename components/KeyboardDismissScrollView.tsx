import { ScrollView, type ScrollViewProps } from 'react-native';

export default function KeyboardDismissScrollView(props: ScrollViewProps) {
  return (
    <ScrollView
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      {...props}
    />
  );
}
