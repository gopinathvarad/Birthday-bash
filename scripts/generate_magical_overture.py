"""Generate an original, loop-friendly magical birthday overture.

This composition is an original celesta, harp, and strings arrangement. It is
not the Harry Potter film theme and does not reproduce a protected melody.
"""

from array import array
import math
import struct
import wave


SAMPLE_RATE = 44_100
OUTPUT = "public/audio/magical-birthday-overture.wav"
TAU = math.tau
EIGHTH = 60 / 92 / 2


def midi(note):
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


# An original 6/8 melody in D minor, brightening into F major before returning.
# Durations are counted in eighth notes.
melody = [
    (69, 1), (74, 2), (77, 1), (76, 2),
    (72, 1), (76, 2), (81, 1), (79, 2),
    (77, 1), (72, 1), (74, 2), (69, 2),
    (67, 1), (72, 2), (76, 1), (74, 2),
    (69, 1), (74, 1), (77, 1), (81, 1), (79, 2),
    (76, 1), (72, 2), (74, 1), (69, 2),
    (65, 1), (69, 1), (72, 2), (77, 2),
    (76, 1), (74, 1), (69, 2), (62, 2),
]

events = []
cursor = 0.8
for note, beats in melody:
    duration = beats * EIGHTH
    events.append((note, cursor, duration))
    cursor += duration

total_duration = cursor + 1.4
sample_count = int(total_duration * SAMPLE_RATE)
left = array("f", [0.0]) * sample_count
right = array("f", [0.0]) * sample_count


def envelope(t, duration, attack=.015, release=.28):
    if t < attack:
        return t / attack
    if t > duration - release:
        return max(0.0, (duration - t) / release)
    return 1.0


def add_celesta(note, start, duration, amplitude=.19):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    ring = duration + .72
    pan = .12 * math.sin(note * 1.7)
    for index in range(int(ring * SAMPLE_RATE)):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        attack = min(1.0, t / .008)
        decay = math.exp(-2.6 * t)
        fundamental = math.sin(TAU * frequency * t)
        sparkle = .42 * math.sin(TAU * frequency * 2.01 * t + .2)
        bell = .16 * math.sin(TAU * frequency * 3.98 * t)
        value = amplitude * attack * decay * (fundamental + sparkle + bell)
        left[target] += value * (1 - pan)
        right[target] += value * (1 + pan)


def add_harp(note, start, amplitude=.065):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    duration = 1.25
    for index in range(int(duration * SAMPLE_RATE)):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        env = min(1.0, t / .006) * math.exp(-3.1 * t)
        tone = math.sin(TAU * frequency * t) + .3 * math.sin(TAU * frequency * 2 * t)
        left[target] += amplitude * env * tone * .9
        right[target] += amplitude * env * tone * 1.1


def add_strings(notes, start, duration, amplitude=.026):
    begin = int(start * SAMPLE_RATE)
    length = int(duration * SAMPLE_RATE)
    for voice, note in enumerate(notes):
        frequency = midi(note)
        pan = -.16 + voice * .16
        for index in range(length):
            target = begin + index
            if target >= sample_count:
                break
            t = index / SAMPLE_RATE
            env = envelope(t, duration, attack=.55, release=.65)
            drift = .003 * math.sin(TAU * (.18 + voice * .03) * t)
            tone = math.sin(TAU * frequency * (1 + drift) * t)
            tone += .18 * math.sin(TAU * frequency * 2 * t)
            value = amplitude * env * tone
            left[target] += value * (1 - pan)
            right[target] += value * (1 + pan)


def add_star_chime(start, note=86, amplitude=.05):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    duration = 1.7
    for index in range(int(duration * SAMPLE_RATE)):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        env = math.exp(-3.7 * t)
        tone = math.sin(TAU * frequency * t) + .5 * math.sin(TAU * frequency * 1.506 * t)
        left[target] += amplitude * env * tone * 1.1
        right[target] += amplitude * env * tone * .9


for note, start, duration in events:
    add_celesta(note, start, duration)

bar_duration = 6 * EIGHTH
progression = [
    (50, 53, 57),  # D minor
    (48, 53, 57),  # F major
    (46, 50, 53),  # B-flat major
    (48, 52, 55),  # C major
    (50, 53, 57),
    (53, 57, 60),  # F major, lifted
    (46, 50, 53),
    (50, 53, 57),
]
for bar, chord in enumerate(progression):
    start = .8 + bar * bar_duration
    add_strings(chord, start, bar_duration + .18)
    for step, note in enumerate((chord[0] - 12, chord[2] - 12, chord[1] - 12, chord[2] - 12)):
        add_harp(note, start + step * 1.5 * EIGHTH)
    if bar in (0, 3, 5, 7):
        add_star_chime(start, 86 if bar % 2 == 0 else 84)

# Gentle stereo room reflections make the small ensemble feel cinematic.
dry_left = array("f", left)
dry_right = array("f", right)
for delay_seconds, gain in ((.16, .18), (.33, .1), (.51, .055)):
    delay = int(delay_seconds * SAMPLE_RATE)
    for index in range(delay, sample_count):
        left[index] += dry_right[index - delay] * gain
        right[index] += dry_left[index - delay] * gain

peak = max(max(abs(value) for value in left), max(abs(value) for value in right), .001)
scale = .83 / peak
pcm = bytearray(sample_count * 4)
for index, (left_value, right_value) in enumerate(zip(left, right)):
    struct.pack_into(
        "<hh",
        pcm,
        index * 4,
        int(max(-1, min(1, left_value * scale)) * 32767),
        int(max(-1, min(1, right_value * scale)) * 32767),
    )

with wave.open(OUTPUT, "wb") as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(SAMPLE_RATE)
    output.writeframes(pcm)

print(f"Generated {OUTPUT} ({total_duration:.2f}s)")
