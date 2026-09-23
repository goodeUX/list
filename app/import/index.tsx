import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Button from '@/components/Button';
import ListFormModal from '@/components/ListFormModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useLists } from '@/hooks/useLists';
import { addItemToList } from '@/hooks/useListItems';
import { absoluteFill } from '@/lib/absoluteFill';
import { showAppAlert } from '@/lib/appAlert';
import { openList } from '@/lib/openList';
import { radius, space } from '@/lib/design';
import { applyEntriesToList } from '@/lib/importEntries';
import { fetchAndParseRecipe, fetchPageTitle } from '@/lib/recipeFetch';
import { ingredientToEntry } from '@/lib/recipeImport';

type Phase = 'choosing' | 'working' | 'pickList';
type ImportAction = 'ingredients' | 'link';

const DEFAULT_EMOJI = '📋';

function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

export default function ImportScreen() {
  const params = useLocalSearchParams<{ url?: string | string[] }>();
  const url = typeof params.url === 'string' ? params.url : undefined;
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lists, loading: listsLoading, createList } = useLists();

  const [phase, setPhase] = useState<Phase>('choosing');
  const [action, setAction] = useState<ImportAction>('link');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, []);

  const finishToList = useCallback((listId: string, summary: string) => {
    openList({ id: listId }, { replace: true });
    showAppAlert('Import complete', summary);
  }, []);

  // Move to the list picker for the "add page as a link" flow, resolving a
  // page title first (falling back to the URL host if the fetch fails).
  const startLinkFlow = useCallback(async () => {
    if (!url) {
      return;
    }
    setPhase('working');
    let title: string | null = null;
    try {
      title = await fetchPageTitle(url);
    } catch {
      // Non-fatal: we can still add the link with the host as its name.
      title = null;
    }
    setPageTitle(title && title.length > 0 ? title : hostOf(url));
    setAction('link');
    setPhase('pickList');
  }, [url]);

  const offerLinkFallback = useCallback(
    (message: string) => {
      showAppAlert('No ingredients found', message, [
        { text: 'Add page as link', onPress: () => void startLinkFlow() },
        { text: 'Cancel', style: 'cancel', onPress: () => setPhase('choosing') },
      ]);
    },
    [startLinkFlow],
  );

  const handleImportIngredients = useCallback(async () => {
    if (!url) {
      return;
    }
    setPhase('working');
    try {
      const recipe = await fetchAndParseRecipe(url);
      if (recipe.ingredients.length > 0) {
        setIngredients(recipe.ingredients);
        setPageTitle(recipe.title);
        setAction('ingredients');
        setPhase('pickList');
        return;
      }
      offerLinkFallback(
        "We couldn't find an ingredient list on that page. Add it as a link instead?",
      );
    } catch {
      offerLinkFallback(
        "We couldn't read that page. Add it as a link instead?",
      );
    }
  }, [offerLinkFallback, url]);

  const applyToList = useCallback(
    async (listId: string) => {
      if (!url) {
        return;
      }
      setPhase('working');
      try {
        if (action === 'ingredients') {
          const names = await applyEntriesToList(
            listId,
            user,
            ingredients.map(ingredientToEntry),
          );
          const count = names.length;
          finishToList(
            listId,
            `Added ${count} ${count === 1 ? 'ingredient' : 'ingredients'}.`,
          );
        } else {
          const name = pageTitle && pageTitle.length > 0 ? pageTitle : hostOf(url);
          await addItemToList(listId, user, name, { link: url });
          finishToList(listId, 'Added the page as a link.');
        }
      } catch {
        setPhase('pickList');
        showAppAlert(
          'Could not add to that list',
          'Something went wrong. Please try again.',
        );
      }
    },
    [action, finishToList, ingredients, pageTitle, url, user],
  );

  const handleCreateList = useCallback(
    async (name: string, emoji: string) => {
      setCreating(true);
      try {
        const listId = await createList(name, emoji);
        setCreateModalVisible(false);
        await applyToList(listId);
      } catch {
        showAppAlert('Could not create list', 'Please try again.');
      } finally {
        setCreating(false);
      }
    },
    [applyToList, createList],
  );

  const headerTitle = useMemo(() => {
    if (phase === 'pickList') {
      return action === 'ingredients' ? 'Choose a list' : 'Save link to…';
    }
    return 'Import';
  }, [action, phase]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
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
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.border,
              paddingHorizontal: space[6],
              paddingTop: space[4],
              paddingBottom: space[4],
            },
          ]}
        >
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={8}
            onPress={goBack}
            style={({ pressed }) => [
              styles.backButton,
              { backgroundColor: colors.surface, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialIcons color={colors.primary} name="chevron-left" size={24} />
          </Pressable>
          <Text
            style={[typography.h1, styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {!url ? (
          <View style={[styles.centered, { padding: space[6] }]}>
            <Text style={[typography.body, styles.body, { color: colors.textSecondary }]}>
              Nothing was shared to import.
            </Text>
            <Button label="Back to lists" onPress={goBack} variant="secondary" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={[
              styles.content,
              { gap: space[4], padding: space[6] },
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.urlCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.lg,
                  gap: space[1],
                  padding: space[4],
                },
              ]}
            >
              <Text style={[typography.caption, styles.urlLabel, { color: colors.textSecondary }]}>
                Shared link
              </Text>
              <Text
                numberOfLines={2}
                style={[typography.body, styles.urlValue, { color: colors.text }]}
              >
                {url}
              </Text>
            </View>

            {phase === 'working' ? (
              <View style={[styles.centered, { paddingVertical: space[8] }]}>
                <ActivityIndicator color={colors.primary} size="large" />
              </View>
            ) : phase === 'pickList' ? (
              <View style={{ gap: space[4] }}>
                <Text style={[typography.label, styles.sectionLabel, { color: colors.textSecondary }]}>
                  {action === 'ingredients'
                    ? `Add ${ingredients.length} ${
                        ingredients.length === 1 ? 'ingredient' : 'ingredients'
                      } to which list?`
                    : 'Which list should hold this link?'}
                </Text>

                {listsLoading ? (
                  <View style={[styles.centered, { paddingVertical: space[6] }]}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : lists.length === 0 ? (
                  <Text style={[typography.body, styles.body, { color: colors.textSecondary }]}>
                    You don't have any lists yet. Create one below.
                  </Text>
                ) : (
                  <View style={{ gap: space[2] }}>
                    {lists.map((list) => (
                      <Pressable
                        key={list.id}
                        accessibilityRole="button"
                        onPress={() => void applyToList(list.id)}
                        style={({ pressed }) => [
                          styles.listRow,
                          {
                            backgroundColor: colors.surfaceMuted,
                            borderColor: colors.border,
                            borderRadius: radius.md,
                            opacity: pressed ? 0.85 : 1,
                            padding: space[4],
                          },
                        ]}
                      >
                        <Text style={styles.listEmoji}>{list.emoji}</Text>
                        <Text
                          numberOfLines={1}
                          style={[typography.label, styles.listName, { color: colors.text }]}
                        >
                          {list.name}
                        </Text>
                        <MaterialIcons
                          color={colors.textSecondary}
                          name="chevron-right"
                          size={22}
                        />
                      </Pressable>
                    ))}
                  </View>
                )}

                <Button
                  icon="add"
                  label="New list"
                  onPress={() => setCreateModalVisible(true)}
                  variant="secondary"
                />
              </View>
            ) : (
              <View style={{ gap: space[2] }}>
                <Text style={[typography.body, styles.body, { color: colors.textSecondary }]}>
                  What would you like to do with this page?
                </Text>
                <Button
                  icon="restaurant"
                  label="Import ingredients"
                  onPress={() => void handleImportIngredients()}
                  variant="primary"
                />
                <Button
                  icon="link"
                  label="Add page as item"
                  onPress={() => void startLinkFlow()}
                  variant="secondary"
                />
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <ListFormModal
        onClose={() => setCreateModalVisible(false)}
        onSubmit={handleCreateList}
        initialEmoji={DEFAULT_EMOJI}
        submitLabel="Create & add"
        submitting={creating}
        title="New list"
        visible={createModalVisible}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...absoluteFill,
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
  backButton: {
    alignItems: 'center',
    borderRadius: radius.xl,
    flexShrink: 0,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  headerSpacer: {
    flexShrink: 0,
    height: 44,
    width: 44,
  },
  title: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    flexGrow: 1,
  },
  centered: {
    alignItems: 'center',
    gap: space[3],
    justifyContent: 'center',
  },
  urlCard: {
    borderWidth: 1,
  },
  urlLabel: {
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  urlValue: {},
  sectionLabel: {},
  body: {},
  listRow: {
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: space[3],
  },
  listEmoji: { fontSize: 22, lineHeight: 26 },
  listName: {
    flex: 1,
  },
});
