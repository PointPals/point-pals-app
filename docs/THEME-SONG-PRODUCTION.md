# PointPals Theme Song — ElevenLabs Music Generation

## How Ruby Sings It (Recording Reference)
> File: `C:\Users\grant\Downloads\Sunny Day Celebration.mp3`

### Tempo & Phrasing

| Section | Tempo | Feel |
|---------|-------|------|
| **Verse 1** | Slow, measured (~90 BPM) | Paused, sing-song, each line has space: "Sunny Morning....... marble bright......" |
| **Bridge** | Slightly faster (~105 BPM) | Words stretch: "Fern helps things groooowwwww", "Bramble's got a star to show" |
| **Chorus** | Faster (~115 BPM) | Same bounce as bridge, rhyming words emphasised and held: "jaaaarrrr", "aarrre", "todaaayy", "waaaayyyy" |
| **End** | - | Single "PointPals" as a soft landing |

Ruby's version has a natural kid's lilt — it's not metronomic. The pauses make it feel like she's discovering the words. The chorus speeds up with excitement. That's the magic.

---

## Updated ElevenLabs Music Prompt

Paste this into ElevenLabs Music Generation:

```
A warm, playful acoustic-pop family theme song in the style of a child singing to themselves. Bright fingerpicked acoustic guitar in open tuning, soft brushed snare, gentle bass, and a light glockenspiel melody.

The song has a simple structure with specific tempo changes:
- The first verse is slow and measured, with pauses between phrases — like a child thinking of each word.
- The bridge (lines about Pip, Fern, Bramble) picks up slightly, with drawn-out held notes on the last word.
- The chorus is noticeably faster and bouncier, with each rhyming word emphasised and held longer.

[Verse — slow, with pauses]
Sunny morning, marble bright,
every win is a little light.

[Bridge — slightly faster, words stretch]
Pip turns the page, Fern helps things groooowwwww,
Bramble's got a star to show.

[Chorus — faster, bouncy, rhyming words held]
Put your marble in the jaaaarrrrr,
see how bright your family aaaaarrrrre.
One small thing you do todaaaaayyyy,
lights your own family's waaaaayyyyyy.

[End — soft]
PointPals.

The vocal delivery should feel like a real child or a warm adult imitating a child's singsong — slightly breathy, not perfectly on pitch, not Auto-Tuned. A children's chorus hums subtly underneath the chorus. The song ends with a single clear glass marble dropping into a jar — clink.

No synthesizers, no electronic drums. Acoustic, organic, intimate. The overall feeling is hopeful and sweet, like a home video you'd rewatch years later.
```
---

## API Script (Node.js)

Save this as `generate-theme-song.mjs` in the project root, then run with `node generate-theme-song.mjs` after adding your ElevenLabs API key to `.env`.

```js
// generate-theme-song.mjs
// Usage: node generate-theme-song.mjs
// Requires ELEVENLABS_API_KEY in .env or environment

import { createWriteStream } from 'fs';
import { get } from 'https';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE = 'https://api.elevenlabs.io/v1';

if (!API_KEY) {
  console.error('❌ Missing ELEVENLABS_API_KEY in environment');
  console.error('   Set it in .env or run: $env:ELEVENLABS_API_KEY="sk_..."');
  process.exit(1);
}

// ElevenLabs Music Generation endpoint
// This is a text-to-music endpoint for generating songs
async function generateSong() {
  const prompt = `A warm, playful acoustic-pop family theme song. Bright fingerpicked acoustic guitar in open tuning, soft brushed snare, gentle bass, and a light glockenspiel melody.

[Verse — slow, with pauses]
Sunny morning, marble bright,
every win is a little light.

[Bridge — slightly faster]
Pip turns the page, Fern helps things groooowwwww,
Bramble's got a star to show.

[Chorus — faster, bouncy, words held]
Put your marble in the jaaaarrrrr,
see how bright your family aaaaarrrrre.
One small thing you do todaaaaayyyy,
lights your own family's waaaaayyyyyy.

[End]
PointPals.`;

  const body = {
    text: prompt,
    // Music generation parameters
    duration_seconds: 30,
    style: 'acoustic pop',
    instrumental: false,
    voice_id: '21m00Tcm4TlvDq8ikWAM', // Rachel (warm female voice)
    // Alternative voice IDs to try:
    // 'EXAVITQu4vrDn2w3WmxV' - Bella (soft, warm)
    // '21m00Tcm4TlvDq8ikWAM' - Rachel (warm, professional)
    // 'AZnzlk1XvdvUeBnXmlld' - Domi (younger, bright)
    output_format: 'mp3_44100_128',
  };

  console.log('🎵 Generating PointPals theme song...');

  try {
    const response = await fetch(`${BASE}/text-to-music`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`ElevenLabs API error ${response.status}: ${err}`);
    }

    // The response is a stream of audio data
    const filePath = 'public/theme-song.mp3';
    const fileStream = createWriteStream(filePath);

    // Handle streaming response
    for await (const chunk of response.body) {
      fileStream.write(chunk);
    }

    fileStream.end();
    console.log(`✅ Saved to ${filePath}`);
    console.log('   Now use it in: Instagram Reels, welcome page, email intros');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    if (err.message.includes('404')) {
      console.log('\n⚠️  The text-to-music endpoint may have changed.');
      console.log('   Check: https://elevenlabs.io/docs/api-reference/text-to-music');
    }
  }
}

generateSong();
```

## How to use this

1. **Get an ElevenLabs API key** → https://elevenlabs.io/app/settings/api-keys
2. **Add to `.env`**: `ELEVENLABS_API_KEY="sk_your_key_here"`
3. **Run**: `cd C:\point-pals-app && node generate-theme-song.mjs`
4. **Output**: `public/theme-song.mp3`

If the text-to-music endpoint isn't working, you can also:
- **Paste the prompt directly** into https://elevenlabs.io/app/music-gen (their web UI)
- Upload Ruby's recording as a reference and tell it to "remix this into a studio version"

## Ruby's recording use case

Take Ruby's `C:\Users\grant\Downloads\Sunny Day Celebration.mp3` and use it too:
- **Web upload**: ElevenLabs web UI > Music Gen > Upload reference > "Remix this as a full song"
- **App loading screen**: Use Ruby's raw recording as the app loading audio — it's genuine and lovely
- **Kick-off Reel**: Pair Ruby's recording with family photos for the first Instagram post — "our 6yo wrote the theme song" is a *great* story
