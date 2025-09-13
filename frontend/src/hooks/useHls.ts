import { useEffect, useRef } from "react";
import Hls from "hls.js";

export function useHls(src: string | null, videoRef: React.RefObject<HTMLVideoElement | null>) {
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;
    const isHls = src.includes(".m3u8");

    // Check if browser supports native HLS (Safari/iOS)
    const hasNativeHls = video.canPlayType("application/vnd.apple.mpegurl");

    if (isHls && !hasNativeHls) {
      // Use hls.js for non-Safari browsers
      if (Hls.isSupported()) {
        hlsRef.current = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });

        hlsRef.current.loadSource(src);
        hlsRef.current.attachMedia(video);

        hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
          console.error("HLS error:", data);
        });
      } else {
        console.error("HLS.js not supported in this browser");
      }
    } else if (isHls && hasNativeHls) {
      // Use native HLS for Safari
      video.src = src;
    } else {
      video.src = src;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, videoRef]);

  return hlsRef.current;
}
