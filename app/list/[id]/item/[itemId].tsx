import { router, useLocalSearchParams } from 'expo-router';
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
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/contexts/ThemeContext';
import { useListItems } from '@/hooks/useListItems';
import { isValidUrl, normalizeUrl } from '@/lib/urls';

export default function ItemDetailScreen() {
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const listId = typeof id === 'string' ? id : undefined;
  const resolvedItemId = typeof itemId === 'string' ? itemId : undefined;
  const { colors, radii, spacing } = useTheme();
  const { items, loading, updateItem, deleteItem } = useListItems(listId);

  const item = items.find((entry) => entry.id === resolvedItemId);

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [saving, setSaving] = useState(false);
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

    const trimmedName = name.trim();
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
      router.back();
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
      void deleteItem(item.id).then(() => router.back());
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
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
              paddingBottom: spacing.md,
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.iconButton,
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <SymbolView
              name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              size={22}
              tintColor={colors.accent}
            />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit item</Text>
          <View style={styles.iconButton} />
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
            <TextInput
              editable={!saving}
              onChangeText={setName}
              style={[
                styles.nameInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.item,
                  color: colors.text,
                },
              ]}
              value={name}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Quantity</Text>
            <TextInput
              editable={!saving}
              onChangeText={setQuantity}
              placeholder="e.g. 2 lbs, 1 pack"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.item,
                  color: colors.text,
                },
              ]}
              value={quantity}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
            <TextInput
              editable={!saving}
              multiline
              onChangeText={setDescription}
              placeholder="Notes or details"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.item,
                  color: colors.text,
                },
              ]}
              value={description}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Link</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              editable={!saving}
              keyboardType="url"
              onChangeText={(value) => {
                setLink(value);
                setLinkError(null);
              }}
              placeholder="https://..."
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surface,
                  borderColor: linkError ? colors.accent : colors.border,
                  borderRadius: radii.item,
                  color: colors.text,
                },
              ]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
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
  iconButton: {
    alignItems: 'center',
    height: 36,
    justifyContent: 'center',
    width: 36,
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
    borderWidth: 1,
    fontFamily: 'Fraunces_600SemiBold',
    fontSize: 24,
    lineHeight: 30,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  input: {
    borderWidth: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textArea: {
    borderWidth: 1,
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 16,
    minHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 14,
    textAlignVertical: 'top',
  },
  error: {
    fontFamily: 'NunitoSans_400Regular',
    fontSize: 13,
    lineHeight: 18,
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
