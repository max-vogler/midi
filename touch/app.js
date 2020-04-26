const devicePixelRatio = window.devicePixelRatio || 1;

const canvas = document.querySelector("canvas");
const qrcode = document.getElementById("qrcode");
const statusEl = document.getElementById("connection");

const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = document.body.clientWidth * devicePixelRatio;
  canvas.height = document.body.clientHeight * devicePixelRatio;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
resizeCanvas();
document.body.onresize = () => resizeCanvas();

canvas.addEventListener("pointerdown", (e) => debounceDraw(e), false);
canvas.addEventListener("pointermove", (e) => debounceDraw(e), false);
canvas.addEventListener("pointerup", () => stop(), false);
canvas.addEventListener("pointercancel", () => stop(), false);
canvas.addEventListener("pointerout", () => stop(), false);

let drawRequested = false;
function debounceDraw(e) {
  if (drawRequested) {
    return;
  }

  drawRequested = e;

  requestAnimationFrame(() => {
    const coords = transformPointerCoords(drawRequested);

    if (currentConn && currentConn.open && coords) {
      currentConn.send(coords);
    }

    if (coords) {
      draw(coords);
    }
    drawRequested = false;
  });
}

function stop() {
  drawRequested = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function transformPointerCoords(event) {
  if (event.buttons !== 1) {
    return undefined;
  } else {
    return {
      x: event.x / document.body.clientWidth,
      y: event.y / document.body.clientHeight,
    };
  }
}

function draw({ x, y }) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const canvasX = x * document.body.clientWidth;
  const canvasY = y * document.body.clientHeight;

  ctx.strokeStyle = "white";
  ctx.beginPath();
  ctx.moveTo(canvasX, 0);
  ctx.lineTo(canvasX, canvas.height);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, canvasY);
  ctx.lineTo(canvas.width, canvasY);
  ctx.stroke();

  const xpct = Math.round(x * 100);
  const ypct = Math.round(y * 100);

  ctx.fillStyle = "white";
  ctx.font = "18px monospace";
  ctx.fillText(`${xpct} %`, canvasX, 18);
  ctx.fillText(`${ypct} %`, 0, canvasY);
}

const params = new URLSearchParams(window.location.hash.substr(1));
const peer = new Peer(params.get("id"), { debug: 2 });
let currentConn = undefined;

peer.on("error", (e) => {
  console.error("PEER ERROR", e);
  connectIfRequested();
});
peer.on("close", (e) => console.error("PEER CLOSE", e));
peer.on("disconnected", (e) => console.error("PEER DISCONNECTED", e));

function connectIfRequested() {
  if (params.get("connect")) {
    const remoteId = params.get("connect");
    statusEl.innerText = `Connecting to ${remoteId}`;
    const conn = peer.connect(remoteId);
    initConnection(conn);
  } else {
    qrcode.style.display = "block";
  }
}

peer.on("open", (id) => {
  params.set("id", id);
  console.log(params.toString());
  window.location.hash = `#${params}`;

  const url = new URL(document.location.href);
  url.hash = `#connect=${id}`;
  QRCode.toCanvas(qrcode, url.toString());

  connectIfRequested();
});

peer.on("connection", function (remoteConn) {
  initConnection(remoteConn);
});

function initConnection(c) {
  qrcode.style.display = "none";

  c.on("open", () => {
    currentConn = c;
    statusEl.innerText = `Connected to ${c.peer}`;
  });

  c.on("data", function (data) {
    draw(data);
  });

  c.on("close", () => {
    statusEl.innerText = "Disconnected";
    currentConn = undefined;
  });

  c.on("error", (e) => {
    console.error(`Disconnecting: ${e}`);
    statusEl.innerText = "Disconnected";
    currentConn = undefined;
    connectIfRequested();
  });
}
