import React from 'react';
import {FlatList, StyleSheet, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdminStackParamList} from '@/navigation/types';
import {Screen, Header, Card, AppIcon, Text} from '@/components/ui';
import {COMPLAINT_CATEGORIES, CATEGORY_META} from '@/constants';
import {useTheme} from '@/theme';

type Props = NativeStackScreenProps<AdminStackParamList, 'Categories'>;

export default function CategoriesScreen({navigation}: Props) {
  const {spacing} = useTheme();

  return (
    <Screen>
      <Header title="Categories" onBack={() => navigation.goBack()} />
      <FlatList removeClippedSubviews={false}
        data={COMPLAINT_CATEGORIES}
        keyExtractor={item => item}
        contentContainerStyle={{padding: spacing.lg}}
        renderItem={({item}) => {
          const meta = CATEGORY_META[item];
          return (
            <Card style={{marginBottom: spacing.sm}}>
              <View style={[styles.row, {gap: spacing.md}]}>
                <View
                  style={[
                    styles.icon,
                    {backgroundColor: `${meta.color}18`},
                  ]}>
                  <AppIcon name={meta.icon} size={24} color={meta.color} />
                </View>
                <View>
                  <Text variant="label">{meta.label}</Text>
                  <Text variant="caption" muted>
                    {item}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center'},
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
