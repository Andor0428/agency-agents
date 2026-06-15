import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { StatusMessage } from '@/components/ui/StatusMessage';
import { colors, spacing, typography } from '@/config/theme';
import { getRepositories } from '@/services/db';
import { applyCount } from '@/services/voicePipeline/apply';
import { useActiveSession } from '@/hooks/useActiveSession';
import type { Item } from '@/types';

export default function ScanScreen() {
  const router = useRouter();
  const { ensureSession } = useActiveSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [foundItem, setFoundItem] = useState<Item | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const lookupBarcode = useCallback(async (data: string) => {
    const repos = await getRepositories();
    const item = await repos.items.getByBarcode(data);
    setFoundItem(item);
    if (!item) {
      setStatus(`No item found for "${data}"`);
    } else {
      setStatus(`Found: ${item.name}${item.size ? ` · size ${item.size}` : ''}`);
    }
  }, []);

  const handleBarcode = useCallback(
    async ({ data }: { data: string }) => {
      if (scanned) return;
      setScanned(true);
      await lookupBarcode(data);
    },
    [lookupBarcode, scanned]
  );

  const handleQuickCount = async (quantity: number) => {
    if (!foundItem) return;
    const session = await ensureSession();
    const repos = await getRepositories();
    await applyCount(repos, {
      sessionId: session.id,
      item: foundItem,
      spokenQuantity: quantity,
      rawTranscript: `scan ${foundItem.sku ?? foundItem.name} ${quantity}`,
      confidenceScore: 100,
    });
    Alert.alert('Counted', `${foundItem.name}: +${quantity}`, [
      { text: 'Scan again', onPress: () => { setScanned(false); setFoundItem(null); setStatus(null); } },
      { text: 'Done', onPress: () => router.back() },
    ]);
  };

  if (!permission) {
    return <Screen title="Scan barcode"><Text style={styles.hint}>Checking camera permission…</Text></Screen>;
  }

  if (!permission.granted) {
    return (
      <Screen title="Scan barcode" subtitle="Look up items by barcode or SKU">
        <Text style={styles.hint}>Camera access is required to scan barcodes.</Text>
        <Button label="Grant camera access" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <Screen title="Scan barcode" subtitle="Point at a barcode or SKU label" scroll={false}>
      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr', 'upc_a', 'upc_e'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcode}
        />
      </View>

      {status ? <StatusMessage message={status} variant={foundItem ? 'success' : 'warning'} live /> : null}

      {foundItem ? (
        <View style={styles.actions}>
          <Button label="Count +1" onPress={() => handleQuickCount(1)} />
          <Button label="Count +5" onPress={() => handleQuickCount(5)} variant="secondary" />
          <Button
            label="View item"
            variant="ghost"
            onPress={() => router.push(`/catalog/${foundItem.id}`)}
          />
        </View>
      ) : null}

      {scanned ? (
        <Button
          label="Scan again"
          variant="secondary"
          onPress={() => {
            setScanned(false);
            setFoundItem(null);
            setStatus(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  camera: {
    flex: 1,
  },
  hint: {
    ...typography.body,
    color: colors.textMuted,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
