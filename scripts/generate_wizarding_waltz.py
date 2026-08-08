#!/usr/bin/env python3
"""Create an original, ad-free magical waltz for Ritika's Memory Arcade.

The composition and melody below are original and are not a transcription of
any film score. The script writes a temporary WAV, then uses ffmpeg to create a
compact MP3 suitable for on-demand mobile playback.
"""

from __future__ import annotations

import argparse
import math
import random
import subprocess
import tempfile
import wave
from array import array
from pathlib import Path


SAMPLE_RATE = 44_100
TEMPO = 82
EIGHTH = 60 / TEMPO / 2
BAR = EIGHTH * 6
BAR_COUNT = 24
DURATION = BAR * BAR_COUNT + 4.5


def midi_frequency(note: int) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def stereo_gains(pan: float) -> tuple[float, float]:
    angle = (max(-1.0, min(1.0, pan)) + 1.0) * math.pi / 4
    return math.cos(angle), math.sin(angle)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)

    sample_count = int(DURATION * SAMPLE_RATE)
    left = array("f", [0.0]) * sample_count
    right = array("f", [0.0]) * sample_count

    def add_tone(
        start: float,
        duration: float,
        note: int,
        amplitude: float,
        pan: float,
        voice: str,
    ) -> None:
        first = max(0, int(start * SAMPLE_RATE))
        last = min(sample_count, int((start + duration) * SAMPLE_RATE))
        if last <= first:
            return
        frequency = midi_frequency(note)
        gain_l, gain_r = stereo_gains(pan)
        note_samples = max(1, last - first)

        for index in range(first, last):
            t = (index - first) / SAMPLE_RATE
            progress = (index - first) / note_samples

            if voice == "celesta":
                attack = min(1.0, t / 0.012)
                envelope = attack * math.exp(-3.5 * progress)
                vibrato = 1 + 0.0018 * math.sin(2 * math.pi * 5.1 * t)
                phase = 2 * math.pi * frequency * vibrato * t
                value = (
                    math.sin(phase)
                    + 0.34 * math.sin(2.01 * phase)
                    + 0.13 * math.sin(3.98 * phase)
                )
            elif voice == "harp":
                envelope = min(1.0, t / 0.008) * math.exp(-5.2 * progress)
                phase = 2 * math.pi * frequency * t
                value = sum(math.sin(phase * harmonic) / harmonic ** 1.45 for harmonic in range(1, 6))
            elif voice == "bass":
                attack = min(1.0, t / 0.18)
                release = min(1.0, (duration - t) / 0.45)
                envelope = attack * release
                phase = 2 * math.pi * frequency * t
                value = math.sin(phase) + 0.18 * math.sin(2 * phase)
            else:  # warm string-like pad
                attack = min(1.0, t / 0.75)
                release = min(1.0, (duration - t) / 1.0)
                envelope = attack * release
                phase = 2 * math.pi * frequency * t
                value = (
                    math.sin(phase)
                    + 0.22 * math.sin(phase * 1.006)
                    + 0.11 * math.sin(2 * phase)
                )

            sample = amplitude * envelope * value
            left[index] += sample * gain_l
            right[index] += sample * gain_r

    # A minor-centred 6/8 progression with a bright, celebratory middle act.
    chords = [
        (45, (57, 60, 64, 71)), (41, (53, 57, 60, 64)),
        (48, (55, 60, 64, 71)), (40, (52, 55, 59, 62)),
        (38, (50, 53, 57, 64)), (45, (52, 57, 60, 64)),
        (41, (53, 57, 60, 64)), (40, (52, 56, 59, 62)),
        (45, (57, 60, 64, 71)), (48, (55, 60, 64, 71)),
        (53, (60, 65, 69, 72)), (43, (55, 59, 62, 67)),
        (48, (55, 60, 64, 67)), (50, (57, 62, 65, 69)),
        (53, (60, 65, 69, 72)), (52, (56, 59, 64, 71)),
        (45, (57, 60, 64, 71)), (41, (53, 57, 60, 64)),
        (38, (50, 53, 57, 64)), (40, (52, 56, 59, 62)),
        (45, (57, 60, 64, 71)), (41, (53, 57, 60, 64)),
        (40, (52, 56, 59, 62)), (45, (57, 60, 64, 69)),
    ]

    arpeggio_order = (0, 2, 1, 3, 2, 1)
    for bar_index, (bass_note, chord) in enumerate(chords):
        bar_start = bar_index * BAR
        pad_amplitude = 0.026 if bar_index < 8 else 0.035
        for chord_index, note in enumerate(chord[:3]):
            add_tone(bar_start, BAR + 0.8, note, pad_amplitude, (chord_index - 1) * 0.42, "pad")
        add_tone(bar_start, BAR * 0.92, bass_note, 0.055, -0.12, "bass")
        for step, chord_index in enumerate(arpeggio_order):
            octave = 12 if step in (3, 4) else 0
            add_tone(
                bar_start + step * EIGHTH,
                EIGHTH * 2.3,
                chord[chord_index] + 12 + octave,
                0.052 if bar_index < 16 else 0.06,
                -0.48 + step * 0.19,
                "celesta",
            )
        # A soft harp pulse on beats one and four gives the track a waltz lift.
        add_tone(bar_start, EIGHTH * 2.0, chord[0] + 12, 0.038, -0.42, "harp")
        add_tone(bar_start + EIGHTH * 3, EIGHTH * 2.0, chord[2] + 12, 0.036, 0.42, "harp")

    # Original, sparse birthday-adventure motif. Values are (bar, eighth, MIDI note, length).
    melody = [
        (0, 0, 76, 2), (0, 2, 79, 1), (0, 3, 81, 3),
        (1, 1, 84, 2), (1, 3, 83, 1), (1, 4, 79, 2),
        (2, 0, 76, 1), (2, 1, 79, 1), (2, 2, 84, 2), (2, 4, 86, 2),
        (3, 0, 83, 2), (3, 2, 79, 1), (3, 3, 78, 3),
        (8, 0, 81, 2), (8, 2, 84, 1), (8, 3, 88, 3),
        (9, 0, 86, 1), (9, 1, 84, 1), (9, 2, 79, 2), (9, 4, 81, 2),
        (10, 0, 84, 2), (10, 2, 89, 1), (10, 3, 88, 3),
        (11, 0, 86, 2), (11, 2, 83, 1), (11, 3, 79, 3),
        (16, 0, 76, 2), (16, 2, 81, 1), (16, 3, 84, 3),
        (17, 0, 83, 1), (17, 1, 81, 1), (17, 2, 79, 2), (17, 4, 76, 2),
        (18, 0, 77, 2), (18, 2, 81, 1), (18, 3, 86, 3),
        (19, 0, 83, 2), (19, 2, 80, 1), (19, 3, 76, 3),
        (20, 0, 81, 2), (20, 2, 84, 1), (20, 3, 88, 3),
        (21, 0, 86, 1), (21, 1, 84, 1), (21, 2, 81, 2), (21, 4, 79, 2),
        (22, 0, 80, 2), (22, 2, 83, 1), (22, 3, 88, 3),
        (23, 0, 85, 1), (23, 1, 83, 1), (23, 2, 81, 1), (23, 3, 76, 3),
    ]
    for bar_index, step, note, length in melody:
        add_tone(bar_index * BAR + step * EIGHTH, length * EIGHTH * 1.4, note, 0.085, 0.08, "celesta")

    random.seed(26)
    for bar_index in (3, 7, 11, 15, 19, 23):
        for sparkle in range(5):
            add_tone(
                bar_index * BAR + EIGHTH * (3.8 + sparkle * 0.42),
                1.8,
                random.choice((91, 93, 95, 96, 98)),
                0.026,
                -0.75 + sparkle * 0.34,
                "celesta",
            )

    # Gentle hall-style echoes. Reverse traversal avoids feeding an echo into itself.
    for delay_seconds, gain in ((0.17, 0.14), (0.34, 0.09), (0.51, 0.055)):
        delay = int(delay_seconds * SAMPLE_RATE)
        for index in range(sample_count - 1, delay - 1, -1):
            left[index] += left[index - delay] * gain
            right[index] += right[index - delay] * gain

    peak = max(max(abs(value) for value in left), max(abs(value) for value in right), 0.001)
    scale = 0.84 / peak
    fade_in = int(1.2 * SAMPLE_RATE)
    fade_out = int(3.8 * SAMPLE_RATE)

    with tempfile.NamedTemporaryFile(suffix=".wav") as temporary:
        with wave.open(temporary.name, "wb") as wav_file:
            wav_file.setnchannels(2)
            wav_file.setsampwidth(2)
            wav_file.setframerate(SAMPLE_RATE)
            chunk_size = 32_768
            for offset in range(0, sample_count, chunk_size):
                end = min(sample_count, offset + chunk_size)
                pcm = array("h")
                for index in range(offset, end):
                    fade = min(1.0, index / fade_in, (sample_count - index) / fade_out)
                    pcm.append(int(max(-1.0, min(1.0, left[index] * scale * fade)) * 32_767))
                    pcm.append(int(max(-1.0, min(1.0, right[index] * scale * fade)) * 32_767))
                wav_file.writeframes(pcm.tobytes())

        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error", "-i", temporary.name,
                "-codec:a", "libmp3lame", "-b:a", "128k",
                "-metadata", "title=Moonlit Birthday Waltz",
                "-metadata", "artist=Made for Ritika's Memory Arcade",
                str(args.output),
            ],
            check=True,
        )

    print(f"Created {args.output} ({DURATION:.1f} seconds)")


if __name__ == "__main__":
    main()
