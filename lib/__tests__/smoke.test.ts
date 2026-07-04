import AsyncStorage from '@react-native-async-storage/async-storage';

test('async-storage mock round-trips a value', async () => {
  await AsyncStorage.setItem('k', 'v');
  expect(await AsyncStorage.getItem('k')).toBe('v');
});
