export const ANNOTATION_COLORS = [
  '#38bdf8',
  '#f43f5e',
  '#f59e0b',
  '#22c55e',
  '#a78bfa',
  '#ffffff',
];

export const ANNOTATION_TOOLS = {
  PEN: 'pen',
  HIGHLIGHTER: 'highlighter',
  ARROW: 'arrow',
  CIRCLE: 'circle',
  TEXT: 'text',
};

export function createAnnotationId() {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function cloneAnnotations(items) {
  return items.map((item) => ({ ...item, points: item.points?.map((point) => ({ ...point })) }));
}

export function normalizePoint(clientX, clientY, rect) {
  return {
    x: clamp((clientX - rect.left) / rect.width, 0, 1),
    y: clamp((clientY - rect.top) / rect.height, 0, 1),
  };
}

export function denormalizePoint(point, width, height) {
  return { x: point.x * width, y: point.y * height };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function renderAnnotations(ctx, annotations, width, height, { mirror = false } = {}) {
  ctx.save();
  if (mirror) {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  }

  annotations.forEach((item) => {
    if (!item) return;
    ctx.save();
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (item.type === ANNOTATION_TOOLS.PEN) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = item.width;
      drawPath(ctx, item.points, width, height);
    } else if (item.type === ANNOTATION_TOOLS.HIGHLIGHTER) {
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = item.width;
      drawPath(ctx, item.points, width, height);
    } else if (item.type === ANNOTATION_TOOLS.ARROW) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = item.width;
      drawArrow(ctx, item.start, item.end, width, height);
    } else if (item.type === ANNOTATION_TOOLS.CIRCLE) {
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = item.width;
      drawCircle(ctx, item.start, item.end, width, height);
    } else if (item.type === ANNOTATION_TOOLS.TEXT) {
      ctx.globalAlpha = 1;
      const point = denormalizePoint(item.start, width, height);
      ctx.font = `700 ${item.fontSize}px Inter, sans-serif`;
      ctx.fillText(item.text, point.x, point.y);
    }

    ctx.restore();
  });

  ctx.restore();
}

function drawPath(ctx, points, width, height) {
  if (!points?.length) return;
  ctx.beginPath();
  const first = denormalizePoint(points[0], width, height);
  ctx.moveTo(first.x, first.y);
  points.slice(1).forEach((point) => {
    const next = denormalizePoint(point, width, height);
    ctx.lineTo(next.x, next.y);
  });
  ctx.stroke();
}

function drawArrow(ctx, start, end, width, height) {
  const from = denormalizePoint(start, width, height);
  const to = denormalizePoint(end, width, height);
  const head = Math.max(10, ctx.lineWidth * 3);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle - Math.PI / 6), to.y - head * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - head * Math.cos(angle + Math.PI / 6), to.y - head * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawCircle(ctx, start, end, width, height) {
  const center = denormalizePoint(start, width, height);
  const edge = denormalizePoint(end, width, height);
  const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load the captured teeth image.'));
    image.src = typeof source === 'string' ? source : source.src;
  });
}

function drawMirroredVideo(ctx, video, width, height) {
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** Mouth-zone geometry aligned with live CSS `.mouth-guide` (center 50% / 53%). */
function mouthGuideMetrics(width, height) {
  const cx = width * 0.5;
  const cy = height * 0.53;
  const rx = Math.min(width * 0.22, width * 0.31);
  const ry = Math.min(height * 0.085, height * 0.14);
  return { cx, cy, rx, ry, x: cx - rx, y: cy - ry, w: rx * 2, h: ry * 2 };
}

/**
 * Full AR overlay for save/export — matches live CSS mouth-guide (gradient, glow, mode styles).
 */
export function drawArOverlay(ctx, width, height, { mode = 'Whitening', intensity = 72, compare = false } = {}) {
  const t = clamp(intensity / 100, 0, 1);
  const { cx, cy, rx, ry, x, y, w, h } = mouthGuideMetrics(width, height);
  const isBraces = mode === 'Braces';
  const isVeneers = mode === 'Veneers' || mode === 'Implant Preview';

  const borderR = isVeneers ? 167 : 56;
  const borderG = isVeneers ? 139 : 189;
  const borderB = isVeneers ? 250 : 248;
  const borderAlpha = (isVeneers ? 0.36 : 0.32) + t * (isVeneers ? 0.5 : 0.58);
  const glowAlpha = (isVeneers ? 0.36 : 0.32) + t * 0.46;

  ctx.save();

  ctx.shadowColor = `rgba(${borderR}, ${borderG}, ${borderB}, ${glowAlpha})`;
  ctx.shadowBlur = Math.max(14, width * 0.022);

  if (isBraces) {
    const radius = Math.min(22, ry * 0.45);
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.save();
    ctx.clip();
    const stripe = Math.max(8, Math.round(w / 24));
    for (let offset = x; offset < x + w; offset += stripe * 1.4) {
      ctx.fillStyle =
        Math.floor((offset - x) / stripe) % 2 === 0
          ? 'rgba(255,255,255,0.76)'
          : 'rgba(59,130,246,0.72)';
      ctx.fillRect(offset, y, stripe, h);
    }
    ctx.restore();
    ctx.strokeStyle = `rgba(${borderR}, ${borderG}, ${borderB}, ${borderAlpha})`;
    ctx.lineWidth = Math.max(2, Math.round(width * 0.0025));
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, radius);
    } else {
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
  } else {
    const fillGrad = ctx.createLinearGradient(x, y, x + w, y);
    fillGrad.addColorStop(0, `rgba(255, 255, 255, ${t * 0.18})`);
    fillGrad.addColorStop(1, `rgba(125, 211, 252, ${t * 0.26})`);

    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fillGrad;
    ctx.fill();

    ctx.strokeStyle = `rgba(${borderR}, ${borderG}, ${borderB}, ${borderAlpha})`;
    ctx.lineWidth = Math.max(2, Math.round(width * 0.0025));
    ctx.stroke();

    ctx.save();
    ctx.clip();
    ctx.fillStyle = `rgba(255, 255, 255, ${t * 0.12})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.88, ry * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = Math.max(2, Math.round(width * 0.0018));
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.38, cy);
  ctx.lineTo(cx + w * 0.38, cy);
  ctx.stroke();

  ctx.restore();

  if (compare) drawCompareSplitOverlay(ctx, width, height);
}

function drawCompareSplitOverlay(ctx, width, height) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.lineWidth = Math.max(2, Math.round(width * 0.002));
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, height);
  ctx.stroke();

  ctx.font = `700 ${Math.max(12, Math.round(width * 0.016))}px Inter, sans-serif`;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.fillRect(width * 0.22, 16, 56, 24);
  ctx.fillRect(width * 0.72, 16, 48, 24);
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Before', width * 0.24, 34);
  ctx.fillText('After', width * 0.74, 34);
}

function drawConsultationFooter(ctx, width, height, { patientName, mode, intensity, compare, annotated }) {
  const pad = Math.round(width * 0.025);
  const boxHeight = Math.round(height * 0.11);
  ctx.fillStyle = 'rgba(7, 17, 29, 0.62)';
  ctx.fillRect(pad, height - boxHeight - pad, Math.min(width * 0.68, 460), boxHeight);
  ctx.fillStyle = '#f7fbff';
  ctx.font = `700 ${Math.max(14, Math.round(width * 0.02))}px Inter, sans-serif`;
  ctx.fillText(
    annotated ? 'DentaLogic · Procedure Annotation' : 'DentaLogic · AR Teeth Capture',
    pad + 14,
    height - boxHeight - pad + 28,
  );
  ctx.font = `500 ${Math.max(12, Math.round(width * 0.015))}px Inter, sans-serif`;
  ctx.fillText(
    `${patientName} · ${mode} · ${intensity}% overlay${compare ? ' · before/after' : ''}`,
    pad + 14,
    height - pad - 16,
  );
}

function canvasToJpegBlob(canvas, quality = 0.92) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode the consultation photo.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality,
    );
  });
}

/** Freeze mirrored camera frame (no AR overlay). */
export async function captureArTeethFrame(video) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error('Camera frame is not ready yet. Wait a moment and try again.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not capture the teeth scan.');

  drawMirroredVideo(ctx, video, width, height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Raw frame + baked 2D AR overlay (treatment preview for the patient). */
export async function captureArPreviewFrame(video, { mode = 'Whitening', intensity = 72, compare = false } = {}) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error('Camera frame is not ready yet. Wait a moment and try again.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not capture the AR preview.');

  drawMirroredVideo(ctx, video, width, height);
  drawArOverlay(ctx, width, height, { mode, intensity, compare });
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Both captures from one video frame: raw (annotate) + AR preview (patient "after"). */
export async function captureTeethScanPair(video, meta) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error('Camera frame is not ready yet. Wait a moment and try again.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not capture the teeth scan.');

  drawMirroredVideo(ctx, video, width, height);
  const rawUrl = canvas.toDataURL('image/jpeg', 0.92);
  drawArOverlay(ctx, width, height, meta);
  const arUrl = canvas.toDataURL('image/jpeg', 0.92);

  return { rawUrl, arUrl };
}

function drawPaneLabel(ctx, text, paneX, paneWidth, height) {
  const pad = Math.max(12, Math.round(paneWidth * 0.02));
  ctx.font = `700 ${Math.max(12, Math.round(paneWidth * 0.028))}px Inter, sans-serif`;
  const metrics = ctx.measureText(text);
  const boxW = metrics.width + pad * 2;
  const boxH = Math.max(26, Math.round(height * 0.045));
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(paneX + pad, pad, boxW, boxH);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, paneX + pad * 2, pad + boxH * 0.72);
}

export async function captureAnnotatedConsultation(
  video,
  annotations,
  { patientName, mode, intensity, compare },
) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error('Camera frame is not ready yet. Wait a moment and try again.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create an image from the camera preview.');

  drawMirroredVideo(ctx, video, width, height);
  drawArOverlay(ctx, width, height, { mode, intensity, compare });
  renderAnnotations(ctx, annotations, width, height, { mirror: true });
  drawConsultationFooter(ctx, width, height, { patientName, mode, intensity, compare, annotated: true });

  return canvasToJpegBlob(canvas);
}

/** Side-by-side save: left = AR preview capture, right = raw teeth + dentist annotations. */
export async function captureConsultationComparison(
  arImageSource,
  rawImageSource,
  annotations,
  {
    patientName,
    mode = 'Whitening',
    intensity = 72,
    compare = false,
    includeFooter = true,
  },
) {
  const arImage = await loadImageElement(arImageSource);
  const rawImage = await loadImageElement(rawImageSource);
  const paneW = arImage.naturalWidth || arImage.width;
  const paneH = arImage.naturalHeight || arImage.height;

  const canvas = document.createElement('canvas');
  canvas.width = paneW * 2;
  canvas.height = paneH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create the consultation image.');

  ctx.drawImage(arImage, 0, 0, paneW, paneH);
  drawPaneLabel(ctx, 'AR preview', 0, paneW, paneH);

  ctx.drawImage(rawImage, paneW, 0, paneW, paneH);
  ctx.save();
  ctx.translate(paneW, 0);
  renderAnnotations(ctx, annotations, paneW, paneH, { mirror: false });
  ctx.restore();
  drawPaneLabel(ctx, 'Your teeth · notes', paneW, paneW, paneH);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = Math.max(2, Math.round(paneW * 0.002));
  ctx.beginPath();
  ctx.moveTo(paneW, 0);
  ctx.lineTo(paneW, paneH);
  ctx.stroke();

  if (includeFooter) {
    drawConsultationFooter(ctx, canvas.width, paneH, {
      patientName,
      mode,
      intensity,
      compare,
      annotated: true,
    });
  }

  return canvasToJpegBlob(canvas);
}

/** Raw frame + annotations only (single-pane export). */
export async function captureAnnotatedFromImage(
  imageSource,
  annotations,
  { patientName, mode = 'Whitening', intensity = 72, compare = false, includeFooter = true },
) {
  const image = await loadImageElement(imageSource);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create an annotated consultation image.');

  ctx.drawImage(image, 0, 0, width, height);
  renderAnnotations(ctx, annotations, width, height, { mirror: false });
  if (includeFooter) {
    drawConsultationFooter(ctx, width, height, { patientName, mode, intensity, compare, annotated: true });
  }

  return canvasToJpegBlob(canvas);
}
