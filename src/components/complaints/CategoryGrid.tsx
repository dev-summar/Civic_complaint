import React from 'react';
import {View } from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {useTheme} from '@/theme';
import {CategoryChip} from '@/components/ui';
import {COMPLAINT_CATEGORIES, CATEGORY_META, ComplaintCategory} from '@/constants';

interface CategoryGridProps {
  selected?: ComplaintCategory;
  onSelect: (category: ComplaintCategory) => void;
}

export function CategoryGrid({selected, onSelect}: CategoryGridProps) {
  const {spacing} = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm }}>
      {COMPLAINT_CATEGORIES.map(cat => {
        const meta = CATEGORY_META[cat];
        return (
          <View key={cat} style={{width: '48%', flexGrow: 1}}>
            <CategoryChip
              icon={meta.icon}
              label={meta.label}
              color={meta.color}
              selected={selected === cat}
              onPress={() => onSelect(cat)}
              layout="row"
            />
          </View>
        );
      })}
    </View>
  );
}

export default CategoryGrid;
