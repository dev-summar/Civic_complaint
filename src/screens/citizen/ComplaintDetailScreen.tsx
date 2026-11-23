import React, {useEffect, useState} from 'react';
import {View, ScrollView, Alert} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {CitizenStackParamList} from '@/navigation/types';
import {
  Screen,
  Header,
  Badge,
  LoadingOverlay,
  SegmentedControl,
  Button,
  Input,
  Text,
  StatusTrail,
  Animate,
} from '@/components/ui';
import {Timeline, CommentList, ComplaintPhotos} from '@/components/complaints';
import {ComplaintOwnership} from '@/components/complaints/ComplaintOwnership';
import {MiniMap} from '@/components/maps';
import {useTheme, statusCitizenGuidance} from '@/theme';
import {fonts} from '@/theme/typography';
import {CATEGORY_META} from '@/constants';
import {formatDateTime, formatStatus} from '@/utils/format';
import {getErrorMessage} from '@/services/api';
import {useComplaintStore} from '@/store/complaintStore';
import {hapticSuccess} from '@/utils/haptics';

type Props = NativeStackScreenProps<CitizenStackParamList, 'ComplaintDetail'>;

function ConfirmFixCard({id, notes}: {id: string; notes?: string}) {
  const {colors, spacing} = useTheme();
  const confirm = useComplaintStore(s => s.confirm);
  const fetchTimeline = useComplaintStore(s => s.fetchTimeline);
  const [reopening, setReopening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState<'fixed' | 'reopen' | null>(null);

  const submit = async (fixed: boolean) => {
    if (!fixed && feedback.trim().length < 5) {
      Alert.alert('Tell the team what is still wrong', 'Add at least 5 characters.');
      return;
    }
    setBusy(fixed ? 'fixed' : 'reopen');
    try {
      await confirm(id, fixed, fixed ? undefined : feedback.trim());
      await fetchTimeline(id);
      if (fixed) hapticSuccess();
      Alert.alert(
        fixed ? 'Thank you' : 'Complaint reopened',
        fixed
          ? 'You confirmed the spot is clean. This complaint is now closed.'
          : 'The field team will see your note and go back to the spot.',
      );
      setReopening(false);
      setFeedback('');
    } catch (err) {
      Alert.alert('Could not update', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Animate from="up">
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.action,
          borderRadius: 18,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          gap: spacing.sm,
          backgroundColor: colors.actionSoft,
        }}>
        <Text
          style={{
            fontFamily: fonts.display,
            fontSize: 18,
            fontWeight: '700',
            lineHeight: 24,
            color: colors.primary,
          }}>
          Is it fixed?
        </Text>
        <Text
          style={{
            fontFamily: fonts.body,
            fontSize: 15,
            lineHeight: 22,
            color: colors.textSecondary,
          }}>
          The field team marked this complaint as fixed. Check the spot and confirm, or reopen it if the problem is still there.
        </Text>
        {notes ? (
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 13,
              lineHeight: 18,
              color: colors.text,
              fontStyle: 'italic',
            }}>
            Team note: {notes}
          </Text>
        ) : null}

        {reopening ? (
          <>
            <Input
              label="What is still wrong?"
              value={feedback}
              onChangeText={setFeedback}
              multiline
              placeholder="e.g. Garbage was moved but the pile is back"
            />
            <View style={{flexDirection: 'row', gap: 12, marginTop: spacing.sm}}>
              <Button title="Cancel" variant="outline" onPress={() => setReopening(false)} disabled={!!busy} style={{flex: 1}} />
              <Button title="Reopen" variant="danger" onPress={() => submit(false)} loading={busy === 'reopen'} style={{flex: 1}} />
            </View>
          </>
        ) : (
          <View style={{flexDirection: 'row', gap: 12, marginTop: spacing.sm}}>
            <Button title="Still not fixed" variant="outline" onPress={() => setReopening(true)} disabled={!!busy} style={{flex: 1}} />
            <Button title="Yes, it's clean" onPress={() => submit(true)} loading={busy === 'fixed'} style={{flex: 1}} />
          </View>
        )}
      </View>
    </Animate>
  );
}

function StatusStory({status, updatedAt}: {status: string; updatedAt?: string}) {
  const {colors, spacing} = useTheme();
  const guide = statusCitizenGuidance(status);

  return (
    <Animate from="up" delay={40}>
      <View
        accessibilityLiveRegion="polite"
        style={{
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.lg,
          gap: 14,
        }}>
        <View>
          <Text
            style={{
              fontFamily: fonts.display,
              fontSize: 17,
              fontWeight: '700',
              lineHeight: 24,
              color: colors.primary,
            }}>
            {guide.title}
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontFamily: fonts.body,
              fontSize: 15,
              lineHeight: 22,
              color: colors.textSecondary,
            }}>
            {guide.body}
          </Text>
        </View>
        <StatusTrail
          status={status}
          size="full"
          currentTimestamp={updatedAt}
        />
      </View>
    </Animate>
  );
}

export default function ComplaintDetailScreen({navigation, route}: Props) {
  const {id} = route.params;
  const {colors, spacing, radius} = useTheme();
  const selected = useComplaintStore(s => s.selected);
  const timeline = useComplaintStore(s => s.timeline);
  const comments = useComplaintStore(s => s.comments);
  const isLoading = useComplaintStore(s => s.isLoading);
  const fetchOne = useComplaintStore(s => s.fetchOne);
  const fetchTimeline = useComplaintStore(s => s.fetchTimeline);
  const fetchComments = useComplaintStore(s => s.fetchComments);
  const addComment = useComplaintStore(s => s.addComment);
  const [tab, setTab] = React.useState('timeline');

  useEffect(() => {
    fetchOne(id);
    fetchTimeline(id);
    fetchComments(id);
    return () => useComplaintStore.getState().clearSelected();
  }, [id, fetchOne, fetchTimeline, fetchComments]);

  const c = selected;
  const cat = c ? CATEGORY_META[c.category] ?? CATEGORY_META.others : null;

  return (
    <Screen>
      <Header title="Your report" subtitle="Track progress end to end" onBack={() => navigation.goBack()} panel />
      <LoadingOverlay visible={isLoading && !c} />
      {c ? (
        <ScrollView
          contentContainerStyle={{padding: spacing.lg, paddingBottom: spacing.xxxl, gap: 4}}
          keyboardShouldPersistTaps="handled">
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: 4}}>
            <Text
              style={{
                fontFamily: fonts.display,
                fontSize: 22,
                fontWeight: '700',
                lineHeight: 30,
                letterSpacing: -0.3,
                color: colors.text,
                flex: 1,
              }}>
              {c.title}
            </Text>
            <Badge label={formatStatus(c.status)} color={colors.status[c.status]} />
          </View>
          {cat ? (
            <Text
              style={{
                fontFamily: fonts.body,
                fontSize: 13,
                fontWeight: '700',
                color: colors.primary,
                marginTop: spacing.xs,
              }}>
              {cat.label}
            </Text>
          ) : null}
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 16,
              lineHeight: 24,
              color: colors.textSecondary,
              marginTop: spacing.md,
            }}>
            {c.description}
          </Text>
          <Text
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.textMuted,
              marginTop: spacing.md,
            }}>
            Ref: {c.referenceNumber ?? c._id.slice(-8).toUpperCase()}
          </Text>
          <Text
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              color: colors.textMuted,
              marginTop: 4,
              marginBottom: spacing.lg,
            }}>
            {formatDateTime(c.createdAt)}
          </Text>

          <StatusStory status={c.status} updatedAt={c.updatedAt || c.createdAt} />
          <ComplaintOwnership complaint={c} />
          {c.status === 'resolved' ? <ConfirmFixCard id={c._id} notes={c.resolutionNotes} /> : null}
          {c.status === 'closed' ? (
            <View
              style={{
                backgroundColor: colors.successSoft,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing.md,
                marginBottom: spacing.lg,
              }}>
              <Text
                style={{
                  fontFamily: fonts.body,
                  fontSize: 15,
                  lineHeight: 22,
                  color: colors.success,
                  fontWeight: '600',
                }}>
                You confirmed this spot is clean. Thank you.
              </Text>
            </View>
          ) : null}

          <ComplaintPhotos media={c.media} />

          {c.location ? (
            <View style={{marginBottom: spacing.lg, borderRadius: radius.md, overflow: 'hidden'}}>
              <MiniMap location={c.location} />
            </View>
          ) : null}

          <SegmentedControl
            options={[
              {label: 'Timeline', value: 'timeline'},
              {label: 'Comments', value: 'comments'},
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === 'timeline' ? <Timeline events={timeline} /> : (
            <CommentList comments={comments} onAddComment={text => addComment(id, text)} />
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
