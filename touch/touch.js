"use strict";

const statusEl = document.getElementById("status");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");
const devicePixelRatio = window.devicePixelRatio || 1;
const receiverId = window.location.hash.substr(1);
let nextEvent = undefined;
let peer = undefined;
let sendMidiMessages = () => {};

main();

function main() {
  canvas.addEventListener("pointerdown", (event) =>
    scheduleEvent({ event, active: true })
  );
  canvas.addEventListener("pointermove", (event) => {
    scheduleEvent({ event, active: event.buttons !== 0 });
  });
  canvas.addEventListener("pointerup", (event) =>
    scheduleEvent({ event, active: false })
  );
  canvas.addEventListener("pointercancel", (event) =>
    scheduleEvent({ event, active: false })
  );
  canvas.addEventListener("pointerout", (event) =>
    scheduleEvent({ event, active: false })
  );

  resizeCanvas();
  document.body.onresize = () => resizeCanvas();

  drawCoords(false, { x: 0.5, y: 0.5, z: 0 });

  if (receiverId) {
    statusEl.innerText = `Connecting to GATEWAY ${receiverId}`;
    peer = new Peer(undefined, { debug: 2 })
      .on("open", connectToPeer)
      .on("error", connectToPeer);
  } else {
    statusEl.innerText = "Waiting for MIDI device";
    navigator.requestMIDIAccess().then(async (access) => {
      access.onstatechange = () => processMidiOutputs(access);
      await processMidiOutputs(access);
    });
  }
}

async function processMidiOutputs(access) {
  const output = Array.from(access.outputs.values())[0];
  if (output) {
    await output.open();
    statusEl.innerText = `Connected to ${output.name}`;
    sendMidiMessages = (messages) =>
      messages.forEach((msg) => output.send(msg));
  } else {
    statusEl.innerText = "Waiting for MIDI device";
    sendMidiMessages = () => {};
  }
}

function resizeCanvas() {
  canvas.width = document.body.clientWidth * devicePixelRatio;
  canvas.height = document.body.clientHeight * devicePixelRatio;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
}

function scheduleEvent(event) {
  if (!nextEvent) {
    requestAnimationFrame(processScheduledEvent);
  }
  nextEvent = event;
}

function processScheduledEvent() {
  const { event, active } = nextEvent;
  const coords = transformPointerCoords(event, active);

  sendMidiMessages(convertToMidi(active, [coords.x, coords.y, coords.z]));

  drawCoords(active, coords);

  nextEvent = undefined;
}

function transformPointerCoords(event, active) {
  // If the device does not support pressure, use the documented
  // fallback of reporting 0.5 for a click.
  const fallback = active ? 0.5 : 0;
  const pressure = event.pressure ?? fallback;

  return {
    x: event.x / document.body.clientWidth,
    y: event.y / document.body.clientHeight,
    // Chrome on Android weirdly reports `pressure` in [0, 2].
    z: Math.min(Math.max(pressure, 0), 1),
  };
}

function drawLine(x0, y0, x1, y1) {
  x0 *= document.body.clientWidth;
  x1 *= document.body.clientWidth;
  y0 *= document.body.clientHeight;
  y1 *= document.body.clientHeight;

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawCoords(active, { x, y, z }) {
  const canvasX = x * document.body.clientWidth;
  const canvasY = y * document.body.clientHeight;
  const [xpct, ypct, zpct] = [x, y, z].map((i) => Math.round(i * 100));
  const padding = 5;
  const fontSize = 18;
  const radius = 100 * z;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; // Draw faded background lines.
  for (const i of [0.25, 0.5, 0.75]) {
    drawLine(0, i, 1, i);
    drawLine(i, 0, i, 1);
  }

  ctx.strokeStyle = active ? "white" : "rgba(255, 255, 255, 0.5)"; // Draw active lines.
  drawLine(x, 0, x, 1);
  drawLine(0, y, 1, y);

  ctx.beginPath();
  ctx.arc(canvasX, canvasY, radius, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = "white";
  ctx.font = `${fontSize}px monospace`;
  ctx.fillText(`${xpct}%`, canvasX + padding, fontSize + padding);
  ctx.fillText(`${ypct}%`, padding, canvasY - padding);

  if (z) {
    ctx.fillText(`${zpct}%`, canvasX + padding + radius, canvasY - padding);
  }
}

function connectToPeer() {
  statusEl.innerText = `Connecting to GATEWAY ${receiverId}`;
  const conn = peer.connect(receiverId);

  conn.on("open", () => {
    sendMidiMessages = (messages) => {
      if (conn.open) {
        conn.send(messages);
      }
    };
    statusEl.innerText = `Connected to GATEWAY ${conn.label}`;
  });

  conn.on("close", connectToPeer);
  conn.on("error", connectToPeer);
}

function convertToMidi(active, values) {
  const NOTE_OFF = 0x80;
  const NOTE_ON = 0x90;
  const command = active ? NOTE_ON : NOTE_OFF;

  return values
    .filter((value) => value !== undefined)
    .map((value) => Math.round(Math.min(1, Math.max(0, value)) * 127))
    .map((velocity, pitch) => [command, pitch, velocity]);
}
