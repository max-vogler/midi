import { MidiClockInput, calculateBars } from "./midiclock.js";
import { Renderer } from "./viz.js";

const beatsContainer = document.querySelector(".beats");
const bpmContainer = document.querySelector(".bpm");
const sourceContainer = document.querySelector("select");
const canvas = document.querySelector("canvas");

(async function main() {
  const renderer = new Renderer(canvas);
  renderer.render();

  beatsContainer.innerText = "REQUESTING MIDI ACCESS";
  const midiclock = new MidiClockInput();
  await midiclock.requestAccess();

  midiclock.onClockMessage = (msg) => {
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
  };

  let selectedInput = undefined;

  function selectMidiInput(id) {
    beatsContainer.innerText = "WAITING FOR MIDI CLOCK SIGNAL";
    midiclock.listenTo(id);
    selectedInput = id;
  }

  sourceContainer.onchange = (event) => selectMidiInput(event.target.value);

  for (const input of midiclock.getInputs()) {
    const option = document.createElement("option");
    option.text = `${input.manufacturer} ${input.name}`;
    option.value = input.id;

    if (!selectedInput) {
      option.selected = true;
      selectMidiInput(input.id);
    }

    sourceContainer.options.add(option);
  }

  if (!selectedInput) {
    beatsContainer.innerText = "NO MIDI INPUTS FOUND";
  }
})();
