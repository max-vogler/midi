const CLOCK = 248;
const START = 250;
const STOP = 252;

export class MidiClockInput {
  constructor() {
    this.midi = undefined;
    this.input = undefined;

    this.onClockMessage = () => undefined;
  }

  async requestAccess() {
    this.midi = await navigator.requestMIDIAccess();
    return this.midi;
  }

  getInputs() {
    return Array.from(this.midi.inputs.values());
  }

  listenTo(inputId) {
    if (this.input) {
      this.input.removeEventListener("midimessage", this.onMidiMessage);
    }

    this.messageCounter = 0;
    this.synchronized = false;
    this.lastQuarterAt = undefined;
    this.bpm = undefined;
    this.input = this.midi.inputs.get(inputId);
    this.input.addEventListener("midimessage", (msg) =>
      this.onMidiMessage(msg)
    );
  }

  onMidiMessage(event) {
    if (event.data.length != 1) {
      console.warn("Unknown message", event);
      return;
    }

    const rawMessage = event.data[0];

    if (rawMessage === STOP) {
      this.messageCounter = 0;
      this.synchronized = false;
      this.lastQuarterAt = undefined;
    } else if (rawMessage === START) {
      this.messageCounter = 0;
      this.synchronized = true;
      this.lastQuarterAt = undefined;
    } else if (rawMessage === CLOCK) {
      this.messageCounter += 1;
    } else {
      console.warn("Unknown message", rawMessage);
      return;
    }

    const quarterNotes = this.messageCounter / 24;

    if (this.messageCounter % 24 === 0) {
      const now = event.receivedTime || event.timeStamp;

      if (this.lastQuarterAt) {
        this.bpm = 60000 / (event.timeStamp - this.lastQuarterAt);
      }
      this.lastQuarterAt = now;
    }

    const clockMessage = {
      messageCounter: this.messageCounter,
      note: quarterNotes / 4,
      bpm: this.bpm,
      synchronized: this.synchronized,
    };

    this.onClockMessage(clockMessage);
  }
}

export function calculateBars(notes) {
  const quarterNotes = parseInt(notes * 4);

  const beat = quarterNotes % 4,
    bar = parseInt(quarterNotes / 4),
    segment = parseInt(bar / 4);

  return {
    beat: beat + 1,
    bar: (bar % 4) + 1,
    segment: segment + 1,
    fraction: (notes * 4) % 1,
  };
}
