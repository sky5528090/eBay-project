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
    window.addEventListener("branding-settings-updated", onCustom);
    window.addEventListener("storage", onStorage);
    return () => { window.removeEventListener("branding-settings-updated", onCustom); window.removeEventListener("storage", onStorage); };
  }, []);
  const current = liveOverride ?? settings.data;
  const size = current?.smileSize ?? 72;
  const opacity = (current?.smileOpacity ?? 18) / 100;
  const photoUrl = current?.brandPhotoUrl ?? smileAssetUrl;
  const photoScale = (current?.brandPhotoScale ?? 100) / 100;
  const objectPosition = `${current?.brandPhotoPositionX ?? 50}% ${current?.brandPhotoPositionY ?? 50}%`;
  const isPhoto = Boolean(current?.brandPhotoUrl);
  return <img className={`smile-watermark ${isPhoto ? "brand-photo-watermark" : ""}`} src={photoUrl} alt="" aria-hidden="true" style={{ width: `${size}px`, height: `${size}px`, opacity, objectPosition, transform: `scale(${photoScale})` }} />;
}

export { smileAssetUrl };
