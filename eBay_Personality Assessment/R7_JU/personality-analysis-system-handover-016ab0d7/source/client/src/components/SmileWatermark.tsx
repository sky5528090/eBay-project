import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

type BrandingSnapshot = { brandPhotoUrl?: string | null; smileSize?: number; smileOpacity?: number; brandPhotoPositionX?: number; brandPhotoPositionY?: number; brandPhotoScale?: number };

const smileAssetUrl = "/manus-storage/smile-black-transparent_bb9c220a.png";

export default function SmileWatermark() {
  const settings = trpc.adminTools.branding.public.useQuery(undefined, { staleTime: 0, gcTime: 300_000, refetchInterval: 5_000, refetchOnWindowFocus: true, refetchOnReconnect: true });
  const [liveOverride, setLiveOverride] = useState<BrandingSnapshot | null>(null);
  useEffect(() => {
    const apply = (value: unknown) => { if (value && typeof value === "object") setLiveOverride(value as BrandingSnapshot); };
    const onCustom = (event: Event) => apply((event as CustomEvent<BrandingSnapshot>).detail);
    const onStorage = (event: StorageEvent) => { if (event.key !== "personality-branding-settings" || !event.newValue) return; try { apply(JSON.parse(event.newValue)); } catch { /* ignore malformed storage */ } };
    const onChannel = (event: MessageEvent<BrandingSnapshot>) => apply(event.data);
    const onVisibility = () => { if (document.visibilityState === "visible") { setLiveOverride(null); void settings.refetch(); } };
    try { const stored = window.localStorage.getItem("personality-branding-settings"); if (stored) apply(JSON.parse(stored)); } catch { /* ignore unavailable or malformed storage */ }
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("personality-branding-settings-v1") : null;
    window.addEventListener("branding-settings-updated", onCustom);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    channel?.addEventListener("message", onChannel);
    return () => { window.removeEventListener("branding-settings-updated", onCustom); window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVisibility); channel?.removeEventListener("message", onChannel); channel?.close(); };
  }, [settings.refetch]);
  const current = liveOverride ?? settings.data;
  const size = current?.smileSize ?? 72;
  const opacity = (current?.smileOpacity ?? 18) / 100;
  const photoUrl = current?.brandPhotoUrl ?? smileAssetUrl;
  const photoScale = (current?.brandPhotoScale ?? 100) / 100;
  const objectPosition = `${current?.brandPhotoPositionX ?? 50}% ${current?.brandPhotoPositionY ?? 50}%`;
  const isPhoto = Boolean(current?.brandPhotoUrl);
  return <img className={`smile-watermark ${isPhoto ? "brand-photo-watermark" : ""}`} src={photoUrl} alt="個人特質分析品牌微笑圖示" style={{ width: `${size}px`, height: `${size}px`, opacity, objectPosition, transform: `scale(${photoScale})` }} />;
}

export { smileAssetUrl };
