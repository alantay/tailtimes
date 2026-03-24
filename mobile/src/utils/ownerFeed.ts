const configuredOwnerFeedUrl = process.env.EXPO_PUBLIC_OWNER_FEED_URL?.trim();
const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function inferOwnerFeedBaseUrl() {
  if (!apiBaseUrl) {
    return 'https://tailtimes.app';
  }

  try {
    const apiUrl = new URL(apiBaseUrl);

    if (apiUrl.port === '3001') {
      apiUrl.port = '3002';
      return stripTrailingSlash(apiUrl.toString());
    }

    return stripTrailingSlash(apiUrl.toString());
  } catch {
    return 'https://tailtimes.app';
  }
}

export function getOwnerFeedBaseUrl() {
  if (configuredOwnerFeedUrl) {
    return stripTrailingSlash(configuredOwnerFeedUrl);
  }

  return inferOwnerFeedBaseUrl();
}

export function buildOwnerFeedUrl(shareLink: string) {
  return `${getOwnerFeedBaseUrl()}/s/${shareLink}`;
}
