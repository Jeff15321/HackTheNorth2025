export async function selectSong(params: { songId: string; title: string; file: string }) {
  // Placeholder client-only logger for now
  // eslint-disable-next-line no-console
  console.log("[client/selectSong]", { ...params, at: new Date().toISOString() });
  return { ok: true } as const;
}

export async function removeSong(params: { songId: string }) {
  // Placeholder client-only logger for now (not implemented)
  // eslint-disable-next-line no-console
  console.log("[client/removeSong] (placeholder)", { ...params, at: new Date().toISOString() });
  return { ok: true, message: "remove not implemented" } as const;
}


