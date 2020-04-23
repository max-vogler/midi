import { MidiClockInput, calculateBars } from "./midiclock.js";
import { Renderer } from "./viz.js";

const beatsContainer = document.querySelector(".beats");
const bpmContainer = document.querySelector(".bpm");
const sourceContainer = document.querySelector("select");
const canvas = document.querySelector("canvas");

let midiclock = undefined;
let renderer = undefined;

function populateMidiInputs(inputs) {
  sourceContainer.onchange = (event) => selectMidiInput(event.target.value);
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

    sourceContainer.options.add(option);
  }
}

function selectMidiInput(id) {
  beatsContainer.innerText = "WAITING FOR MIDI CLOCK SIGNAL";
  midiclock.listenTo(id);
}

function renderClockMessage(msg) {
  const { fraction, beat, bar, segment } = calculateBars(msg.note);
  renderer.clockMessage = msg;

  if (msg.synchronized) {
    beatsContainer.innerText = `${segment}.${bar}.${beat}`;
  } else {
    const fractionFormatted = fraction.toFixed(2).slice(2);
    beatsContainer.innerText = `UNSYNCHRONIZED PHASE .${fractionFormatted}`;
  }

  if (msg.bpm) {
    bpmContainer.innerText = `${msg.bpm.toFixed(2)} BPM`;
  }
}

(async function main() {
  renderer = new Renderer(canvas);
  renderer.render();

  beatsContainer.innerText = "REQUESTING MIDI ACCESS";

  midiclock = new MidiClockInput();
  midiclock.onClockMessage = (msg) => renderClockMessage(msg);
  await midiclock.requestAccess();
  beatsContainer.innerText = "NO MIDI INPUTS FOUND";

  const inputs = await midiclock.getInputs();
  populateMidiInputs(inputs);
})();
