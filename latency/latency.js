const outputSelectEl = document.getElementById("output-select");
const midiSignalEl = document.getElementById("midi-signals");
const latencyEl = document.getElementById("latency");
const minEl = document.getElementById("latency-min");
const maxEl = document.getElementById("latency-max");
const meanEl = document.getElementById("latency-mean");
const countEl = document.getElementById("count");
const unknownCountEl = document.getElementById("unknown-count");
const sentCountEl = document.getElementById("sent-count");
const lastMessageEl = document.getElementById("last-message");

let lastTimestamp = undefined;
let midiDevice = undefined;
let lastSentMessage = undefined;
let lastMessageSentAt = undefined;
let latencies = [];
let sentCount = 0;
let totalMessages = 0;
let min = undefined;
let max = undefined;
let mean = 0;

main();

function main() {
  navigator.requestMIDIAccess().then(processMidiOutputs);
}

function processMidiOutputs(midiAccess) {
  outputSelectEl.innerHTML = "";

  async function selectMidiOutput(id) {
    midiDevice = midiAccess.outputs.get(id);
    await midiDevice.open();

    for(const input of midiAccess.inputs.values()) {
      if(input.name === midiDevice.name) {
        await input.open();
        input.onmidimessage = onMidiMessage;
        break;
      }
    }

    setTimeout(startLatencyMeasurement, 500);
  }

  outputSelectEl.onchange = (event) => selectMidiInput(event.target.value);

  const inputs = new Set([...midiAccess.inputs.values()].map(i => i.name));

  Array.from(midiAccess.outputs.values())
    .filter(o => inputs.has(o.name))
    .map(output => new Option(output.name, output.id))
    .forEach(option => {
      outputSelectEl.add(option)
    });

  if (outputSelectEl.firstChild) {
    selectMidiOutput(outputSelectEl.firstChild.value);
  } else {
    const option = new Option("(none found)")
    option.disabled = true;
    outputSelectEl.options.add(option);
  }

  outputSelectEl.firstChild.selected = true;
}

function onMidiMessage(message) {
  const now = window.performance.now();
  totalMessages += 1;

  if(message.data[0] !== lastSentMessage[0] || message.data[1] !== lastSentMessage[1] || message.data[2] !== lastSentMessage[2]) {    
    unknownCountEl.innerText = totalMessages - latencies.length;
    return;
  }

  setTimeout(startLatencyMeasurement, 100);

  const latency = now - lastMessageSentAt;
  mean = (latency + mean * latencies.length) / (latencies.length + 1);
  latencies.push(latency);
  min = Math.min(min ?? latency, latency);
  max = Math.max(max ?? latency, latency);

  latencyEl.innerText = latency.toFixed(4);
  countEl.innerText = latencies.length;
  
  minEl.innerText = min.toFixed(4);
  maxEl.innerText = max.toFixed(4);
  meanEl.innerText = mean.toFixed(4);
}

function startLatencyMeasurement() {
  lastSentMessage = [randomInt(0x90, 0xA0), randomInt(128), randomInt(128)];
  lastMessageSentAt = window.performance.now();
  midiDevice.send(lastSentMessage);

  sentCount += 1;
  sentCountEl.innerText = sentCount
  lastMessageEl.innerText = "[" + lastSentMessage.map(i => `0x${i.toString(16).padStart(2, "0").toUpperCase()}`).join(", ") + "]";
}

function randomInt(limitA, limitB=0) {
  const minIncl = Math.min(limitA, limitB);
  const maxExcl = Math.max(limitA, limitB);

  return Math.floor(minIncl + Math.random() * (maxExcl-minIncl));
}