import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
  Platform,
  ScrollView,
} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {CompositeNavigationProp, RouteProp} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Screen,
  Button,
  Input,
  Checkbox,
  Text,
  AppIcon,
  Card,
  CategoryChip,
  PressableScale,
  Animate,
} from '@/components/ui';
import {SetuAvatar} from '@/components/complaints';
import {useTheme} from '@/theme';
import {fonts} from '@/theme/typography';
import {
  PRIORITY,
  PRIORITY_LABELS,
  ComplaintCategory,
  COMPLAINT_CATEGORIES,
  CATEGORY_META,
} from '@/constants';
import type {Priority} from '@/constants/status';
import {classifyPhoto} from '@/services/engagement.service';
import {formatCoords} from '@/utils/format';
import {capturePhoto, pickPhotoFromLibrary} from '@/utils/photo';
import {getErrorMessage} from '@/services/api';
import {useLocation} from '@/hooks/useLocation';
import {useComplaintStore} from '@/store/complaintStore';
import {showToast} from '@/store/toastStore';
import type {PhotoItem} from '@/components/complaints/PhotoPickerGrid';
import type {CitizenStackParamList, CitizenTabParamList, ReportChatDraft} from '@/navigation/types';
import {LocationPicker} from '@/components/maps';
import type {Coordinates, PhotoSuggestion} from '@/types';
import {hapticSuccess} from '@/utils/haptics';
import {useAppStore} from '@/store/appStore';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<CitizenTabParamList, 'Report'>,
  NativeStackNavigationProp<CitizenStackParamList>
>;

const DESC_MAX = 500;

function StepBadge({n}: {n: number}) {
  const {colors} = useTheme();
  return (
    <View
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: 13,
          fontWeight: '700',
          color: '#FFF',
        }}>
        {n}
      </Text>
    </View>
  );
}

function SectionHead({
  step,
  title,
  hint,
}: {
  step: number;
  title: string;
  hint?: string;
}) {
  const {spacing} = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: spacing.md,
      }}>
      <StepBadge n={step} />
      <View style={{flex: 1}}>
        <Text variant="label" style={{fontWeight: '800'}}>
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" muted>
            {hint}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ProgressBar({filled}: {filled: number}) {
  const {colors, spacing} = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: 6,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
      }}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 4,
            borderRadius: 999,
            backgroundColor: i < filled ? colors.action : colors.border,
          }}
        />
      ))}
    </View>
  );
}

function PhotoTile({
  photo,
  onAdd,
  onRetake,
}: {
  photo?: PhotoItem;
  onAdd: () => void;
  onRetake: () => void;
}) {
  const {colors, radius} = useTheme();
  if (photo) {
    return (
      <View style={{width: 120}}>
        <Image
          source={{uri: photo.uri}}
          style={{
            width: 120,
            height: 120,
            borderRadius: radius.md,
            backgroundColor: colors.border,
          }}
        />
        <TouchableOpacity onPress={onRetake} style={{marginTop: 8, alignSelf: 'center'}}>
          <Text variant="caption" color={colors.primary} style={{fontWeight: '700'}}>
            Retake
          </Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <TouchableOpacity
      onPress={onAdd}
      activeOpacity={0.85}
      style={{
        width: 120,
        height: 120,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderColor: colors.neutral500,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: colors.surface,
      }}>
      <AppIcon name="camera" size={28} color={colors.primary} />
      <Text variant="caption" color={colors.neutral500} style={{fontWeight: '600'}}>
        Add photo
      </Text>
    </TouchableOpacity>
  );
}

function AiSuggestionBanner({
  analyzing,
  suggestion,
  selectedCategory,
  onApply,
}: {
  analyzing: boolean;
  suggestion: PhotoSuggestion | null;
  selectedCategory?: ComplaintCategory;
  onApply: () => void;
}) {
  const {colors, radius, spacing} = useTheme();
  if (!analyzing && !suggestion) return null;

  const meta = suggestion ? CATEGORY_META[suggestion.category] ?? CATEGORY_META.others : null;
  const usable = suggestion?.status === 'issue_visible' && suggestion.confidence === 'high';
  const differs = usable && selectedCategory && selectedCategory !== suggestion.category;

  return (
    <View
      style={{
        marginTop: spacing.md,
        padding: 12,
        borderRadius: radius.md,
        backgroundColor: colors.primarySoft,
        gap: 6,
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        {analyzing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <AppIcon name="sparkles" size={16} color={colors.primary} />
        )}
        <Text variant="caption" color={colors.primary} style={{fontWeight: '700'}}>
          {analyzing ? 'AI is reading your photo…' : 'AI suggestion'}
        </Text>
      </View>
      {suggestion && meta ? (
        <>
          {usable ? <Text variant="body" style={{fontWeight: '700'}}>
            {meta.label} · {PRIORITY_LABELS[suggestion.priority] ?? 'Medium'} priority
          </Text> : null}
          {suggestion.summary || suggestion.message ? (
            <Text variant="caption" color={colors.neutral500}>
              {suggestion.summary || suggestion.message}
            </Text>
          ) : null}
          {differs ? (
            <TouchableOpacity onPress={onApply} style={{alignSelf: 'flex-start', marginTop: 2}}>
              <Text variant="caption" color={colors.action} style={{fontWeight: '700'}}>
                Use {meta.label}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

function LocationPreview({
  pin,
  onChange,
  onUseGps,
  loading,
  error,
}: {
  pin: Coordinates | null;
  onChange: (coords: Coordinates) => void;
  onUseGps: () => void;
  loading: boolean;
  error?: string | null;
}) {
  const {colors, radius, spacing} = useTheme();

  return (
    <View style={{marginTop: spacing.md}}>
      <LocationPicker value={pin} onChange={onChange} height={220} />
      <View
        style={{
          marginTop: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}>
        <Text
          variant="caption"
          color={pin ? colors.primary : colors.neutral500}
          style={{flex: 1, fontFamily: fonts.mono, fontWeight: '700'}}>
          {pin ? formatCoords(pin.latitude, pin.longitude) : 'Tap the map or use GPS'}
        </Text>
        <TouchableOpacity
          onPress={onUseGps}
          disabled={loading}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            height: 32,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
          <AppIcon name="navigation" size={14} color={colors.primary} />
          <Text variant="caption" color={colors.primary} style={{fontWeight: '600'}}>
            {loading ? 'Locating…' : 'Use GPS'}
          </Text>
        </TouchableOpacity>
      </View>
      {error ? (
        <Text variant="caption" color={colors.error} style={{marginTop: 6}}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export default function ReportScreen() {
  const {colors, spacing, radius, shadows} = useTheme();
  const navigation = useNavigation<Nav>();
  const {params} = useRoute<RouteProp<CitizenTabParamList, 'Report'>>();
  const draft = params?.chatDraft;
  const {location, refresh, isLoading: locLoading, error: locationError} = useLocation();
  const create = useComplaintStore(s => s.create);
  const storeLoading = useComplaintStore(s => s.isLoading);
  const preferredLanguage = useAppStore(s => s.language);
  const [chatReport, setChatReport] = useState<ReportChatDraft | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ComplaintCategory | undefined>();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [pin, setPin] = useState<Coordinates | null>(location);
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [priority, setPriority] = useState<Priority>(PRIORITY.MEDIUM);
  const [suggestion, setSuggestion] = useState<PhotoSuggestion | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const checkScale = useRef(new Animated.Value(0)).current;
  const photoRun = useRef(0);
  const photoAbort = useRef<AbortController | null>(null);
  const autoPhotoFields = useRef<{title?: string; description?: string; category?: ComplaintCategory} | null>(null);
  const gpsRequested = useRef(false);
  const scroll = useRef<ScrollView>(null);

  const analyzePhoto = (photo: PhotoItem) => {
    const previous = autoPhotoFields.current;
    if (previous) {
      setTitle(current => current === previous.title ? '' : current);
      setDescription(current => current === previous.description ? '' : current);
      setCategory(current => current === previous.category ? undefined : current);
      autoPhotoFields.current = null;
      setPriority(PRIORITY.MEDIUM);
    }
    setSuggestion(null);
    const run = ++photoRun.current;
    photoAbort.current?.abort();
    setPhotoError(false);
    setAnalyzing(false);
    if (!photo.base64) { setPhotoError(true); return; }
    const controller = new AbortController();
    photoAbort.current = controller;
    setAnalyzing(true);
    classifyPhoto(photo.base64, chatReport?.language ?? (preferredLanguage === 'hi' ? 'hi' : 'en'), controller.signal)
      .then(result => {
        if (run !== photoRun.current) return;
        const known = COMPLAINT_CATEGORIES.includes(result.category);
        const next = {...result, category: known ? result.category : ('others' as ComplaintCategory)};
        setSuggestion(next);
        if (next.status !== 'issue_visible' || next.confidence !== 'high') return;
        setPriority(next.priority);
        const filled: NonNullable<typeof autoPhotoFields.current> = {};
        autoPhotoFields.current = filled;
        setCategory(current => {
          if (current) return current;
          filled.category = next.category;
          return next.category;
        });
        if (next.summary) {
          setDescription(current => {
            if (current.trim()) return current;
            filled.description = next.summary;
            return next.summary;
          });
          const nextTitle = next.title || CATEGORY_META[next.category].label;
          setTitle(current => {
            if (current.trim()) return current;
            filled.title = nextTitle;
            return nextTitle;
          });
        }
      })
      .catch(() => {
        if (run === photoRun.current) { setSuggestion(null); setPhotoError(true); }
      })
      .finally(() => {
        if (run === photoRun.current) { setAnalyzing(false); photoAbort.current = null; }
      });
  };

  useEffect(() => () => { photoRun.current++; photoAbort.current?.abort(); }, []);

  useEffect(() => {
    if (!location || draft) return;
    if (chatReport && pin && !gpsRequested.current) return;
    gpsRequested.current = false;
    setPin(location);
  }, [location, chatReport, draft, pin]);

  useEffect(() => {
    if (!draft) return;
    setChatReport(draft);
    setTitle(draft.title);
    setDescription(draft.description);
    setCategory(draft.category);
    setPin(null);
    gpsRequested.current = false;
    scroll.current?.scrollTo({y: 0, animated: false});
    navigation.setParams({chatDraft: undefined});
  }, [draft, navigation]);

  const step1Done = title.trim().length > 0 && description.trim().length > 0;
  const step2Done = !!category;
  const step3Done = !!pin;
  const progressFilled = [step1Done, step2Done, step3Done].filter(Boolean).length;
  const canSubmit = step1Done && step2Done && step3Done && phase === 'idle';

  const pickPhoto = () => {
    const apply = (photo: PhotoItem) => {
      setPhotos([photo]);
      analyzePhoto(photo);
    };

    if (Platform.OS === 'web') {
      pickPhotoFromLibrary().then(photo => {
        if (photo) apply(photo);
      });
      return;
    }

    Alert.alert('Add Photo', 'Choose source', [
      {
        text: 'Camera',
        onPress: () => {
          capturePhoto().then(photo => {
            if (photo) apply(photo);
          });
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          pickPhotoFromLibrary().then(photo => {
            if (photo) apply(photo);
          });
        },
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  const useGps = () => {
    gpsRequested.current = true;
    refresh();
  };

  const submit = async () => {
    if (!canSubmit || !category || !pin) return;
    setPhase('submitting');
    try {
      await create(
        {
          title: title.trim(),
          description: description.trim(),
          category,
          priority,
          location: pin,
          isAnonymous,
          aiCategory: suggestion?.status === 'issue_visible' ? suggestion.category : undefined,
          aiSummary: suggestion?.status === 'issue_visible' ? suggestion.summary : undefined,
          language: chatReport?.language ?? (preferredLanguage === 'hi' ? 'hi' : 'en'),
          originalReport: chatReport?.originalReport,
        },
        photos.length ? photos : undefined,
      );
      setPhase('success');
      hapticSuccess();
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 5,
        tension: 120,
        useNativeDriver: true,
      }).start();
      showToast('Report submitted — tracking in History');
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setCategory(undefined);
        setPhotos([]);
        setSuggestion(null);
        setPriority(PRIORITY.MEDIUM);
        setIsAnonymous(false);
        setChatReport(null);
        setPhase('idle');
        checkScale.setValue(0);
        navigation.navigate('History');
      }, 700);
    } catch (err) {
      setPhase('idle');
      Alert.alert('Could not register complaint', getErrorMessage(err));
    }
  };

  const locationPicker = (
    <LocationPreview
      pin={pin}
      onChange={coords => {
        gpsRequested.current = false;
        setPin(coords);
      }}
      onUseGps={useGps}
      loading={locLoading}
      error={locationError}
    />
  );
  const locationSection = (
    <Card elevated>
      <SectionHead
        step={chatReport ? 1 : 3}
        title={chatReport ? 'Set the issue location' : 'Photo & Location'}
        hint={chatReport ? 'Tap the spot on the map, or use GPS if you are there' : 'One clear photo helps a lot'}
      />
      {chatReport ? (
        <Text variant="bodySmall">
          {chatReport.language === 'hi' ? 'समस्या वाली जगह नक्शे पर चुनें। अगर आप वहीं हैं, तो GPS का उपयोग करें।'
            : chatReport.language === 'hinglish' ? 'Problem ki jagah map par tap karein. Agar aap wahin hain, toh GPS use karein.'
              : 'A photo is optional.'}
        </Text>
      ) : null}
      {chatReport ? locationPicker : null}
      <View style={chatReport ? {marginTop: spacing.md} : undefined}>
        <PhotoTile
          photo={photos[0]}
          onAdd={pickPhoto}
          onRetake={() => {
            photoRun.current++;
            photoAbort.current?.abort();
            setAnalyzing(false);
            setPhotoError(false);
            setPhotos([]);
            setSuggestion(null);
            pickPhoto();
          }}
        />
        <AiSuggestionBanner
          analyzing={analyzing}
          suggestion={suggestion}
          selectedCategory={category}
          onApply={() => suggestion && setCategory(suggestion.category)}
        />
        {photoError ? (
          <View style={{gap: 6, marginTop: spacing.sm}}>
            <Text variant="caption">Could not read this photo reliably. You can describe the issue yourself or retry.</Text>
            {photos[0] ? <Button title="Retry photo analysis" variant="ghost" size="sm" onPress={() => analyzePhoto(photos[0])} /> : null}
          </View>
        ) : null}
      </View>
      {!chatReport ? locationPicker : null}
    </Card>
  );

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <Screen scroll={false} edges={['top']} style={{flex: 1}}>
        {/* Light header */}
        <View
          style={{
            backgroundColor: colors.background,
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}>
            <View style={{flex: 1, paddingRight: 12}}>
              <Text
                variant="caption"
                color={colors.neutral500}
                style={{
                  fontFamily: fonts.mono,
                  fontWeight: '700',
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  fontSize: 11,
                }}>
                New complaint
              </Text>
              <Text variant="h1" style={{marginTop: 6, fontFamily: fonts.display}}>
                Report an issue
              </Text>
              <Text variant="body" color={colors.neutral500} style={{marginTop: 4, lineHeight: 22}}>
                Prefer speaking? Use Setu. Or fill the form below.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
              style={{
                width: 36,
                height: 36,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}>
              <AppIcon name="x" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ProgressBar filled={progressFilled} />

        <ScrollView
          ref={scroll}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 120,
            gap: 16,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {chatReport ? locationSection : null}
          <Animate from="up">
            <PressableScale
              disabled={phase !== 'idle'}
              accessibilityRole="button"
              accessibilityLabel="Talk to Setu Assistant"
              accessibilityHint="Speak or type a report instead of using this form"
              onPress={() => navigation.navigate('ReportChat')}
              contentStyle={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 14,
                padding: 14,
                borderRadius: 20,
                backgroundColor: colors.primary,
                borderWidth: 1,
                borderColor: 'rgba(15,61,58,0.12)',
                minHeight: 88,
                opacity: phase !== 'idle' ? 0.55 : 1,
              }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}>
                <SetuAvatar mood="idle" size={60} />
              </View>
              <View style={{flex: 1, minWidth: 0, gap: 3}}>
                <Text
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 17,
                    fontWeight: '700',
                    color: '#FFFFFF',
                  }}>
                  Talk to Setu
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    lineHeight: 18,
                    color: 'rgba(255,255,255,0.88)',
                  }}>
                  Speak or type — faster than the form.
                </Text>
                <Text
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    fontWeight: '600',
                    color: 'rgba(255,255,255,0.7)',
                  }}>
                  English · हिन्दी · اردو · کٲشُر · डोगरी
                </Text>
              </View>
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: colors.action,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppIcon name="mic" size={20} color="#FFFFFF" strokeWidth={2.4} />
              </View>
            </PressableScale>
          </Animate>
          {/* Step 1 */}
          <Card elevated>
            <SectionHead
              step={chatReport ? 2 : 1}
              title="What's wrong?"
              hint="Keep it short and clear"
            />
            <Input
              label="Title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Overflowing drain near market"
              containerStyle={{marginBottom: 8}}
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe what you see, landmarks, urgency…"
              multiline
              numberOfLines={5}
              maxLengthShow={DESC_MAX}
              style={{minHeight: 120, textAlignVertical: 'top'}}
              containerStyle={{marginBottom: 0}}
            />
          </Card>

          {/* Step 2 — Category grid */}
          <Card elevated>
            <SectionHead
              step={chatReport ? 3 : 2}
              title="Category"
              hint="Pick the closest match"
            />
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
              }}>
              {COMPLAINT_CATEGORIES.map(cat => {
                const meta = CATEGORY_META[cat];
                return (
                  <View key={cat} style={{width: '48%', flexGrow: 1, maxWidth: '48.5%'}}>
                    <CategoryChip
                      icon={meta.icon}
                      label={meta.label}
                      color={meta.color}
                      selected={category === cat}
                      onPress={() => setCategory(cat)}
                      layout="column"
                    />
                  </View>
                );
              })}
            </View>
          </Card>

          {!chatReport ? locationSection : null}

          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radius.xl,
              padding: 14,
              ...shadows.sm,
            }}>
            <Checkbox
              checked={isAnonymous}
              onChange={setIsAnonymous}
              label="Report anonymously"
            />
          </View>
        </ScrollView>
      </Screen>

      {/* Sticky submit bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          ...shadows.card,
        }}>
        <PressableScale
          onPress={submit}
          disabled={!canSubmit && phase === 'idle'}
          contentStyle={{
            height: 54,
            borderRadius: radius.md,
            backgroundColor:
              phase === 'success'
                ? colors.success
                : canSubmit || phase === 'submitting'
                  ? colors.action
                  : colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: !canSubmit && phase === 'idle' ? 0.7 : 1,
          }}>
          {phase === 'submitting' || storeLoading ? (
            <>
              <ActivityIndicator color="#FFF" />
              <Text variant="button" color="#FFF">
                Submitting…
              </Text>
            </>
          ) : phase === 'success' ? (
            <Animated.View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                transform: [{scale: checkScale}],
              }}>
              <AppIcon name="check-circle" size={22} color="#FFF" />
              <Text variant="button" color="#FFF">
                Submitted
              </Text>
            </Animated.View>
          ) : (
            <>
              <AppIcon
                name="map-pin"
                size={20}
                color={canSubmit ? '#FFF' : colors.neutral500}
              />
              <Text
                variant="button"
                color={canSubmit ? '#FFF' : colors.neutral500}>
                Submit report
              </Text>
            </>
          )}
        </PressableScale>
      </View>
    </View>
  );
}
