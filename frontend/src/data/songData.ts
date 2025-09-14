export type SongItem = {
  id: string;
  file: string; // public path to .mp3
  title: string;
  author: string;
  duration: string; // mm:ss for now
};

export type SongCategory = {
  id: string;
  name: string;
  songs: SongItem[];
};

export const songCategories: SongCategory[] = [
  {
    id: "top-loved",
    name: "Top Loved",
    songs: [
      { id: "sf-1", file: "/songs/song1.mp3", title: "Careless Whisper", author: "A. Nova", duration: "02:14" },
      { id: "sf-2", file: "/songs/avengerepicsounds.mp3", title: "Avenger Epic Sounds", author: "R. Pulse", duration: "03:01" },
      { id: "sf-3", file: "/songs/slowtrap.mp3", title: "Slow Track Sounds", author: "R. Pulse", duration: "03:01" },

    ],
  },
  {
    id: "horror",
    name: "Horror",
    songs: [
      { id: "ho-1", file: "/songs/sample-1.mp3", title: "Creaking Hall", author: "D. Shade", duration: "01:45" },
      { id: "ho-2", file: "/songs/sample-2.mp3", title: "Whisper Fog", author: "M. Gloom", duration: "02:37" },
    ],
  },
  {
    id: "movies",
    name: "Movies",
    songs: [
      { id: "mv-1", file: "/songs/sample-1.mp3", title: "Final Frame", author: "C. Score", duration: "02:00" },
      { id: "mv-2", file: "/songs/sample-2.mp3", title: "Roll Credits", author: "T. Theme", duration: "02:28" },
    ],
  },
  { id: "action", name: "Action", songs: [
    { id: "ac-1", file: "/songs/sample-1.mp3", title: "Adrenaline Rush", author: "K. Blaze", duration: "02:12" },
    { id: "ac-2", file: "/songs/sample-2.mp3", title: "Edge Run", author: "K. Blaze", duration: "01:58" },
  ]},
  { id: "drama", name: "Drama", songs: [
    { id: "dr-1", file: "/songs/sample-1.mp3", title: "Quiet Rooms", author: "S. Vale", duration: "02:31" },
  ]},
  { id: "comedy", name: "Comedy", songs: [
    { id: "co-1", file: "/songs/sample-2.mp3", title: "Sunny Side", author: "B. Wink", duration: "01:49" },
  ]},
  { id: "romance", name: "Romance", songs: [
    { id: "ro-1", file: "/songs/sample-1.mp3", title: "Soft Glance", author: "L. Heart", duration: "02:22" },
  ]},
  { id: "thriller", name: "Thriller", songs: [
    { id: "th-1", file: "/songs/sample-2.mp3", title: "Tight Corners", author: "J. Nerve", duration: "02:05" },
  ]},
  { id: "documentary", name: "Documentary", songs: [
    { id: "do-1", file: "/songs/sample-1.mp3", title: "Narrative Thread", author: "A. Voice", duration: "02:40" },
  ]},
  { id: "fantasy", name: "Fantasy", songs: [
    { id: "fa-1", file: "/songs/sample-1.mp3", title: "Crystal Meadow", author: "E. Fable", duration: "02:17" },
  ]},
  { id: "animation", name: "Animation", songs: [
    { id: "an-1", file: "/songs/sample-2.mp3", title: "Flipbook", author: "P. Frame", duration: "01:54" },
  ]},
  { id: "adventure", name: "Adventure", songs: [
    { id: "ad-1", file: "/songs/sample-2.mp3", title: "Trailhead", author: "G. Ridge", duration: "02:11" },
  ]},
  { id: "mystery", name: "Mystery", songs: [
    { id: "my-1", file: "/songs/sample-1.mp3", title: "Foggy Alley", author: "Q. Clue", duration: "02:09" },
  ]},
  { id: "biography", name: "Biography", songs: [
    { id: "bi-1", file: "/songs/sample-1.mp3", title: "Turning Pages", author: "H. Life", duration: "02:03" },
  ]},
  { id: "musical", name: "Musical", songs: [
    { id: "mu-1", file: "/songs/sample-2.mp3", title: "Showtime", author: "C. Chorus", duration: "01:59" },
  ]},
  { id: "western", name: "Western", songs: [
    { id: "we-1", file: "/songs/sample-2.mp3", title: "Dust Trail", author: "S. Spurs", duration: "02:08" },
  ]},
  { id: "war-history", name: "War & History", songs: [
    { id: "wh-1", file: "/songs/sample-1.mp3", title: "March Lines", author: "R. Banner", duration: "02:26" },
  ]},
  { id: "superhero", name: "Superhero", songs: [
    { id: "su-1", file: "/songs/sample-2.mp3", title: "Cape Flight", author: "V. Vigor", duration: "02:10" },
  ]},
  { id: "sci-fi-thriller-extended-universe", name: "Sci‑Fi Thriller Extended Universe", songs: [
    { id: "se-1", file: "/songs/sample-1.mp3", title: "Quantum Chase", author: "N. Signal", duration: "02:33" },
  ]},
];


// Controls which songs are currently selected on Character 4 page.
// Store as a list of JSON objects with an `id` key for future extensibility.
export type SelectedSongEntry = { id: string } & Record<string, unknown>;

export const selected_id: SelectedSongEntry[] = [];

// Recommended songs (updated by agents/APIs). Starts empty.
export let recommended_songs: SongItem[] = [];

export function setRecommendedSongs(songs: SongItem[]): void {
  recommended_songs = songs || [];
  if (selected_id.length === 0 && recommended_songs.length > 0) {
    // Seed selection with recommended songs when nothing is selected yet
    for (const s of recommended_songs) {
      addSelectedId(s.id, { title: s.title, file: s.file });
    }
  }
}

export function getDefaultRecommendationSongs(): SongItem[] {
  // Simple default: take first 6 songs across categories
  const all = songCategories.flatMap((c) => c.songs);
  return all.slice(0, 6);
}

export function addSelectedId(id: string, extra: Record<string, unknown> = {}): void {
  if (selected_id.find((e) => e.id === id)) return;
  selected_id.push({ id, ...extra });
}

export function removeSelectedId(id: string): void {
  const idx = selected_id.findIndex((e) => e.id === id);
  if (idx !== -1) selected_id.splice(idx, 1);
}

export function isSelectedId(id: string): boolean {
  return selected_id.some((e) => e.id === id);
}


