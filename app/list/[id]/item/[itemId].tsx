import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ThemedTextInput from '@/components/ThemedTextInput';
import { useTheme } from '@/contexts/ThemeContext';
import { useChildSlideTransition } from '@/hooks/useSlideTransition';
import { useListItems } from '@/hooks/useListItems';
import { isValidUrl, normalizeUrl } from '@/lib/urls';
import {
  ITEM_NAME_LIMIT_MESSAGE,
  getItemNameInputUpdate,
  normalizeItemName,
} from '@/lib/itemName';

export default function ItemDetailScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const listId = typeof id === 'string' ? id : undefined;
  const resolvedItemId = typeof itemId === 'string' ? itemId : undefined;
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, updateItem, deleteItem } = useListItems(listId);

  const item = items.find((entry) => entry.id === resolvedItemId);
  const { animatedStyle, goBack, isEnabled: slideTransitionEnabled } =
    useChildSlideTransition({ ready: !loading && Boolean(item) });

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameLimitError, setNameLimitError] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      return;
    }

    setName(item.name);
    setQuantity(item.quantity ?? '');
    setDescription(item.description ?? '');
    setLink(item.link ?? '');
    setLinkError(null);
  }, [item]);

  const handleSave = async () => {
    if (!item || !listId || saving) {
      return;
    }

    const trimmedName = normalizeItemName(name);
    if (!trimmedName) {
      Alert.alert('Name required', 'Please enter an item name.');
      return;
    }

    const trimmedLink = link.trim();
    if (trimmedLink && !isValidUrl(trimmedLink)) {
      setLinkError('Please enter a valid URL.');
      return;
    }

    setSaving(true);
    try {
      await updateItem(item.id, {
        name: trimmedName,
        quantity: quantity.trim() || null,
        description: description.trim() || null,
        link: trimmedLink ? normalizeUrl(trimmedLink) : null,
      });
      goBack();
    } catch {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenLink = async () => {
    const normalized = normalizeUrl(link);
    if (!normalized) {
      return;
    }
    await WebBrowser.openBrowserAsync(normalized);
  };

  const handleDelete = () => {
    if (!item || saving) {
      return;
    }

    const runDelete = () => {
      void deleteItem(item.id).then(() => goBack());
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Remove "${item.name}" from this list?`)) {
        runDelete();
      }
      return;
    }

    Alert.alert('Delete item', `Remove "${item.name}" from this list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: runDelete,
      },
    ]);
  };

  if (loading || !item) {
    return (
      <Animated.View
        style={[
          styles.screen,
          { backgroundColor: colors.bg },
          slideTransitionEnabled ? animatedStyle : null,
        ]}
      >
        <View
          style={[
            styles.flex,
            {
              paddingBottom: insets.bottom,
              paddingLeft: insets.left,
              paddingRight: insets.right,
              paddingTop: insets.top,
            },
          ]}
        >
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.screen,
        { backgroundColor: colors.bg },
        slideTransitionEnabled ? animatedStyle : null,
      ]}
    >
      <View
        style={[
          styles.flex,
          {
            paddingBottom: insets.bottom,
            paddingLeft: insets.left,
            paddingRight: insets.right,
            paddingTop: insets.top,
          },
        ]}
      >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
              paddingBottom: spacing.md,
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => goBack()}
            style={({ pressed }) => [
              styles.shareButton,
              {
                backgroundColor: colors.surface,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons color={colors.accent} name="chevron-left" size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit item</Text>
          <View style={styles.shareButton} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { gap: spacing.md, padding: spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Name</Text>
            <ThemedTextInput
              editable={!saving}
              onChangeText={(text) => {
                const { limitReached, value } = getItemNameInputUpdate(text);
                setNameLimitError(limitReached);
                setName(value);
              }}
              style={styles.nameInput}
              value={name}
            />
            {nameLimitError ? (
              <Text style={[styles.limitError, { color: colors.accent }]}>
                {ITEM_NAME_LIMIT_MESSAGE}
              </Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Quantity</Text>
            <ThemedTextInput
              editable={!saving}
              onChangeText={setQuantity}
              placeholder="e.g. 2 lbs, 1 pack"
              value={quantity}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <ThemedTextInput
              editable={!saving}
              multiline
              onChangeText={setDescription}
              placeholder="Notes or details"
              style={styles.textArea}
              value={description}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Link</Text>
            <ThemedTextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              invalid={Boolean(linkError)}
              keyboardType="url"
              onChangeText={(value) => {
                setLink(value);
                setLinkError(null);
              }}
              placeholder="https://..."
              value={link}
            />
            {linkError ? (
              <Text style={[styles.error, { color: colors.accent }]}>{linkError}</Text>
            ) : null}
            {link.trim() && isValidUrl(link) ? (
              <Pressable onPress={handleOpenLink}>
                <Text style={[styles.openLink, { color: colors.accent }]}>Open link</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            disabled={saving}
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radii.item,
                opacity: pressed || saving ? 0.85 : 1,
              },
            ]}
          >
            {saving ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={[styles.saveButtonText, { color: colors.surface }]}>Save</Text>
            )}
          </Pressable>

          <Pressable
            disabled={saving}
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              {
                borderColor: colors.border,
                borderRadius: radii.item,
                opacity: pressed || saving ? 0.85 : 1,
              },
            ]}
          >
            <Text style={[styles.deleteButtonText, { color: colors.accent }]}>
              Delete item
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
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
    gap: 12,
  },
  shareButton: {
    alignItems: 'center',
    borderRadius: 22,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  content: {
    flexGrow: 1,
  },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
  },
  nameInput: {
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  limitError: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  openLink: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 14,
    marginTop: 4,
  },
  saveButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: 8,
  },
  saveButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 16,
  },
  deleteButton: {
    alignItems: 'center',
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteButtonText: {
    fontFamily: 'NunitoSans_600SemiBold',
    fontSize: 15,
  },
});
