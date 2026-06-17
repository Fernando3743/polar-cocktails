"use client";

import { useRef, useState } from "react";
import { VolumeMutedIcon } from "@/components/icons";
import { Container } from "@/components/ui/Container";

// Served from Supabase Storage (site-assets bucket) in deployed/cloud mode; falls
// back to the local public/ file for offline dev. Set NEXT_PUBLIC_HOME_VIDEO_URL
// in the cloud env profile.
//
// IMPORTANT: the committed asset is a 21MB QuickTime .mov (H.264 inside a MOV
// container), which Chrome/Firefox/Edge will not reliably play. The MP4 source
// below is preferred so desktop browsers get a playable file; the .mov is kept
// only as a last-resort source (mainly for Safari). To make the MP4 real, the
// file `public/PANTALLA POLAR 2.mov` must be transcoded to H.264/AAC MP4 and
// placed alongside it as `public/PANTALLA POLAR 2.mp4` (or referenced via
// NEXT_PUBLIC_HOME_VIDEO_URL). ffmpeg example:
//   ffmpeg -i "PANTALLA POLAR 2.mov" -c:v libx264 -c:a aac -movflags +faststart "PANTALLA POLAR 2.mp4"
const VIDEO_SRC_MP4 =
  process.env.NEXT_PUBLIC_HOME_VIDEO_URL || "/PANTALLA%20POLAR%202.mp4";
const VIDEO_SRC_MOV = "/PANTALLA%20POLAR%202.mov";

export function HomeVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);

  function syncSoundState(video: HTMLVideoElement) {
    setSoundEnabled(!video.muted && video.volume > 0 && !video.paused);
  }

  async function handleEnableSound() {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1;

    try {
      await video.play();
      syncSoundState(video);
    } catch {
      // Revert the imperative mutation so the element state and React state stay
      // consistent (browser blocked unmuted autoplay/play).
      video.muted = true;
      setSoundEnabled(false);
    }
  }

  return (
    <section className="py-14 md:py-20">
      <Container>
        <div className="mx-auto max-w-[980px]">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="eyebrow">Polar en movimiento</p>
              <h2 className="mt-3 font-display text-[30px] font-700 leading-tight text-polar-text md:text-[44px]">
                Mira la experiencia <span className="text-polar-magenta">Polar</span>
              </h2>
            </div>
            <p className="max-w-[360px] text-sm leading-relaxed text-polar-muted md:text-right">
              Frescura, color y granizados listos para compartir.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[8px] border border-[rgba(177,93,255,0.22)] bg-black shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
            {videoFailed ? (
              <div className="flex aspect-video w-full items-center justify-center bg-black px-6 text-center text-sm leading-relaxed text-polar-muted">
                El video no se pudo reproducir en este navegador.
              </div>
            ) : (
              // Decorative/ambient clip: no spoken content, so no captions track
              // is required. The aria-label gives assistive tech a short name.
              <video
                ref={videoRef}
                aria-label="Video ambiental de la experiencia Polar"
                className="block aspect-video w-full bg-black object-cover"
                autoPlay
                controls
                loop
                muted
                onError={() => setVideoFailed(true)}
                onPause={(event) => syncSoundState(event.currentTarget)}
                onPlay={(event) => syncSoundState(event.currentTarget)}
                onVolumeChange={(event) => {
                  syncSoundState(event.currentTarget);
                }}
                playsInline
                preload="metadata"
              >
                {/* MP4 first so Chrome/Firefox/Edge get a playable file. */}
                <source src={VIDEO_SRC_MP4} type="video/mp4" />
                {/* QuickTime .mov kept as a last resort (mainly Safari). */}
                <source src={VIDEO_SRC_MOV} />
                El video no se pudo reproducir en este navegador.
              </video>
            )}
            {!videoFailed && !soundEnabled && (
              <button
                type="button"
                aria-label="Activar sonido del video"
                title="Activar sonido"
                onClick={handleEnableSound}
                className="absolute right-3 top-3 z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.2)] bg-black/66 text-white shadow-[0_12px_34px_rgba(0,0,0,0.56)] backdrop-blur-md transition-colors hover:border-[rgba(177,93,255,0.5)] hover:bg-[rgba(36,16,72,0.82)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-polar-purple md:right-4 md:top-4 md:h-[60px] md:w-[60px]"
              >
                <VolumeMutedIcon className="h-7 w-7 md:h-8 md:w-8" />
              </button>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
