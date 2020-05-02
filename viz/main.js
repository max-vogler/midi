import { MidiClockInput, calculateBars } from "./midiclock.js";
import { StackedPolygonVisualizer } from "./viz.js";

const mainMessageEl = document.getElementById("main-msg");
const sideMessageEl = document.getElementById("side-msg");
const sourceSelectEl = document.getElementById("source-select");
const canvasEl = document.getElementById("main-canvas");

let midiclock = undefined;

function showMessage(msg) {
  mainMessageEl.innerText = msg;
}

function populateMidiInputs(inputs) {
  sourceSelectEl.onchange = (event) => selectMidiInput(event.target.value);
  let first = true;

  for (const input of inputs) {
    const option = document.createElement("option");
    option.text = `${input.manufacturer} ${input.name}`;
    option.value = input.id;

    if (first) {
      option.selected = true;
      selectMidiInput(input.id);
      first = false;
    }

    sourceSelectEl.options.add(option);
  }
}

function selectMidiInput(id) {
  showMessage("WAITING FOR MIDI CLOCK SIGNAL");
  midiclock.listenTo(id);
}

class ClockMessageTextVisualizer {
  constructor(mainMessageEl, sideMessageEl) {
    this.mainMessageEl = mainMessageEl;
    this.sideMessageEl = sideMessageEl;
    this.stopped = true;
  }

  start() {
    this.stopped = false;
  }
  stop() {
    this.stopped = true;
  }

  onClockMessage(msg) {
    if (this.stopped) {
      return;
    }

    const { fraction, beat, bar, segment } = calculateBars(msg.note);

    if (msg.synchronized) {
      this.mainMessageEl.innerText = `${segment}.${bar}.${beat}`;
    } else {
      const fractionFormatted = fraction.toFixed(2).slice(2);
      this.mainMessageEl.innerText = `UNSYNCHRONIZED PHASE .${fractionFormatted}`;
    }

    if (msg.bpm) {
      this.sideMessageEl.innerText = `${msg.bpm.toFixed(2)} BPM`;
    }
  }
}

(async function main() {
  const textViz = new ClockMessageTextVisualizer(mainMessageEl, sideMessageEl);
  textViz.start();

  const viz = new StackedPolygonVisualizer(canvasEl);
  viz.start();

  let isRendering = true;
  canvasEl.addEventListener("click", () => {
    if (isRendering) {
      viz.stop();
      isRendering = false;
    } else {
      viz.start();
      isRendering = true;
    }
  });

  showMessage("REQUESTING MIDI ACCESS");

  midiclock = new MidiClockInput();
  midiclock.onClockMessage = (msg) => {
    textViz.onClockMessage(msg);
    viz.onClockMessage(msg);
  };
  await midiclock.requestAccess();
  showMessage("NO MIDI INPUTS FOUND");

  const inputs = await midiclock.getInputs();
  populateMidiInputs(inputs);
})();
