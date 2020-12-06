const iframe = document.querySelector("iframe");
const iframeContainer = iframe.parentElement;
const gamepadStatusEl = document.getElementById("gamepad-status");
const outputSelectEl = document.getElementById("output-select");
const midiSignalEl = document.getElementById("midi-signals");

let lastTimestamp = undefined;
let midiDevice = undefined;

main();

function main() {
  window.addEventListener("gamepadconnected", updateGamePads);
  window.addEventListener("gamepadconnected", updateGamePads);
  navigator.requestMIDIAccess().then(processMidiOutputs);
}

function updateGamePads() {
  const gamepad = navigator.getGamepads()[0];

  if (gamepad) {
    gamepadStatusEl.innerText = gamepad.id;
    iframe.classList.add("active");
    gamePadProcessLoop();
  } else {
    gamepadStatusEl.innerText = "(disconnected)";
    iframe.classList.remove("active");
  }
}

function gamePadProcessLoop() {
  requestAnimationFrame(gamePadProcessLoop);

  const gamepad = navigator.getGamepads()[0]; // Re-query to get latest gamepad state.
  if (!gamepad || lastTimestamp >= gamepad.timestamp) {
    return;
  }

  lastTimestamp = gamepad.timestamp;

  const midiMessages = convertGamepadInputToMidi(gamepad);

  if (midiDevice) {
    midiMessages.forEach((message) => midiDevice.send(message));
  }

  renderTable(midiMessages);
}

function convertGamepadInputToMidi(gamepad) {
  const NOTE_OFF = 0x80;
  const NOTE_ON = 0x90;

  const buttonMessages = gamepad.buttons.map((button, i) => [
    button.value === 0 ? NOTE_OFF : NOTE_ON, // command
    i, // pitch
    Math.round(button.value * 127), // velocity
  ]);

  const axesMessages = gamepad.axes.map((axis, i) => [
    (Math.abs(axis) < 0.1 ? NOTE_OFF : NOTE_ON) + 1,
    i,
    Math.round((axis / 2 + 0.5) * 127),
  ]);

  return [...buttonMessages, ...axesMessages];
}

function processMidiOutputs(midiAccess) {
  outputSelectEl.innerHTML = "";

  function selectMidiOutput(id) {
    midiDevice = midiAccess.outputs.get(id);
  }

  outputSelectEl.onchange = (event) => selectMidiInput(event.target.value);

  for (const output of midiAccess.outputs.values()) {
    const option = document.createElement("option");
    option.text = output.name;
    option.value = output.id;
    outputSelectEl.options.add(option);
  }

  if (outputSelectEl.firstChild) {
    selectMidiOutput(outputSelectEl.firstChild.value);
  } else {
    const option = document.createElement("option");
    option.text = `(none found)`;
    option.disabled = true;
    outputSelectEl.options.add(option);
  }

  outputSelectEl.firstChild.selected = true;
}

function extractCommand(cmd) {
  if (cmd >= 128 && cmd < 144) {
    return ["NOTE OFF", (cmd - 128).toString()];
  } else if (cmd >= 144 && cmd < 160) {
    return ["NOTE ON ", (cmd - 144).toString()];
  } else {
    return [`0x${cmd.toString(16)}`, ""];
  }
}

function renderTable(midiMessages) {
  const columns = [
    ["COMMAND ", "CHAN", "PTCH", "VELO"],
    ...midiMessages.map(([cmd, pitch, velocity]) => [
      ...extractCommand(cmd),
      pitch,
      velocity,
    ]),
  ].map((row) => row.map((cell) => cell.toString().padStart(6)).join(""));

  midiSignalEl.innerText = columns.join("\n");
}
