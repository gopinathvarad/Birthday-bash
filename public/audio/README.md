# Birthday music

`happy-birthday-instrumental.mp3` is the local instrumental Happy Birthday arrangement used by the music toggle. It contains no spoken or synthesized voice. Playback begins only after the visitor presses the button, in line with browser autoplay restrictions.

Regenerate and encode the backing track with:

```bash
python3 scripts/generate_birthday_song.py
ffmpeg -i public/audio/happy-birthday-instrumental.wav -c:a libmp3lame -b:a 192k public/audio/happy-birthday-instrumental.mp3
```

You can still replace it with a recorded track later, provided you have permission to publish that recording.
