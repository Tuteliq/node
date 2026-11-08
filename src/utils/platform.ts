const SDK_IDENTIFIER = 'Node SDK';

/**
 * Resolves the platform string by appending the SDK identifier.
 * - "MyApp" → "MyApp - Node SDK"
 * - undefined → "Node SDK"
 */
export function resolvePlatform(platform?: string): string {
    if (platform && platform.length > 0) {
        return `${platform} - ${SDK_IDENTIFIER}`;
    }
    return SDK_IDENTIFIER;
}
