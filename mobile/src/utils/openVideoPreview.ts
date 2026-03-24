import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

function isRemoteUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://');
}

export async function openVideoPreview(uri: string) {
  if (isRemoteUrl(uri)) {
    await WebBrowser.openBrowserAsync(uri, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
      controlsColor: '#16a34a',
    });
    return;
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      dialogTitle: 'Preview video',
      mimeType: 'video/mp4',
      UTI: 'public.movie',
    });
    return;
  }

  await Linking.openURL(uri);
}
