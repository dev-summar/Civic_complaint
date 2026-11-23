import React, {useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  Platform,
  TouchableWithoutFeedback,
  TextInput,
} from 'react-native';
import {useTheme} from '@/theme';
import {Text} from './Text';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  maxLengthShow?: number;
}

export function Input({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  style,
  onFocus,
  onBlur,
  onPressIn,
  maxLengthShow,
  value,
  secureTextEntry,
  autoComplete,
  textContentType,
  importantForAutofill,
  autoCorrect,
  editable = true,
  ...props
}: InputProps) {
  const {colors, radius, spacing, typography} = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const length = typeof value === 'string' ? value.length : 0;
  const {fontFamily: _ignoredFont, ...bodyType} = typography.body;

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <View style={[{marginBottom: spacing.lg}, containerStyle]} collapsable={false}>
      {label ? (
        <Text variant="label" style={{marginBottom: spacing.sm}}>
          {label}
        </Text>
      ) : null}
      <View
        collapsable={false}
        style={[
          styles.wrap,
          {
            backgroundColor: colors.inputBg,
            borderColor: error
              ? colors.error
              : focused
                ? colors.action
                : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            borderWidth: 1.5,
          },
        ]}>
        <TouchableWithoutFeedback
          disabled={!editable}
          onPress={focusInput}
          accessible={false}>
          <View collapsable={false} style={styles.fieldPress}>
            {leftIcon ? (
              <View pointerEvents="none" style={styles.leftIcon}>
                {leftIcon}
              </View>
            ) : null}
            <TextInput
              ref={inputRef}
              {...props}
              placeholderTextColor={colors.neutral500}
              value={value}
              maxLength={maxLengthShow}
              cursorColor={colors.action}
              selectionColor={colors.action}
              underlineColorAndroid="transparent"
              editable={editable}
              secureTextEntry={secureTextEntry}
              autoCorrect={secureTextEntry ? false : autoCorrect}
              autoComplete={
                autoComplete ?? (secureTextEntry ? 'password' : undefined)
              }
              textContentType={
                textContentType ?? (secureTextEntry ? 'password' : undefined)
              }
              importantForAutofill={importantForAutofill ?? 'auto'}
              showSoftInputOnFocus
              style={[
                styles.input,
                {
                  ...bodyType,
                  color: colors.text,
                  paddingVertical: spacing.md,
                  fontFamily:
                    Platform.OS === 'ios' ? typography.body.fontFamily : undefined,
                },
                style,
              ]}
              onPressIn={e => {
                onPressIn?.(e);
                focusInput();
              }}
              onFocus={e => {
                setFocused(true);
                onFocus?.(e);
              }}
              onBlur={e => {
                setFocused(false);
                onBlur?.(e);
              }}
            />
          </View>
        </TouchableWithoutFeedback>
        {rightIcon ? <View style={styles.rightIcon}>{rightIcon}</View> : null}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: spacing.xs,
        }}>
        {error ? (
          <Text variant="caption" color={colors.error} style={{flex: 1}}>
            {error}
          </Text>
        ) : (
          <View />
        )}
        {maxLengthShow != null ? (
          <Text variant="caption" color={colors.neutral500}>
            {length}/{maxLengthShow}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldPress: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 48,
    padding: 0,
    margin: 0,
  },
  leftIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rightIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});

export default Input;
