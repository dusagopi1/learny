const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export async function searchTopEmbeddableVideoId(query) {
  if (!API_KEY) {
    throw new Error('YOUTUBE_API_KEY_MISSING');
  }
  const params = new URLSearchParams({
    key: API_KEY,
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '10',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    order: 'relevance',
  });
  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`YouTube search failed: ${res.status} ${res.statusText} - ${text.slice(0,120)}`);
  }
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : [];
  const first = items.find((it) => it.id && it.id.videoId);
  if (!first) throw new Error('NO_RESULTS');
  return first.id.videoId;
}


