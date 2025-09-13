import { getDefaultRecommendationSongs, setRecommendedSongs } from "@/data/songData";

function getDefaultTopScript(): string {
    return `
In the heart of the city, beneath the constant hum of traffic and chatter, a small workshop quietly thrived. Its shelves overflowed with curious devices—half-finished clocks, glowing crystals, and notebooks filled with scribbles no one but the inventor could decipher.
\n
Each morning began the same way: the kettle whistled, the window blinds creaked open, and a single beam of light illuminated the cluttered desk. To most, the mess looked impossible to navigate, but to the inventor it was a map—every object exactly where it needed to be.\n
Tools aligned in rows. Sketches pinned to corkboards. The faint smell of solder lingering in the air.
\n
One afternoon, while the rain tapped steadily on the windows, a knock echoed at the door.\n\n
Standing in the doorway was a traveler, soaked to the bone, carrying a box wrapped in weathered leather. The traveler said little, but the look in their eyes spoke volumes: urgency, fear, and hope all tangled together.
\n
The inventor unwrapped the box, revealing a mechanism unlike anything seen before. Its gears shimmered, turning slowly on their own, as if guided by an unseen hand.\n\n
What followed would change everything—nights of endless tinkering, sparks flying, and discoveries that stretched the very definition of possibility. But it all began in that small workshop, on that rainy day, with a single knock at the door.
    `;
    }

  
export async function talkToScriptAgent(_prompt: string): Promise<string> {
  // Simulate network latency (~3s) then return content
  await new Promise((resolve) => setTimeout(resolve, 3000));
  // Future API call placeholder:
  // const res = await fetch('/api/talkToScriptAgent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: _prompt }) });
  // const json = await res.json();
  // return json.content;
  try {
    setRecommendedSongs(getDefaultRecommendationSongs());
  } catch {}
  return getDefaultTopScript();
}