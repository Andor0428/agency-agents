import * as SecureStore from 'expo-secure-store';

const DEVICE_ID_KEY = 'stocktake_device_id';
const DEVICE_SECRET_KEY = 'stocktake_device_secret';

export type DeviceCredentials = {
  deviceId: string;
  deviceSecret: string;
  orgId: string;
};

export async function loadDeviceCredentials(): Promise<DeviceCredentials | null> {
  const deviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  const deviceSecret = await SecureStore.getItemAsync(DEVICE_SECRET_KEY);
  const orgId = await SecureStore.getItemAsync('stocktake_org_id');
  if (!deviceId || !deviceSecret || !orgId) return null;
  return { deviceId, deviceSecret, orgId };
}

export async function saveDeviceCredentials(credentials: DeviceCredentials): Promise<void> {
  await SecureStore.setItemAsync(DEVICE_ID_KEY, credentials.deviceId);
  await SecureStore.setItemAsync(DEVICE_SECRET_KEY, credentials.deviceSecret);
  await SecureStore.setItemAsync('stocktake_org_id', credentials.orgId);
}

export async function clearDeviceCredentials(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
  await SecureStore.deleteItemAsync(DEVICE_SECRET_KEY);
  await SecureStore.deleteItemAsync('stocktake_org_id');
}
