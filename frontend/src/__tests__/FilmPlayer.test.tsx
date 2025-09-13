import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import FilmPlayer from "@/components/FilmPlayer";

// Mock video element
const mockVideo = {
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  load: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  duration: 100,
  currentTime: 0,
  volume: 1,
  muted: false,
  playbackRate: 1,
  canPlayType: vi.fn().mockReturnValue(""),
  requestPictureInPicture: vi.fn(),
};

// Mock HTMLVideoElement
Object.defineProperty(HTMLVideoElement.prototype, "play", {
  writable: true,
  value: mockVideo.play,
});

Object.defineProperty(HTMLVideoElement.prototype, "pause", {
  writable: true,
  value: mockVideo.pause,
});

Object.defineProperty(HTMLVideoElement.prototype, "load", {
  writable: true,
  value: mockVideo.load,
});

Object.defineProperty(HTMLVideoElement.prototype, "addEventListener", {
  writable: true,
  value: mockVideo.addEventListener,
});

Object.defineProperty(HTMLVideoElement.prototype, "removeEventListener", {
  writable: true,
  value: mockVideo.removeEventListener,
});

Object.defineProperty(HTMLVideoElement.prototype, "duration", {
  writable: true,
  value: mockVideo.duration,
});

Object.defineProperty(HTMLVideoElement.prototype, "currentTime", {
  writable: true,
  value: mockVideo.currentTime,
});

Object.defineProperty(HTMLVideoElement.prototype, "volume", {
  writable: true,
  value: mockVideo.volume,
});

Object.defineProperty(HTMLVideoElement.prototype, "muted", {
  writable: true,
  value: mockVideo.muted,
});

Object.defineProperty(HTMLVideoElement.prototype, "playbackRate", {
  writable: true,
  value: mockVideo.playbackRate,
});

Object.defineProperty(HTMLVideoElement.prototype, "canPlayType", {
  writable: true,
  value: mockVideo.canPlayType,
});

Object.defineProperty(HTMLVideoElement.prototype, "requestPictureInPicture", {
  writable: true,
  value: mockVideo.requestPictureInPicture,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock document methods
Object.defineProperty(document, "exitFullscreen", {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(document, "exitPictureInPicture", {
  writable: true,
  value: vi.fn(),
});

describe("FilmPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it("renders play button and calls play when clicked", async () => {
    render(<FilmPlayer src="test.mp4" />);
    
    const playButton = screen.getByLabelText("Play");
    expect(playButton).toBeInTheDocument();
    
    fireEvent.click(playButton);
    
    await waitFor(() => {
      expect(mockVideo.play).toHaveBeenCalled();
    });
  });

  it("changes playback rate and persists to localStorage", async () => {
    render(<FilmPlayer src="test.mp4" />);
    
    const rateSelect = screen.getByLabelText("Playback speed");
    expect(rateSelect).toBeInTheDocument();
    
    fireEvent.change(rateSelect, { target: { value: "0.5" } });
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith("filmRate", "0.5");
    });
  });

  it("responds to spacebar keyboard shortcut", async () => {
    render(<FilmPlayer src="test.mp4" />);
    
    fireEvent.keyDown(document, { code: "Space" });
    
    await waitFor(() => {
      expect(mockVideo.play).toHaveBeenCalled();
    });
  });

  it("shows error state when no src is provided", () => {
    render(<FilmPlayer src={null} />);
    
    expect(screen.getByText("Film not available")).toBeInTheDocument();
    expect(screen.getByText("No video source provided")).toBeInTheDocument();
  });
});
