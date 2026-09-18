"use client";
import { useRef, useState } from "react";
import { FaPlay, FaRedo } from "react-icons/fa";

interface VideoShowcaseProps {
  src: string;
  poster?: string;
  className?: string;
}

export default function VideoShowcase({ src, poster = "/videos/video-poster.webp", className = "" }: VideoShowcaseProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // Whether playback has ever started. Deliberately separate from "is it
  // currently playing right now" — native controls should stay on once the
  // video has started, through every later pause/resume. Previously this
  // was tied to the live playing state, so every pause flipped
  // controls={false} back on, which yanks the browser's control bar off
  // and drops the pulsing custom play button back over the frozen frame —
  // that flash + pulse-ring is what read as the video "blinking".
  const [hasStarted, setHasStarted] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handlePlay() {
    const v = videoRef.current;
    if (!v) return;
    setFailed(false);
    try {
      // preload="none" means some browsers haven't even started fetching
      // the source yet at this point — explicitly loading first makes the
      // play attempt reliable instead of racing an empty buffer.
      if (v.readyState === 0) v.load();
      // Awaiting play() (rather than firing-and-forgetting it) means a
      // failed playback attempt — bad/blocked source, unsupported codec,
      // a stale/broken URL, etc. — surfaces as the retry state below
      // instead of silently leaving a blank, frozen video.
      await v.play();
      setHasStarted(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div
      className={`group relative mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-[2rem] border-4 border-white/80 bg-black shadow-2xl ring-1 ring-black/10 dark:border-white/10 ${className}`}
    >
      <video
        // Remounts the <video> element whenever the source actually
        // changes (e.g. the admin uploads a new video) instead of trying
        // to reuse a media element that may already be in an error state
        // from a previous/broken src.
        key={src}
        ref={videoRef}
        src={src}
        poster={poster}
        controls={hasStarted}
        playsInline
        preload="none"
        onEnded={() => setHasStarted(false)}
        onError={() => {
          setHasStarted(false);
          setFailed(true);
        }}
        className="h-full w-full object-cover"
      />
      {!hasStarted && !failed && (
        <button
          type="button"
          onClick={handlePlay}
          aria-label="Play video"
          className="absolute inset-0 grid place-items-center bg-black/25 transition group-hover:bg-black/35"
        >
          <span className="animate-pulse-ring grid h-16 w-16 place-items-center rounded-full bg-white/95 text-ember-600 shadow-xl transition-transform group-hover:scale-105">
            <FaPlay className="ml-1 h-6 w-6" />
          </span>
        </button>
      )}
      {failed && (
        <button
          type="button"
          onClick={handlePlay}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 px-4 text-center text-sm text-white"
        >
          <FaRedo className="h-5 w-5" />
          <span>Couldn't play this video. Tap to retry.</span>
        </button>
      )}
      {!hasStarted && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/30 to-transparent" />
      )}
    </div>
  );
}
