/**
 * Platform detection for PointPals.
 *
 * Provides a single `isNative()` check so UI can vary behaviour per platform
 * (Capacitor iOS/Android build vs. web/PWA). PointPals is free, so there is
 * no store/payment gating tied to this.
 */

const _native = !!(globalThis as any).Capacitor?.isNativePlatform?.();

/** True when running inside the Capacitor WebView (iOS App Store / Play Store build). */
export function isNative(): boolean {
  return _native;
}

/** True when running in a web browser PWA. */
export function isWeb(): boolean {
  return !_native;
}

export async function isNativePlatform(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
