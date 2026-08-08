#!/usr/bin/env python3
"""Create an elegant, ad-free Happy Birthday waltz for Ritika's Memory Arcade.

This arrangement uses the traditional Happy Birthday melody with an original
celesta, harp, and warm-string accompaniment. The script writes a temporary
WAV, then uses ffmpeg to create a compact MP3 for on-demand mobile playback.
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

    # Eight supportive 6/8 bars, repeated three times with a gentle lift.
    birthday_progression = [
        (48, (55, 60, 64, 67)),  # C
        (40, (52, 55, 60, 64)),  # C/E
        (43, (55, 59, 62, 65)),  # G7
        (48, (55, 60, 64, 67)),  # C
        (48, (55, 60, 64, 67)),  # C
        (41, (53, 57, 60, 65)),  # F
        (43, (55, 59, 62, 65)),  # G7
        (48, (55, 60, 64, 67)),  # C
    ]
    chords = birthday_progression * 3

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

    # Traditional Happy Birthday melody. Values are (bar, eighth, MIDI note, length).
    birthday_melody = [
        (0, 0, 67, 1), (0, 1, 67, 1), (0, 2, 69, 2), (0, 4, 67, 2),
        (1, 0, 72, 2), (1, 2, 71, 4),
        (2, 0, 67, 1), (2, 1, 67, 1), (2, 2, 69, 2), (2, 4, 67, 2),
        (3, 0, 74, 2), (3, 2, 72, 4),
        (4, 0, 67, 1), (4, 1, 67, 1), (4, 2, 79, 2), (4, 4, 76, 2),
        (5, 0, 72, 2), (5, 2, 71, 2), (5, 4, 69, 2),
        (6, 0, 77, 1), (6, 1, 77, 1), (6, 2, 76, 2), (6, 4, 72, 2),
        (7, 0, 74, 2), (7, 2, 72, 4),
    ]
    for verse in range(3):
        octave = 12 if verse == 2 else 0
        verse_amplitude = (0.078, 0.088, 0.092)[verse]
        for bar_index, step, note, length in birthday_melody:
            add_tone(
                (bar_index + verse * 8) * BAR + step * EIGHTH,
                length * EIGHTH * 1.25,
                note + octave,
                verse_amplitude,
                0.08,
                "celesta",
            )

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
                "-metadata", "title=Happy Birthday Waltz for Ritika",
                "-metadata", "artist=Made for Ritika's Memory Arcade",
                str(args.output),
            ],
            check=True,
        )

    print(f"Created {args.output} ({DURATION:.1f} seconds)")


if __name__ == "__main__":
    main()
