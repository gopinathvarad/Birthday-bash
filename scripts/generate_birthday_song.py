"""Generate the local, royalty-free Happy Birthday backing track.

The browser adds the spoken/sing-song birthday lines over this melody.
Run this script again whenever the audio asset needs to be regenerated.
"""

from array import array
import math
import struct
import wave


SAMPLE_RATE = 44_100
OUTPUT = "public/audio/happy-birthday-instrumental.wav"
TAU = math.tau


def midi(note):
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


melody = [
    [(67, .31), (67, .31), (69, .62), (67, .62), (72, .62), (71, 1.24)],
    [(67, .31), (67, .31), (69, .62), (67, .62), (74, .62), (72, 1.24)],
    [(67, .31), (67, .31), (79, .62), (76, .62), (72, .62), (71, .62), (69, 1.24)],
    [(77, .31), (77, .31), (76, .62), (72, .62), (74, .62), (72, 1.55)],
]

line_starts = []
events = []
cursor = .55
for line in melody:
    line_starts.append(cursor)
    for note, duration in line:
        events.append((note, cursor, duration))
        cursor += duration
    cursor += .55

total_duration = cursor + 1.2
sample_count = int(total_duration * SAMPLE_RATE)
left = array("f", [0.0]) * sample_count
right = array("f", [0.0]) * sample_count


def envelope(t, duration, attack=.055, release=.16):
    if t < attack:
        return t / attack
    if t > duration - release:
        return max(0.0, (duration - t) / release)
    return 1.0


def add_lead(note, start, duration, amplitude=.22):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    length = int(duration * SAMPLE_RATE)
    pan = .08 * math.sin(note)
    for index in range(length):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        env = envelope(t, duration)
        vibrato = .045 * math.sin(TAU * 5.15 * t)
        phase = TAU * frequency * t + vibrato
        # A soft, vowel-like lead with a small chorus spread.
        voice = (
            math.sin(phase)
            + .34 * math.sin(2 * phase + .12)
            + .16 * math.sin(3 * phase + .3)
            + .07 * math.sin(4 * phase)
        ) / 1.57
        shimmer = .18 * math.sin(TAU * frequency * 2.006 * t)
        value = amplitude * env * (voice + shimmer)
        left[target] += value * (1.0 - pan)
        right[target] += value * (1.0 + pan)


def add_pad(notes, start, duration, amplitude=.035):
    begin = int(start * SAMPLE_RATE)
    length = int(duration * SAMPLE_RATE)
    for note in notes:
        frequency = midi(note)
        for index in range(length):
            target = begin + index
            if target >= sample_count:
                break
            t = index / SAMPLE_RATE
            env = envelope(t, duration, attack=.35, release=.45)
            tone = math.sin(TAU * frequency * t) + .22 * math.sin(TAU * frequency * 2 * t)
            value = amplitude * env * tone
            left[target] += value * .92
            right[target] += value * 1.08


def add_chime(start, amplitude=.065):
    begin = int(start * SAMPLE_RATE)
    duration = .42
    for index in range(int(duration * SAMPLE_RATE)):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        env = math.exp(-8.5 * t)
        value = amplitude * env * (math.sin(TAU * 1046.5 * t) + .45 * math.sin(TAU * 1568 * t))
        left[target] += value
        right[target] += value


for note, start, duration in events:
    add_lead(note, start, duration)

progressions = [
    [(48, 52, 55), (43, 47, 50)],
    [(48, 52, 55), (43, 47, 50)],
    [(48, 52, 55), (41, 45, 48)],
    [(41, 45, 48), (43, 47, 50)],
]
for line_index, line in enumerate(melody):
    line_length = sum(duration for _, duration in line)
    split = line_length * .53
    add_pad(progressions[line_index][0], line_starts[line_index], split + .2)
    add_pad(progressions[line_index][1], line_starts[line_index] + split, line_length - split + .2)
    add_chime(line_starts[line_index])

# Gentle stereo room reflections.
dry_left = array("f", left)
dry_right = array("f", right)
for delay_seconds, gain in ((.14, .18), (.29, .10), (.43, .055)):
    delay = int(delay_seconds * SAMPLE_RATE)
    for index in range(delay, sample_count):
        left[index] += dry_right[index - delay] * gain
        right[index] += dry_left[index - delay] * gain

peak = max(max(abs(value) for value in left), max(abs(value) for value in right), .001)
scale = .82 / peak
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
