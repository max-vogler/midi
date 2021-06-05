"use strict";

const midiSignalEl = document.getElementById("midi-signals");
const linkEl = document.getElementById("qrcode");
const qrcode = document.querySelector("#qrcode canvas");
const statusEl = document.getElementById("connection");
const midiStatusEl = document.getElementById("midi-status");
const outputSelectEl = document.getElementById("output-select");

const params = new URLSearchParams(window.location.hash.substr(1));
let midiDevice = undefined;
let peer = undefined;

main();

function main() {
  if (navigator.requestMIDIAccess === undefined) {
    outputSelectEl.firstElementChild.text = "Failed requesting MIDI access";
  } else {
    navigator.requestMIDIAccess().then(processMidiOutputs);
  }
  
  peer = new Peer(params.get("id"), { debug: 2 })
    .on("connection", initConnection)
    .on("open", onPeerOpen);
}

function onPeerOpen(id) {
  params.set("id", id);
  window.location.hash = `#${params}`;

  const url = `${document.location.origin}/touch/#${id}`;
  console.log(url);
  linkEl.href = url;
  QRCode.toCanvas(qrcode, url);

  statusEl.innerText = `Scan QR code to connect.`;
}

function initConnection(connection) {
  connection
    .on("open", () => {
      statusEl.innerText = connection.label;
    })
    .on("data", function (midiMessages) {
      renderTable(midiMessages);

      if (midiDevice) {
        midiMessages.forEach((message) => midiDevice.send(message));
      }
    })
    .on("close", () => {
      statusEl.innerText = "Disconnected";
    })
    .on("error", () => {
      statusEl.innerText = "Disconnected";
    });
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

async function processMidiOutputs(midiAccess) {
  outputSelectEl.innerHTML = "";

  async function selectMidiOutput(id) {
    midiDevice = midiAccess.outputs.get(id);
    await midiDevice.open();
  }

  outputSelectEl.onchange = (event) => selectMidiInput(event.target.value);

  for (const output of midiAccess.outputs.values()) {
    const option = document.createElement("option");
    option.text = output.name;
    option.value = output.id;
    outputSelectEl.options.add(option);
  }

  if (outputSelectEl.firstChild) {
    await selectMidiOutput(outputSelectEl.firstChild.value);
  } else {
    const option = document.createElement("option");
    option.text = `(none found)`;
    option.disabled = true;
    outputSelectEl.options.add(option);
  }

  outputSelectEl.firstChild.selected = true;
}
