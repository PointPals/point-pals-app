# PointPals Theme Song — ElevenLabs Music Prompt

> **Tool:** ElevenLabs Music (text-to-music / song generation)
> **Style:** Acoustic-pop family theme, warm NZ indie vibe
> **Duration:** ~30 seconds (short loopable theme)
> **Vocals:** Female or child-friendly warm voice, gentle delivery

---

## Prompt (paste into ElevenLabs Music)

```
A warm, playful acoustic-pop family theme song. Bright fingerpicked acoustic guitar in open tuning, soft brushed snare, gentle bass, and a light glockenspiel melody. The mood is sunny, gentle, and encouraging — like a lazy Sunday morning with kids.

The song has a simple sing-along structure:

[Verse]
Sunny morning, marble bright, every win is a little light,
Pip turns the page, Fern helps things grow, Bramble's got a star to show.

[Chorus]
Put your marble in the jar, see how bright your family are,
One small thing you do today, lights the whole family's way.

[Outro]
PointPals.

The vocal delivery is warm, slightly breathy, with a gentle smile in the voice. A children's chorus joins on the chorus — about four kids humming and singing the last line together. The song ends with a single clear glass marble dropping into a jar — clink.

No synthesizers, no electronic drums, no Auto-Tune effect. Acoustic, organic, intimate. The overall feeling is hopeful and connected, like the opening credits of a family film.
```

---

## Alternative: Instrumental-Only Version

If ElevenLabs Music handles instrumentals better:

```
A warm, gentle acoustic-pop instrumental theme, 30 seconds long. Bright fingerpicked acoustic guitar in open tuning, soft brushed snare, gentle upright bass, and a light glockenspiel melody carrying the main hook. The mood is sunny, playful, and slightly nostalgic — like the opening of a Studio Ghibli film set in New Zealand. No vocals, no synthesizers. Builds from a simple guitar arpeggio into a full warm arrangement, then fades out with a soft marimba tag. Ends with the sound of a single glass marble dropping into a jar.
```

---

## What to listen for in the output

| Element | Should sound like | Should NOT sound like |
|---------|-------------------|----------------------|
| Genre | Indie acoustic, kids' album, NZ folk | Corporate jingle, EDM, hip-hop |
| Vocals | Warm, real, slightly imperfect | Auto-Tuned, theatrical, radio-pop |
| Instrumentation | Acoustic guitar, glock, soft drums, bass | Synths, heavy reverb, electric |
| Feel | Sunday morning pancakes | Saturday night club |
| Ending | Marble clink | Fade out with reverb |

---

## Lyrics cleanly for reference

```
Sunny morning, marble bright,
every win is a little light.
Pip turns the page, Fern helps things grow,
Bramble's got a star to show.

Put your marble in the jar,
see how bright your family are.
One small thing you do today,
lights the whole family's way.

PointPals.
```

---

**Post-generation:** Download the best output as MP3 (`theme-song.mp3`) and drop into `src/assets/sounds/`. It can loop on the welcome page and/or play as an intro when the app loads.
