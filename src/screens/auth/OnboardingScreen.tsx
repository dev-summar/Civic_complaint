import React from 'react';
import {View, StyleSheet, Dimensions} from 'react-native';
import {TouchableOpacity} from '@/components/ui/TouchableOpacity';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '@/navigation/types';
import {Screen, AppIcon, Text, IconName, BrandWordmark} from '@/components/ui';
import {useTheme} from '@/theme';
import {useAppStore} from '@/store/appStore';
import {t} from '@/utils/i18n';
import {BRAND} from '@/constants';
import {fonts} from '@/theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const {width} = Dimensions.get('window');

const slides: {icon: IconName; title: string; desc: string}[] = [
  {icon: 'map-pin', title: 'Report with GPS', desc: 'Pin exact geo-tagged locations for civic resolution'},
  {icon: 'camera', title: 'Photo Evidence', desc: 'Attach photos and track resolution progress'},
  {icon: 'bell', title: 'Real-time Updates', desc: 'Get notified when your complaint is resolved'},
];

export default function OnboardingScreen({navigation}: Props) {
  const {colors, spacing} = useTheme();
  const setOnboardingComplete = useAppStore(s => s.setOnboardingComplete);

  const goToLogin = () => {
    setOnboardingComplete(true).catch(() => {});
    navigation.navigate('Login');
  };

  const goToSignup = () => {
    setOnboardingComplete(true).catch(() => {});
    navigation.navigate('Signup');
  };

  return (
    <Screen frame="narrow" contentStyle={{padding: spacing.xl, justifyContent: 'center'}}>
      <View style={{alignItems: 'center', marginBottom: spacing.xxxl}}>
        <BrandWordmark size="lg" style={{marginBottom: spacing.md}} />
        <Text
          variant="caption"
          color={colors.neutral500}
          center
          style={{
            marginTop: spacing.xs,
            fontFamily: fonts.mono,
            fontWeight: '700',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            fontSize: 11,
          }}>
          {BRAND.name} • {BRAND.meaning}
        </Text>
        <Text
          variant="body"
          secondary
          center
          style={{marginTop: spacing.sm, maxWidth: width * 0.8}}>
          {t('tagline')}
        </Text>
      </View>

      {slides.map(slide => (
        <View
          key={slide.title}
          style={[
            styles.slide,
            {
              gap: spacing.lg,
              marginBottom: spacing.xl,
              paddingHorizontal: spacing.md,
            },
          ]}>
          <AppIcon name={slide.icon} size={28} color={colors.primary} />
          <View style={styles.slideText}>
            <Text variant="label">{slide.title}</Text>
            <Text variant="bodySmall" secondary style={{marginTop: 2}}>
              {slide.desc}
            </Text>
          </View>
        </View>
      ))}

      <View style={{gap: spacing.md, marginTop: spacing.xl}}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={goToLogin}
          style={[
            styles.btn,
            {
              backgroundColor: colors.action,
              borderRadius: 12,
              minHeight: 50,
            },
          ]}>
          <Text variant="button" style={{color: colors.white}}>
            {t('login')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.75}
          onPress={goToSignup}
          style={[
            styles.btn,
            {
              backgroundColor: 'transparent',
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: colors.primary,
              minHeight: 50,
            },
          ]}>
          <Text variant="button" style={{color: colors.primary}}>
            {t('signup')}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  slide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slideText: {
    flex: 1,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
});
