import React, {useState} from 'react';
import {View, StyleSheet, FlatList, TextInput} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {useTheme} from '@/theme';
import {Avatar, AppIcon, Text} from '@/components/ui';
import {formatRelativeTime} from '@/utils/format';
import type {Comment, User} from '@/types';

interface CommentListProps {
  comments: Comment[];
  onAddComment?: (text: string) => Promise<void>;
  readOnly?: boolean;
}

function getAuthorName(author: User | string | undefined): string {
  if (!author) return 'User';
  if (typeof author === 'string') return 'User';
  return author.name;
}

export function CommentList({comments, onAddComment, readOnly = false}: CommentListProps) {
  const {colors, spacing, radius} = useTheme();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim() || !onAddComment) return;
    setSubmitting(true);
    try {
      await onAddComment(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList removeClippedSubviews={false}
        data={comments}
        keyExtractor={item => item._id}
        scrollEnabled={false}
        ListEmptyComponent={
          <Text variant="bodySmall" muted center style={{padding: spacing.lg}}>
            No comments yet.
          </Text>
        }
        renderItem={({item}) => {
          const author = item.author || item.userId;
          return (
          <View style={[styles.comment, {gap: spacing.sm, marginBottom: spacing.md}]}>
            <Avatar name={getAuthorName(author)} size={36} />
            <View
              style={{
                flex: 1,
                backgroundColor: colors.background,
                borderRadius: radius.lg,
                padding: spacing.md }}>
              <Text variant="caption" color={colors.primary} style={{fontWeight: '600'}}>
                {getAuthorName(author)}
              </Text>
              <Text variant="bodySmall" style={{marginTop: 2}}>
                {item.text}
              </Text>
              <Text variant="caption" muted style={{marginTop: spacing.xs}}>
                {formatRelativeTime(item.createdAt)}
              </Text>
            </View>
          </View>
          );
        }}
      />
      {!readOnly && onAddComment ? (
        <View
          style={[
            styles.inputRow,
            {gap: spacing.sm, marginTop: spacing.md},
          ]}>
          <TextInput
            style={{
              flex: 1,
              color: colors.text,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.lg,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              maxHeight: 100 }}
            placeholder="Add a comment…"
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            onPress={submit}
            disabled={!text.trim() || submitting}
            style={[
              styles.sendBtn,
              {backgroundColor: colors.primary},
              (!text.trim() || submitting) && styles.sendDisabled,
            ]}>
            <AppIcon name="navigation" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1 },
  comment: {
    flexDirection: 'row' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end' },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center' },
  sendDisabled: {
    opacity: 0.5 } });

export default CommentList;
