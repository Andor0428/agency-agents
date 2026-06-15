import NetInfo from '@react-native-community/netinfo';

export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  if (state.isConnected !== true) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}
