import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Circle,
  Download,
  Eraser,
  Eye,
  EyeOff,
  Highlighter,
  Minus,
  Pencil,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Type,
  Undo2,
} from 'lucide-react';
import {
  ANNOTATION_COLORS,
  ANNOTATION_TOOLS,
  cloneAnnotations,
  createAnnotationId,
  normalizePoint,
  renderAnnotations,
} from './procedureAnnotation.js';

const TOOL_CONFIG = {
  [ANNOTATION_TOOLS.PEN]: { icon: Pencil, label: 'Pen', width: 3 },
  [ANNOTATION_TOOLS.HIGHLIGHTER]: { icon: Highlighter, label: 'Highlight', width: 16 },
  [ANNOTATION_TOOLS.ARROW]: { icon: ArrowUpRight, label: 'Arrow', width: 4 },
  [ANNOTATION_TOOLS.CIRCLE]: { icon: Circle, label: 'Circle', width: 4 },
  [ANNOTATION_TOOLS.TEXT]: { icon: Type, label: 'Label', width: 4 },
};

export default function ProcedureAnnotationLayer({
  active,
  enabled,
  frozenImageUrl,
  arPreviewImageUrl,
  mirrorPointers = true,
  compareBefore,
  sideBySide = true,
  showToolbar = true,
  onAnnotationsChange,
  onBeforeSnapshot,
  onSave,
  onExport,
  saving = false,
}) {
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const [tool, setTool] = useState(ANNOTATION_TOOLS.PEN);
  const [color, setColor] = useState(ANNOTATION_COLORS[0]);
  const [visible, setVisible] = useState(true);
  const [annotations, setAnnotations] = useState([]);
  const [beforeAnnotations, setBeforeAnnotations] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [draft, setDraft] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStartRef = useRef(null);

  const displayAnnotations = compareBefore ? beforeAnnotations : annotations;
  const allToRender = draft ? [...displayAnnotations, draft] : displayAnnotations;

  const commitAnnotations = useCallback(
    (next) => {
      setAnnotations(next);
      onAnnotationsChange?.(next);
    },
    [onAnnotationsChange],
  );

  const pushHistory = useCallback(() => {
    setUndoStack((stack) => [...stack, cloneAnnotations(annotations)]);
    setRedoStack([]);
  }, [annotations]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const rect = viewport.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (!visible) return;

    renderAnnotations(ctx, allToRender, rect.width, rect.height, { mirror: false });
  }, [allToRender, visible]);

  useEffect(() => {
    redraw();
  }, [redraw, zoom, pan, active, enabled, frozenImageUrl]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    const observer = new ResizeObserver(redraw);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [redraw]);

  function pointerToNorm(event) {
    const rect = viewportRef.current.getBoundingClientRect();
    const raw = normalizePoint(event.clientX, event.clientY, rect);
    const mapped = mirrorPointers ? { x: 1 - raw.x, y: raw.y } : raw;
    const x = (mapped.x * rect.width - pan.x) / zoom / rect.width;
    const y = (mapped.y * rect.height - pan.y) / zoom / rect.height;
    return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) };
  }

  function handlePointerDown(event) {
    if (!active || !enabled) return;
    if (event.button === 1 || event.button === 2) return;

    if (event.pointerType === 'touch' && event.altKey) {
      panStartRef.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
      return;
    }

    const point = pointerToNorm(event);
    const base = {
      id: createAnnotationId(),
      type: tool,
      color,
      width: TOOL_CONFIG[tool].width,
    };

    if (tool === ANNOTATION_TOOLS.PEN || tool === ANNOTATION_TOOLS.HIGHLIGHTER) {
      setDraft({ ...base, points: [point] });
    } else if (tool === ANNOTATION_TOOLS.TEXT) {
      const text = window.prompt('Add consultation note:', 'Alignment target');
      if (text?.trim()) {
        pushHistory();
        commitAnnotations([...annotations, { ...base, start: point, text: text.trim(), fontSize: 15 }]);
      }
    } else {
      setDraft({ ...base, start: point, end: point });
    }

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (panStartRef.current) {
      setPan({
        x: event.clientX - panStartRef.current.x,
        y: event.clientY - panStartRef.current.y,
      });
      return;
    }

    if (!draft) return;
    const point = pointerToNorm(event);

    if (draft.type === ANNOTATION_TOOLS.PEN || draft.type === ANNOTATION_TOOLS.HIGHLIGHTER) {
      setDraft((current) => ({ ...current, points: [...current.points, point] }));
    } else {
      setDraft((current) => ({ ...current, end: point }));
    }
  }

  function handlePointerUp() {
    panStartRef.current = null;
    if (!draft) return;

    pushHistory();
    commitAnnotations([...annotations, draft]);
    setDraft(null);
  }

  function undo() {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((stack) => stack.slice(0, -1));
    setRedoStack((stack) => [...stack, cloneAnnotations(annotations)]);
    commitAnnotations(previous);
  }

  function redo() {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((stack) => stack.slice(0, -1));
    setUndoStack((stack) => [...stack, cloneAnnotations(annotations)]);
    commitAnnotations(next);
  }

  function clearAll() {
    if (!annotations.length) return;
    pushHistory();
    commitAnnotations([]);
  }

  function snapshotBefore() {
    setBeforeAnnotations(cloneAnnotations(annotations));
    onBeforeSnapshot?.(annotations);
  }

  if (!enabled) return null;

  return (
    <div
      className={`annotation-layer ${active ? 'active' : ''} ${sideBySide ? 'side-by-side' : ''} ${frozenImageUrl ? 'frozen' : ''}`}
    >
      {sideBySide && arPreviewImageUrl && (
        <div className="annotation-compare-pane annotation-compare-pane--ar" aria-hidden="true">
          <img src={arPreviewImageUrl} alt="AR treatment preview" className="annotation-frozen-bg" />
          <span className="annotation-compare-label">AR preview</span>
        </div>
      )}

      <div
        ref={viewportRef}
        className={`annotation-viewport ${sideBySide ? 'annotation-viewport--after' : ''}`}
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {frozenImageUrl && !sideBySide && (
          <img src={frozenImageUrl} alt="Your teeth — draw consultation notes" className="annotation-frozen-bg" />
        )}
        {sideBySide && frozenImageUrl && (
          <img
            src={frozenImageUrl}
            alt="Your teeth"
            className="annotation-frozen-bg"
          />
        )}
        <canvas ref={canvasRef} className="annotation-canvas" />
        {sideBySide && <span className="annotation-compare-label annotation-compare-label--raw">Your teeth · annotate</span>}
        {!sideBySide && arPreviewImageUrl && (
          <div className="annotation-ar-pip">
            <img src={arPreviewImageUrl} alt="AR preview reference" />
            <span>AR preview</span>
          </div>
        )}
      </div>

      {showToolbar && (
        <div className="annotation-toolbar glass-panel">
          {Object.entries(TOOL_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                type="button"
                className={tool === key ? 'active' : ''}
                onClick={() => setTool(key)}
                title={config.label}
                aria-label={config.label}
              >
                <Icon size={16} />
              </button>
            );
          })}
          <span className="annotation-toolbar-divider" />
          {ANNOTATION_COLORS.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={`annotation-color ${color === swatch ? 'active' : ''}`}
              style={{ '--swatch': swatch }}
              onClick={() => setColor(swatch)}
              aria-label={`Color ${swatch}`}
            />
          ))}
          <span className="annotation-toolbar-divider" />
          <button type="button" onClick={undo} title="Undo" aria-label="Undo">
            <Undo2 size={16} />
          </button>
          <button type="button" onClick={redo} title="Redo" aria-label="Redo">
            <Redo2 size={16} />
          </button>
          <button type="button" onClick={clearAll} title="Clear annotations" aria-label="Clear">
            <Eraser size={16} />
          </button>
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            title={visible ? 'Hide annotations' : 'Show annotations'}
            aria-label="Toggle annotations"
          >
            {visible ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button type="button" onClick={() => setZoom((value) => clamp(value - 0.15, 1, 2.5))} title="Zoom out">
            <Minus size={16} />
          </button>
          <button type="button" onClick={() => setZoom((value) => clamp(value + 0.15, 1, 2.5))} title="Zoom in">
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            title="Reset view"
          >
            <RotateCcw size={16} />
          </button>
          <button type="button" className="annotation-snapshot-btn" onClick={snapshotBefore} title="Save before state">
            Before
          </button>
          {onExport && (
            <button type="button" className="annotation-snapshot-btn" onClick={onExport} title="Export annotated image">
              <Download size={14} />
            </button>
          )}
          {onSave && (
            <button
              type="button"
              className="annotation-save-btn"
              onClick={onSave}
              disabled={saving}
              title="Save consultation"
            >
              {saving ? <span className="button-loader" /> : <Save size={14} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
