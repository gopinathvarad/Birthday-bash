"""Generate an original cinematic wizarding-fantasy overture.

The arrangement uses celesta, bells, harp, pizzicato bass, woodwind, and
strings to create a mysterious magical-school atmosphere. The composition and
melody are original and do not reproduce music from the Harry Potter films.
"""

from array import array
import math
import struct
import wave


SAMPLE_RATE = 44_100
OUTPUT = "public/audio/magical-birthday-overture.wav"
TAU = math.tau
EIGHTH = 60 / 78 / 2
BAR = 6 * EIGHTH


def midi(note):
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


# Six eighth-note units per bar. This original A-minor theme uses occasional
# harmonic-minor colour and an answering second phrase for a dark, enchanted
# waltz feeling without borrowing a recognisable melody.
melody_bars = [
    [(69, 1), (72, 1), (76, 2), (75, 1), (71, 1)],
    [(74, 1), (77, 1), (76, 2), (72, 1), (68, 1)],
    [(69, 2), (74, 1), (72, 1), (71, 2)],
    [(64, 1), (68, 1), (71, 1), (74, 1), (72, 2)],
    [(72, 1), (76, 1), (81, 2), (79, 1), (76, 1)],
    [(77, 1), (74, 1), (71, 2), (72, 1), (76, 1)],
    [(69, 1), (71, 1), (72, 1), (76, 1), (74, 2)],
    [(68, 1), (71, 1), (76, 2), (71, 2)],
    [(76, 1), (81, 1), (79, 1), (76, 1), (72, 2)],
    [(74, 1), (77, 1), (81, 1), (80, 1), (76, 2)],
    [(72, 1), (76, 1), (77, 2), (74, 1), (71, 1)],
    [(71, 1), (74, 1), (76, 2), (72, 2)],
    [(69, 1), (72, 1), (76, 1), (81, 1), (79, 2)],
    [(77, 1), (76, 1), (74, 1), (71, 1), (72, 2)],
    [(69, 1), (76, 1), (72, 1), (71, 1), (68, 2)],
    [(69, 6)],
]

intro = 1.2
total_duration = intro + len(melody_bars) * BAR + 2.5
sample_count = int(total_duration * SAMPLE_RATE)
left = array("f", [0.0]) * sample_count
right = array("f", [0.0]) * sample_count


def soft_envelope(t, duration, attack=.08, release=.4):
    if t < attack:
        return t / attack
    if t > duration - release:
        return max(0.0, (duration - t) / release)
    return 1.0


def mix(target, value, pan=0.0):
    left[target] += value * (1 - pan)
    right[target] += value * (1 + pan)


def add_celesta(note, start, duration, amplitude=.16, octave_glint=False):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    ring = duration + 1.25
    pan = .15 * math.sin(note * 1.37)
    for index in range(int(ring * SAMPLE_RATE)):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        attack = min(1.0, t / .006)
        decay = .64 * math.exp(-1.8 * t) + .36 * math.exp(-4.9 * t)
        phase = TAU * frequency * t
        tone = math.sin(phase)
        tone += .46 * math.sin(2.006 * phase + .18)
        tone += .18 * math.sin(3.997 * phase + .4)
        tone += .07 * math.sin(6.13 * phase)
        if octave_glint:
            tone += .12 * math.sin(8.02 * phase + .3)
        mix(target, amplitude * attack * decay * tone, pan)


def add_harp(note, start, amplitude=.052):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    duration = 1.55
    for index in range(int(duration * SAMPLE_RATE)):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        env = min(1.0, t / .007) * math.exp(-2.75 * t)
        phase = TAU * frequency * t
        tone = math.sin(phase) + .34 * math.sin(2 * phase) + .11 * math.sin(3 * phase)
        mix(target, amplitude * env * tone, -.08)


def add_pizzicato(note, start, amplitude=.085):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    duration = .7
    for index in range(int(duration * SAMPLE_RATE)):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        env = min(1.0, t / .012) * math.exp(-5.4 * t)
        phase = TAU * frequency * t
        tone = math.sin(phase) + .27 * math.sin(2 * phase + .1)
        mix(target, amplitude * env * tone, .06)


def add_strings(notes, start, duration, amplitude=.028, swell=1.0):
    begin = int(start * SAMPLE_RATE)
    length = int(duration * SAMPLE_RATE)
    for voice, note in enumerate(notes):
        frequency = midi(note)
        pan = -.24 + voice * .16
        for index in range(length):
            target = begin + index
            if target >= sample_count:
                break
            t = index / SAMPLE_RATE
            env = soft_envelope(t, duration, attack=.72, release=.75)
            breathe = .86 + .14 * math.sin(TAU * .22 * t + voice)
            phase = TAU * frequency * t + .022 * math.sin(TAU * (4.3 + voice * .18) * t)
            tone = math.sin(phase) + .2 * math.sin(2 * phase)
            mix(target, amplitude * swell * env * breathe * tone, pan)


def add_woodwind(note, start, duration, amplitude=.032):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    length = int(duration * SAMPLE_RATE)
    for index in range(length):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        env = soft_envelope(t, duration, attack=.16, release=.32)
        vibrato = .035 * math.sin(TAU * 5.1 * t)
        phase = TAU * frequency * t + vibrato
        tone = math.sin(phase) + .22 * math.sin(3 * phase)
        mix(target, amplitude * env * tone, .23)


def add_bell(note, start, amplitude=.043, pan=-.28):
    frequency = midi(note)
    begin = int(start * SAMPLE_RATE)
    duration = 2.1
    for index in range(int(duration * SAMPLE_RATE)):
        target = begin + index
        if target >= sample_count:
            break
        t = index / SAMPLE_RATE
        env = math.exp(-2.6 * t)
        phase = TAU * frequency * t
        tone = math.sin(phase) + .48 * math.sin(1.503 * phase) + .18 * math.sin(2.71 * phase)
        mix(target, amplitude * env * tone, pan)


# A soft bell summons the theme before the celesta enters.
add_bell(81, .25, .055, -.34)
add_bell(88, .82, .033, .31)

for bar_index, bar in enumerate(melody_bars):
    cursor = intro + bar_index * BAR
    for note_index, (note, units) in enumerate(bar):
        duration = units * EIGHTH
        add_celesta(note, cursor, duration, .145 if bar_index < 8 else .17, note_index == 0)
        if bar_index >= 8 and note_index in (0, 2):
            add_celesta(note + 12, cursor, duration * .78, .034, True)
        cursor += duration


progression = [
    (45, 48, 52, 57), (41, 45, 48, 52), (43, 47, 50, 55), (40, 44, 47, 52),
    (45, 48, 52, 57), (41, 45, 48, 53), (43, 47, 50, 55), (40, 44, 47, 52),
    (45, 48, 52, 57), (46, 50, 53, 57), (41, 45, 48, 53), (40, 44, 47, 52),
    (45, 48, 52, 57), (43, 47, 50, 55), (40, 44, 47, 52), (45, 48, 52, 57),
]

for bar_index, chord in enumerate(progression):
    start = intro + bar_index * BAR
    swell = 1.0 if bar_index < 8 else 1.26
    add_strings(chord, start, BAR + .24, .026, swell)

    # A rolling harp figure and three-beat pizzicato pulse give the track its
    # floating, magical-waltz movement.
    harp_notes = (chord[0] - 12, chord[2], chord[1], chord[3], chord[2], chord[1])
    for step, note in enumerate(harp_notes):
        add_harp(note, start + step * EIGHTH, .046 if bar_index < 8 else .052)
    for beat, note in enumerate((chord[0] - 12, chord[2] - 12, chord[1] - 12)):
        add_pizzicato(note, start + beat * 2 * EIGHTH, .072 if bar_index < 8 else .082)

    if bar_index in (3, 7, 11, 15):
        add_bell(chord[3] + 24, start, .036, -.3 if bar_index % 2 else .3)

# A quiet answering woodwind line appears after the theme is established.
counterline = [(64, 3), (67, 3), (65, 2), (64, 2), (62, 2), (64, 4), (68, 2), (69, 6)]
counter_cursor = intro + 8 * BAR
for note, units in counterline:
    duration = units * EIGHTH
    add_woodwind(note, counter_cursor, duration, .03)
    counter_cursor += duration

# Wide room reflections and a long, soft tail make the synthetic ensemble feel
# more cinematic while keeping the file small enough for mobile loading.
dry_left = array("f", left)
dry_right = array("f", right)
for delay_seconds, gain in ((.19, .19), (.41, .115), (.68, .065), (1.02, .034)):
    delay = int(delay_seconds * SAMPLE_RATE)
    for index in range(delay, sample_count):
        left[index] += dry_right[index - delay] * gain
        right[index] += dry_left[index - delay] * gain

# Apply a gentle fade at the end so looping never clicks.
fade_start = total_duration - 1.8
for index in range(int(fade_start * SAMPLE_RATE), sample_count):
    t = index / SAMPLE_RATE
    gain = max(0.0, (total_duration - t) / (total_duration - fade_start))
    left[index] *= gain
    right[index] *= gain

peak = max(max(abs(value) for value in left), max(abs(value) for value in right), .001)
scale = .84 / peak
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
