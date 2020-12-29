const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");
const detectionEl = document.getElementById("detection");
const outputSelectEl = document.getElementById("output-select");
const midiSignalEl = document.getElementById("midi-signals");

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;

let midiDevice = undefined;

async function main() {
  navigator.requestMIDIAccess().then(processMidiOutputs);
  const [model, video] = await Promise.all([handpose.load(), streamWebcam()]);

  video.width = video.videoWidth;
  video.height = video.videoHeight;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.strokeStyle = "red";
  ctx.fillStyle = "red";
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);

  const processVideoLoop = async () => {
    const predictions = await model.estimateHands(video);
    processFrame(predictions);
    requestAnimationFrame(processVideoLoop);
  };
  processVideoLoop();
}

function processFrame(predictions) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  let midiMessage;

  if (predictions.length > 0) {
    const openness = calculateHandOpenness(predictions[0].annotations);
    detectionEl.innerText = (openness * 100).toFixed(0).padStart(3) + " %";
    midiMessage = [NOTE_ON, 0, Math.round(openness * 127)];
  } else {
    detectionEl.innerText = "(no hand detected)";
    midiMessage = [NOTE_OFF, 0, 0];
  }

  if (midiDevice) {
    midiDevice.send(midiMessage);
  }

  renderTable([midiMessage]);
}

async function streamWebcam() {
  const video = document.getElementById("video");
  video.srcObject = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      facingMode: "user",
      width: 320,
      height: 240,
    },
  });
  return new Promise((resolve) => {
    video.onloadedmetadata = () => {
      video.play();
      resolve(video);
    };
  });
}

function calculateHandOpenness(handPoints) {
  // Ignore thumb, because the top four fingers move more alike.
  const { palmBase, thumb, ...trackedFingers } = handPoints;
  const openness = Object.values(trackedFingers).map((fingerPoints) =>
    calculateFingerOpenness(palmBase[0], fingerPoints)
  );
  return Math.min(1, Math.max(0, median(openness)));
}

function calculateFingerOpenness(palmPoint, fingerPoints) {
  // Calculate and draw in the same method for easy visualization during prototyping.
  const fingerBasePoint = fingerPoints[0];
  const fingerTipPoint = fingerPoints[fingerPoints.length - 1];

  drawCircle(fingerBasePoint);
  drawCircle(fingerTipPoint);
  drawLine(palmPoint, fingerPoints);

  const distToBase = euclideanDistance(palmPoint, fingerBasePoint);
  const distToTip = euclideanDistance(palmPoint, fingerTipPoint);
  return 0.3 + ((distToTip - distToBase) / distToBase) * 0.8;
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

function euclideanDistance([ax, ay], [bx, by]) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

function median(array) {
  array = [...array].sort((a, b) => a - b); // Create a sorted copy of the input array.
  const middle = Math.floor(array.length / 2);
  return array.length % 2 === 0
    ? array[middle]
    : (array[middle - 1] * array[middle]) / 2;
}

function drawCircle([x, y], radius = 3) {
  const circle = new Path2D();
  circle.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill(circle);
}

function drawLine([ax, ay], points) {
  const line = new Path2D();
  line.moveTo(ax, ay);
  points.forEach(([x, y]) => line.lineTo(x, y));
  ctx.stroke(line);
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

main();
