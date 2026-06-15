import { useCallback, useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors, spacing, typography } from '@/config/theme';
import { snapFillLevel } from '@/services/business';

interface FillLevelSliderProps {
  value: number;
  granularity: number;
  containerSize: number | null;
  baseUnit: string;
  onChange: (value: number) => void;
}

export function FillLevelSlider({
  value,
  granularity,
  containerSize,
  baseUnit,
  onChange,
}: FillLevelSliderProps) {
  const heightRef = useRef(200);

  const setFromY = useCallback(
    (locationY: number) => {
      const height = heightRef.current;
      const raw = 1 - locationY / height;
      onChange(snapFillLevel(raw, granularity));
    },
    [granularity, onChange]
  );

  const onLayout = (event: LayoutChangeEvent) => {
    heightRef.current = event.nativeEvent.layout.height;
  };

  const volume =
    containerSize != null ? Math.round(value * containerSize) : null;
  const pct = Math.round(value * 100);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        Fill level: {pct}%{volume != null ? ` · ${volume}${baseUnit}` : ''}
      </Text>

      <View style={styles.row}>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel="Bottle fill level slider"
          accessibilityValue={{ min: 0, max: 100, now: pct }}
          onLayout={onLayout}
          onPress={(e) => setFromY(e.nativeEvent.locationY)}
          style={styles.bottle}
        >
          <View style={styles.bottleInner}>
            <View style={[styles.liquid, { height: `${pct}%` }]} />
            {[0.25, 0.5, 0.75].map((mark) => (
              <View key={mark} style={[styles.mark, { bottom: `${mark * 100}%` }]} />
            ))}
          </View>
          <View style={styles.neck} />
        </Pressable>

        <View style={styles.controls}>
          <Button
            label="+"
            accessibilityLabel="Increase fill level"
            variant="secondary"
            onPress={() => onChange(snapFillLevel(value + granularity, granularity))}
            style={styles.stepBtn}
          />
          <Button
            label="−"
            accessibilityLabel="Decrease fill level"
            variant="secondary"
            onPress={() => onChange(snapFillLevel(value - granularity, granularity))}
            style={styles.stepBtn}
          />
          <Button label="Full" accessibilityLabel="Set fill level to full" variant="ghost" onPress={() => onChange(1)} />
          <Button label="Empty" accessibilityLabel="Set fill level to empty" variant="ghost" onPress={() => onChange(0)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  bottle: {
    width: 72,
    height: 200,
    alignItems: 'center',
  },
  bottleInner: {
    flex: 1,
    width: '100%',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  liquid: {
    width: '100%',
    backgroundColor: colors.accentMuted,
  },
  mark: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  neck: {
    width: 28,
    height: 16,
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: colors.border,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: colors.surfaceElevated,
  },
  controls: {
    gap: spacing.xs,
    flex: 1,
  },
  stepBtn: {
    minHeight: 44,
  },
});
