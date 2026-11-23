import React, {useCallback, useState} from 'react';
import {View, Alert} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Screen, Header, Card, Text, AppIcon, Button, Input} from '@/components/ui';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {getErrorMessage} from '@/services/api';
import * as userService from '@/services/user.service';
import {getCleanCityScore, getLeaderboard} from '@/services/engagement.service';
import {useAuthStore} from '@/store/authStore';
import type {CitizenStackParamList} from '@/navigation/types';
import type {CleanCityScore, Leaderboard} from '@/types';

type Props = NativeStackScreenProps<CitizenStackParamList, 'Leaderboard'>;

const COMMUNITY_EXAMPLES = 'e.g. Gandhi Nagar, MIET Jammu, 1 J&K NCC Bn';

export default function LeaderboardScreen({navigation}: Props) {
  const {colors, spacing, radius} = useTheme();
  const refreshUser = useAuthStore(s => s.refreshUser);
  const [score, setScore] = useState<CleanCityScore | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [community, setCommunity] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([getCleanCityScore(), getLeaderboard()])
      .then(([s, b]) => {
        setScore(s);
        setBoard(b);
        setCommunity(b.me.community || '');
      })
      .catch(err => Alert.alert('Could not load leaderboard', getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const saveCommunity = async () => {
    const value = community.trim();
    if (value.length < 2) {
      Alert.alert('Community', 'Enter your neighborhood, school, college, or NCC unit.');
      return;
    }
    setSaving(true);
    try {
      await userService.updateProfile({community: value});
      await refreshUser();
      setEditing(false);
      load();
    } catch (err) {
      Alert.alert('Could not save', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const me = board?.me;
  const points = board?.points;

  return (
    <Screen scroll refreshing={loading} onRefresh={load}>
      <Header title="Clean City Score" onBack={() => navigation.goBack()} />

      <View style={{paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg}}>
        {score ? (
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.xl,
              padding: spacing.lg,
            }}>
            <Text variant="caption" color="rgba(255,255,255,0.75)" style={{fontWeight: '700', letterSpacing: 1}}>
              CITY-WIDE SCORE
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6}}>
              <Text style={{fontFamily: fonts.display, fontSize: 56, fontWeight: '800', color: '#FFFFFF', lineHeight: 60}}>
                {score.score}
              </Text>
              <Text style={{fontSize: 18, color: 'rgba(255,255,255,0.7)', marginBottom: 10}}>/ 100</Text>
            </View>
            <Text variant="subtitle" color={colors.action} style={{fontWeight: '800'}}>
              {score.grade}
            </Text>
            <Text variant="body" color="rgba(255,255,255,0.85)" style={{marginTop: 8}}>
              {score.fixed} of {score.total} complaints fixed · {score.confirmed} confirmed by citizens
              {score.overdue ? ` · ${score.overdue} overdue` : ''}
            </Text>
          </View>
        ) : null}

        {me ? (
          <Card elevated>
            <Text variant="label" style={{fontWeight: '700', color: colors.primary}}>
              Your standing
            </Text>
            <View style={{flexDirection: 'row', marginTop: spacing.md}}>
              {[
                {label: 'Points', value: me.points},
                {label: 'Rank', value: me.rank ? `#${me.rank}` : '—'},
                {label: 'Reports', value: me.reports},
                {label: 'Confirmed', value: me.confirmed},
              ].map(item => (
                <View key={item.label} style={{flex: 1, alignItems: 'center'}}>
                  <Text style={{fontFamily: fonts.mono, fontSize: 20, fontWeight: '800', color: colors.text}}>
                    {item.value}
                  </Text>
                  <Text variant="caption" color={colors.neutral500}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={{marginTop: spacing.lg}}>
              {editing ? (
                <>
                  <Input
                    label="Your community"
                    value={community}
                    onChangeText={setCommunity}
                    placeholder={COMMUNITY_EXAMPLES}
                  />
                  <View style={{flexDirection: 'row', gap: 12}}>
                    <Button
                      title="Cancel"
                      variant="outline"
                      onPress={() => {
                        setEditing(false);
                        setCommunity(me.community || '');
                      }}
                      style={{flex: 1}}
                    />
                    <Button title="Save" onPress={saveCommunity} loading={saving} style={{flex: 1}} />
                  </View>
                </>
              ) : (
                <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12}}>
                  <Text variant="body" color={me.community ? colors.text : colors.neutral500} style={{flex: 1}}>
                    {me.community
                      ? `Representing ${me.community}`
                      : 'Join a community so your reports count for your neighborhood, school, college, or NCC unit.'}
                  </Text>
                  <Button
                    title={me.community ? 'Change' : 'Join'}
                    variant="outline"
                    onPress={() => setEditing(true)}
                  />
                </View>
              )}
            </View>
          </Card>
        ) : null}

        {points ? (
          <Text variant="caption" color={colors.neutral500}>
            Points: {points.report} for each report, {points.resolved} more when it is fixed, and{' '}
            {points.confirmed} more when you confirm the fix.
          </Text>
        ) : null}

        {board?.communities.length ? (
          <View>
            <Text variant="label" style={{fontWeight: '700', color: colors.primary, marginBottom: spacing.sm}}>
              Community leaderboard
            </Text>
            {board.communities.map(row => {
              const mine = me?.community && row.community.toLowerCase() === me.community.toLowerCase();
              return (
                <Card
                  key={row.community}
                  elevated
                  style={{
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    borderWidth: mine ? 1.5 : 0,
                    borderColor: colors.action,
                  }}>
                  <Text style={{fontFamily: fonts.mono, fontWeight: '800', width: 28, color: row.rank <= 3 ? colors.action : colors.neutral500}}>
                    #{row.rank}
                  </Text>
                  <View style={{flex: 1}}>
                    <Text variant="body" style={{fontWeight: '700'}} numberOfLines={1}>
                      {row.community}
                    </Text>
                    <Text variant="caption" color={colors.neutral500}>
                      {row.members} member{row.members === 1 ? '' : 's'} · {row.reports} reports · {row.confirmed} confirmed
                    </Text>
                  </View>
                  <Text style={{fontFamily: fonts.mono, fontWeight: '800', fontSize: 16, color: colors.primary}}>
                    {row.points}
                  </Text>
                </Card>
              );
            })}
          </View>
        ) : null}

        {board?.citizens.length ? (
          <View>
            <Text variant="label" style={{fontWeight: '700', color: colors.primary, marginBottom: spacing.sm}}>
              Top citizens
            </Text>
            {board.citizens.map(row => (
              <Card
                key={`${row.rank}-${row.name}`}
                elevated
                style={{
                  marginBottom: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderWidth: row.isMe ? 1.5 : 0,
                  borderColor: colors.action,
                }}>
                {row.rank === 1 ? (
                  <AppIcon name="trophy" size={20} color={colors.action} />
                ) : (
                  <Text style={{fontFamily: fonts.mono, fontWeight: '800', width: 20, color: colors.neutral500}}>
                    {row.rank}
                  </Text>
                )}
                <View style={{flex: 1}}>
                  <Text variant="body" style={{fontWeight: '700'}} numberOfLines={1}>
                    {row.isMe ? `${row.name} (you)` : row.name}
                  </Text>
                  <Text variant="caption" color={colors.neutral500} numberOfLines={1}>
                    {row.community ? `${row.community} · ` : ''}
                    {row.reports} reports · {row.confirmed} confirmed
                  </Text>
                </View>
                <Text style={{fontFamily: fonts.mono, fontWeight: '800', fontSize: 16, color: colors.primary}}>
                  {row.points}
                </Text>
              </Card>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
