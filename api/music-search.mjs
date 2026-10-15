// /api/music-search.mjs
// Universal online music search and streaming provider
// Delivers precise song matching, clean title/artist parsing, and curated playlists

const CURATED_TRACKS = [
  {
    id: "dGcGbF4ex5o",
    title: "Dan...",
    artist: "Sheila On 7",
    category: "Hits Indo",
    duration: "04:46",
    thumbnail: "https://i.ytimg.com/vi/dGcGbF4ex5o/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "HyhLsy6b0XI",
    title: "Bertaut",
    artist: "Nadin Amizah",
    category: "Hits Indo",
    duration: "05:21",
    thumbnail: "https://i.ytimg.com/vi/HyhLsy6b0XI/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "a64zIq9Z0_Q",
    title: "Hati-Hati di Jalan",
    artist: "Tulus",
    category: "Hits Indo",
    duration: "04:02",
    thumbnail: "https://i.ytimg.com/vi/a64zIq9Z0_Q/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "AQpEIZ8dNcU",
    title: "Gala bunga matahari",
    artist: "Sal Priadi",
    category: "Hits Indo",
    duration: "05:28",
    thumbnail: "https://i.ytimg.com/vi/AQpEIZ8dNcU/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "7Jm2Il2U-c0",
    title: "Satu Bulan",
    artist: "Bernadya",
    category: "Hits Indo",
    duration: "03:42",
    thumbnail: "https://i.ytimg.com/vi/7Jm2Il2U-c0/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "fKRtnMYMW08",
    title: "Komang",
    artist: "Raim Laode",
    category: "Hits Indo",
    duration: "03:59",
    thumbnail: "https://i.ytimg.com/vi/fKRtnMYMW08/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "X9X8y4X0qE8",
    title: "Secukupnya",
    artist: "Hindia",
    category: "Hits Indo",
    duration: "03:26",
    thumbnail: "https://i.ytimg.com/vi/X9X8y4X0qE8/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "jfKfPfyJRdk",
    title: "Lofi Hip Hop Radio",
    artist: "Lofi Girl (Beats to Relax/Study)",
    category: "Lo-Fi & Santai",
    duration: "Live",
    thumbnail: "https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "5yx6BWlEVcY",
    title: "Chillhop Radio",
    artist: "Jazzy & Lofi Beats",
    category: "Lo-Fi & Santai",
    duration: "Live",
    thumbnail: "https://i.ytimg.com/vi/5yx6BWlEVcY/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "kPa7bsKwL-8",
    title: "Die With A Smile",
    artist: "Lady Gaga, Bruno Mars",
    category: "Global Hits",
    duration: "04:12",
    thumbnail: "https://i.ytimg.com/vi/kPa7bsKwL-8/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "ekr2nIex040",
    title: "APT.",
    artist: "ROSÉ & Bruno Mars",
    category: "Global Hits",
    duration: "02:54",
    thumbnail: "https://i.ytimg.com/vi/ekr2nIex040/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "4NRXx6U8ABQ",
    title: "Blinding Lights",
    artist: "The Weeknd",
    category: "Global Hits",
    duration: "03:20",
    thumbnail: "https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "Ar48yzjn1PE",
    title: "Sparks",
    artist: "Coldplay",
    category: "Akustik",
    duration: "03:48",
    thumbnail: "https://i.ytimg.com/vi/Ar48yzjn1PE/hqdefault.jpg",
    source: "youtube"
  },
  {
    id: "1b_n_rL7E_0",
    title: "Akad",
    artist: "Payung Teduh",
    category: "Akustik",
    duration: "04:18",
    thumbnail: "https://i.ytimg.com/vi/1b_n_rL7E_0/hqdefault.jpg",
    source: "youtube"
  }
];

// Clean bracketed video metadata tags
function cleanRawTitle(raw) {
  if (!raw) return "";
  return raw
    .replace(/\s*[\(\[][^\)\]]*(?:official|music\s*video|lyric|audio|visualizer|mv|lirik|remastered|video\s*clip|clip\s*officiel|video\s*resmi)[^\)\]]*[\)\]]/gi, "")
    .replace(/\s*\|\s*.*$/g, "")
    .replace(/\s+(?:official\s*lyric|lyric\s*official|official\s*video|lirik\s*resmi).*$/gi, "")
    .replace(/\s*\[\s*HD\s*\]|\s*\(\s*HD\s*\)|\s*\[\s*4K\s*\]|\s*\(\s*4K\s*\)/gi, "")
    .trim();
}

// Split into clean Title and Artist
function parseTrackMetadata(rawTitle, rawChannel) {
  const cleaned = cleanRawTitle(rawTitle);
  const chClean = (rawChannel || "")
    .replace(/\s*[-–]\s*(?:Topic|VEVO|Official)$/i, "")
    .replace(/\s*(?:VEVO|Official|Topic|Channel|Music|Records)\s*$/i, "")
    .trim() || rawChannel || "Artis";

  const split = cleaned.split(/\s+[-–—]\s+/);
  if (split.length >= 2) {
    const p0 = split[0].trim();
    const p1 = split.slice(1).join(" - ").trim();

    // If channel contains or is contained in p1, then p0 is song title and p1 is artist
    if (chClean && (chClean.toLowerCase().includes(p1.toLowerCase()) || p1.toLowerCase().includes(chClean.toLowerCase()))) {
      return { title: p0, artist: p1 };
    }
    // Standard format: Artist - Title
    return { title: p1, artist: p0 };
  }

  return { title: cleaned || rawTitle, artist: chClean };
}

// Convert MM:SS or HH:MM:SS string to total seconds
function parseDurationSecs(durStr) {
  if (!durStr) return 210;
  const parts = durStr.split(":").map(p => parseInt(p, 10) || 0);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 210;
}

export default async function musicSearchHandler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const query = (req.query.q || "").trim();

  // 1. If empty query, return curated list
  if (!query) {
    return res.json({
      success: true,
      query: "",
      tracks: CURATED_TRACKS,
      curated: true,
      count: CURATED_TRACKS.length
    });
  }

  // 2. Direct YouTube URL support (youtube.com/watch?v=... or youtu.be/...)
  const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|(?:embed|v)\/))([a-zA-Z0-9_-]{11})/;
  const directMatch = query.match(ytRegex);
  if (directMatch) {
    const videoId = directMatch[1];
    return res.json({
      success: true,
      query,
      tracks: [
        {
          id: videoId,
          title: "Pemutaran YouTube Kustom",
          artist: "Tautan Langsung",
          duration: "Full Track",
          thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          source: "youtube"
        }
      ],
      count: 1
    });
  }

  try {
    let tracks = [];

    // 3. Search YouTube directly with the user's exact query (no distortion keywords)
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const ytRes = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (ytRes.ok) {
      const html = await ytRes.text();
      const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/window\[\"ytInitialData\"\] = ({.*?});<\/script>/s);
      if (jsonMatch) {
        try {
          const data = JSON.parse(jsonMatch[1]);
          const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
          
          const rawCandidates = [];
          for (const s of contents) {
            const items = s.itemSectionRenderer?.contents || [];
            for (const item of items) {
              if (item.videoRenderer && item.videoRenderer.videoId) {
                const vr = item.videoRenderer;
                const vidId = vr.videoId;
                if (rawCandidates.some(t => t.id === vidId)) continue;

                const rawTitle = vr.title?.runs?.map(r => r.text).join("") || vr.title?.simpleText || "";
                const ch = vr.ownerText?.runs?.map(r => r.text).join("") || "";
                const dur = vr.lengthText?.simpleText || "03:30";
                const thumbs = vr.thumbnail?.thumbnails || [];
                const thumb = thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`;

                const durSecs = parseDurationSecs(dur);

                // Filter out non-music / ultra-long videos (>15 minutes) unless query explicitly requests album/mix/podcast
                const allowLong = /(?:full\s*album|kompilasi|podcast|dj\s*remix|1\s*jam|mix)/i.test(query);
                if (!allowLong && durSecs > 900) {
                  continue;
                }

                // Metadata parsing
                const { title, artist } = parseTrackMetadata(rawTitle, ch);

                // Calculate query relevance score
                const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
                const titleLower = title.toLowerCase();
                const artistLower = artist.toLowerCase();
                const rawTitleLower = rawTitle.toLowerCase();

                let matchCount = 0;
                for (const word of qWords) {
                  if (titleLower.includes(word) || artistLower.includes(word) || rawTitleLower.includes(word)) {
                    matchCount++;
                  }
                }

                rawCandidates.push({
                  id: vidId,
                  title,
                  artist,
                  duration: dur,
                  thumbnail: thumb,
                  source: "youtube",
                  relevance: matchCount
                });

                if (rawCandidates.length >= 20) break;
              }
            }
            if (rawCandidates.length >= 20) break;
          }

          // Sort by relevance score (highest matching query words first)
          rawCandidates.sort((a, b) => b.relevance - a.relevance);

          // Keep only tracks that match at least 1 keyword from user query
          const qWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
          if (qWords.length > 0) {
            tracks = rawCandidates.filter(t => t.relevance > 0);
          } else {
            tracks = rawCandidates;
          }

          tracks = tracks.slice(0, 15);
        } catch (parseErr) {
          console.warn("YouTube JSON parse warning:", parseErr.message);
        }
      }
    }

    // 4. Supplementary search from iTunes API if YouTube scraper produced 0 results (resilience fallback)
    if (tracks.length === 0) {
      try {
        const itunesRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=10`);
        if (itunesRes.ok) {
          const itunesData = await itunesRes.json();
          if (itunesData && Array.isArray(itunesData.results) && itunesData.results.length > 0) {
            for (const item of itunesData.results) {
              const mins = Math.floor((item.trackTimeMillis || 0) / 60000);
              const secs = Math.floor(((item.trackTimeMillis || 0) % 60000) / 1000);
              const durStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
              const artwork = (item.artworkUrl100 || "").replace("100x100bb", "500x500bb");

              tracks.push({
                id: `itunes_${item.trackId}`,
                title: item.trackName,
                artist: item.artistName,
                duration: durStr,
                thumbnail: artwork || "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80",
                previewUrl: item.previewUrl,
                searchQuery: `${item.trackName} ${item.artistName}`,
                source: "itunes"
              });
            }
          }
        }
      } catch (itunesErr) {
        console.warn("iTunes fallback search warning:", itunesErr.message);
      }
    }

    // CRITICAL: If no tracks match the search query, NEVER substitute unrelated curated tracks!
    // Return an honest empty list so the user receives "Lagu tidak ditemukan" instead of random songs.
    return res.json({
      success: true,
      query,
      tracks,
      count: tracks.length,
      curated: false
    });
  } catch (err) {
    console.error("Music search handler error:", err);
    return res.status(500).json({
      success: false,
      error: "Gagal mencari lagu: " + err.message,
      tracks: [],
      count: 0
    });
  }
}
