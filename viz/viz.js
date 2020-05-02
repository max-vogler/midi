// Full credit goes to: Fabian Iwand • twitter.com/mootari
// https://observablehq.com/@mootari/exercise-for-the-reader

const SIDES = 3,
  INTERVAL = 3,
  COUNT = 50,
  MIN_POLY_RADIUS = 50,
  MIN_CIRCLE_RADIUS = 150,
  PI = Math.PI,
  PIH = PI / 2,
  SPEED = 1e-4,
  STEP = PI / COUNT,
  OVERDRAW = PIH;

function quarterNoteEasing({ messageCounter }) {
  if (messageCounter === undefined) {
    return 0;
  } else if (messageCounter % 24 === 23) {
    return 0.66;
  } else if (messageCounter % 24 === 22) {
    return 0.33;
  } else {
    return 1 - (messageCounter % 24) / 24;
  }
}

export class StackedPolygonVisualizer {
  constructor(canvasEl) {
    this.clockMessage = {};
    this.size = canvasEl.width;
    this.stopRequested = true;
    this.areaFull = [0, 0, this.size, this.size];
    this.areaLeft = [0, 0, this.size / 2, this.size];
    this.areaRight = [this.size / 2, 0, this.size / 2, this.size];

    this.cLeft = this.initContext(document.createElement("canvas"));
    this.cRight = this.initContext(document.createElement("canvas"));
    this.cOut = this.initContext(canvasEl);
    this.cOut.fillStyle = "#111";
    this.cOut.canvas.style.maxWidth = `${this.size}px`;
    this.cOut.canvas.style.width = "100%";
  }

  start() {
    this.stopRequested = false;
    this.renderLoop();
  }

  stop() {
    this.stopRequested = true;
  }

  onClockMessage(msg) {
    this.clockMessage = msg;
  }

  /** @private */
  initContext(el) {
    el.width = this.size;
    el.height = this.size;

    const c = el.getContext("2d");

    c.lineWidth = 1;
    c.fillStyle = "#111";
    c.strokeStyle = "#999";
    return c;
  }

  /** @private */
  renderLoop() {
    if (this.stopRequested) {
      return;
    }

    const time = Date.now() * SPEED;
    const notefrac = this.clockMessage.synchronized
      ? quarterNoteEasing(this.clockMessage)
      : 0;

    this.cOut.fillRect(...this.areaFull);
    this.cLeft.clearRect(...this.areaLeft);
    this.cRight.clearRect(...this.areaRight);

    let polyRadius = MIN_POLY_RADIUS + 0 * notefrac;
    let radius = MIN_CIRCLE_RADIUS + 10 * notefrac;

    const rotation = (i) => Math.cos(INTERVAL * i) + time * Math.PI * 2;
    for (let i = -PIH - OVERDRAW; i < PIH + OVERDRAW; i += STEP)
      this.drawPolygon(this.cRight, i, rotation(i), polyRadius, radius);
    for (let i = PIH - OVERDRAW; i < PI + PIH + OVERDRAW; i += STEP)
      this.drawPolygon(this.cLeft, i, rotation(i), polyRadius, radius);

    this.cOut.drawImage(this.cLeft.canvas, ...this.areaLeft, ...this.areaLeft);
    this.cOut.drawImage(
      this.cRight.canvas,
      ...this.areaRight,
      ...this.areaRight
    );

    requestAnimationFrame(() => this.renderLoop());
  }

  /** @private */
  drawPolygon(c, a, rot = 0, polyRadius, radius) {
    const cx = this.size / 2 + Math.cos(a) * radius;
    const cy = this.size / 2 + Math.sin(a) * radius;
    c.beginPath();
    this.getPolygonPoints(
      SIDES,
      polyRadius,
      a + rot,
      cx,
      cy
    ).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.closePath();
    c.fill();
    c.stroke();
  }

  /** @private */
  getPolygonPoints(SIDES, r, a, x = 0, y = 0) {
    const step = (PI * 2) / SIDES;
    return Array(SIDES)
      .fill()
      .map((v, i) => [
        x + Math.cos(a + i * step) * r,
        y + Math.sin(a + i * step) * r,
      ]);
  }
}
