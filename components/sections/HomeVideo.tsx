"use client";

import { useEffect, useRef, useState } from "react";
import { VolumeMutedIcon } from "@/components/icons";
import { Container } from "@/components/ui/Container";

// Served from Supabase Storage (site-assets bucket) in deployed/cloud mode; falls
// back to the local public/ file for offline dev. Set NEXT_PUBLIC_HOME_VIDEO_URL
// in the cloud env profile.
//
// The committed asset is `public/PANTALLA POLAR 2.mp4` (H.264/AAC), which plays
// in every modern browser including Safari. To regenerate it from a source clip:
//   ffmpeg -i "<source>" -c:v libx264 -c:a aac -movflags +faststart "PANTALLA POLAR 2.mp4"
const VIDEO_SRC_MP4 =
  process.env.NEXT_PUBLIC_HOME_VIDEO_URL || "/PANTALLA%20POLAR%202.mp4";

// Lightweight still frame shown before the clip is fetched. Keeps the box from
// flashing black and gives the lazy load something to paint immediately.
const VIDEO_POSTER =
  process.env.NEXT_PUBLIC_HOME_VIDEO_POSTER_URL || "/polar-video-poster.jpg";

export function HomeVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  // The clip lives below the fold and weighs a couple of MB, so we defer its
  // network request until the section is about to scroll into view instead of
  // letting autoplay pull it during initial page load.
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No observer support: load on the next tick so we never trigger a
      // synchronous re-render from inside the effect body.
      const timer = setTimeout(() => setShouldLoad(true), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoad]);

  useEffect(() => {
    const video = videoRef.current;
    if (!shouldLoad || !video) return;
    // Pick up the <source> that just mounted, then start the muted ambient loop.
    video.load();
    video.play().catch(() => {
      // Autoplay can be blocked; the poster + controls remain as the fallback.
    });
  }, [shouldLoad]);

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

          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-[8px] border border-[rgba(177,93,255,0.22)] bg-black shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
          >
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
                loop
                muted
                onError={() => setVideoFailed(true)}
                onPause={(event) => syncSoundState(event.currentTarget)}
                onPlay={(event) => syncSoundState(event.currentTarget)}
                onVolumeChange={(event) => {
                  syncSoundState(event.currentTarget);
                }}
                playsInline
                poster={VIDEO_POSTER}
                preload={shouldLoad ? "auto" : "none"}
              >
                {shouldLoad && <source src={VIDEO_SRC_MP4} type="video/mp4" />}
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
