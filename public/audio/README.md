# Magical birthday music

`magical-birthday-overture.mp3` is the original cinematic arrangement used by the music toggle. Celesta, bells, harp, pizzicato bass, woodwind, and strings create a mysterious wizarding-fantasy atmosphere without copying the copyrighted Harry Potter film theme. It contains no voice, and playback begins only after the visitor presses the button in line with browser autoplay restrictions.

Regenerate and encode the track with:

```bash
python3 scripts/generate_magical_overture.py
ffmpeg -i public/audio/magical-birthday-overture.wav -c:a libmp3lame -b:a 160k public/audio/magical-birthday-overture.mp3
```

You can replace it with another recording later, provided you have permission to publish that recording.
