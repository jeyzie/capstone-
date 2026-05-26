import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Camera,
  Check,
  ChevronLeft,
  Columns2,
  Heart,
  ScanFace,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  analyzePortraitImage,
  bracesPreviewGradient,
  BRACES_PALETTE,
  buildRecommendations,
  getColorFromRecommendations,
  loadFavorites,
  prepareMouthFocusedPhoto,
  simulateScanProgress,
  toggleFavorite,
} from './bracesColorMatcher.js';

const STEPS = {
  capture: 'capture',
  scanning: 'scanning',
  results: 'results',
};

export default function BracesColorMatcher({ onToast }) {
  const [step, setStep] = useState(STEPS.capture);
  const [photoUrl, setPhotoUrl] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanProgress, setScanProgress] = useState({ value: 0, label: 'Preparing AI scan…' });
  const [analysis, setAnalysis] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [selectedColorId, setSelectedColorId] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState([]);
  const [favorites, setFavorites] = useState(() => loadFavorites());

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const selectedColor =
    getColorFromRecommendations(recommendations, selectedColorId) ??
    recommendations?.bestMatch ??
    null;

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (recommendations?.bestMatch && !selectedColorId) {
      setSelectedColorId(recommendations.bestMatch.id);
    }
  }, [recommendations, selectedColorId]);

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraOn(false);
      setCameraError('Camera access was blocked. Allow permission or upload a selfie instead.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  async function captureSelfie() {
    const video = videoRef.current;
    if (!video || !cameraOn) {
      onToast?.('Start the camera before capturing a selfie.', 'warning');
      return;
    }

    const width = video.videoWidth || 720;
    const height = video.videoHeight || 960;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    try {
      const dataUrl = await prepareMouthFocusedPhoto(canvas);
      stopCamera();
      beginScan(dataUrl);
    } catch (error) {
      onToast?.(error?.message ?? 'Could not process the captured photo.', 'warning');
    }
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') return;
      try {
        const dataUrl = await prepareMouthFocusedPhoto(reader.result);
        beginScan(dataUrl);
      } catch (error) {
        onToast?.(error?.message ?? 'Could not process the uploaded photo.', 'warning');
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function beginScan(dataUrl) {
    setPhotoUrl(dataUrl);
    setStep(STEPS.scanning);
    setScanProgress({ value: 0, label: 'Preparing AI scan…' });

    try {
      await simulateScanProgress(setScanProgress);
      const result = await analyzePortraitImage(dataUrl);
      const recs = buildRecommendations(result);
      setAnalysis(result);
      setRecommendations(recs);
      setSelectedColorId(recs.bestMatch?.id ?? '');
      setCompareIds(recs.topMatches.slice(0, 3).map((item) => item.id));
      setStep(STEPS.results);
    } catch (error) {
      onToast?.(error?.message ?? 'Could not analyze the photo. Try another image.', 'warning');
      setStep(STEPS.capture);
    }
  }

  function resetFlow() {
    stopCamera();
    setStep(STEPS.capture);
    setPhotoUrl('');
    setAnalysis(null);
    setRecommendations(null);
    setSelectedColorId('');
    setCompareMode(false);
  }

  function handleFavorite(colorId) {
    const next = toggleFavorite(favorites, colorId);
    setFavorites(next);
    onToast?.(
      next.includes(colorId) ? 'Saved to favorite colors.' : 'Removed from favorites.',
      'success',
    );
  }

  function toggleCompareColor(colorId) {
    setCompareIds((current) => {
      if (current.includes(colorId)) return current.filter((id) => id !== colorId);
      if (current.length >= 3) {
        onToast?.('Compare up to 3 colors at a time.', 'warning');
        return current;
      }
      return [...current, colorId];
    });
  }

  const compareColors = (recommendations?.allColors ?? []).filter((item) => compareIds.includes(item.id));

  return (
    <div className="page-stack color-matcher-page">
      <div className="page-header matcher-page-header">
        <div>
          <span className="eyebrow">AI Braces</span>
          <h1>Color Matcher</h1>
          {step === STEPS.capture && (
            <p>Scan your smile for AI color picks and a live 2D braces preview.</p>
          )}
        </div>
        {step !== STEPS.capture && (
          <button className="secondary-button" type="button" onClick={resetFlow}>
            <ChevronLeft size={17} /> New scan
          </button>
        )}
      </div>

      {step === STEPS.capture && (
        <CaptureStep
          cameraOn={cameraOn}
          cameraError={cameraError}
          videoRef={videoRef}
          fileInputRef={fileInputRef}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onCapture={captureSelfie}
          onUpload={handleUpload}
        />
      )}

      {step === STEPS.scanning && (
        <ScanningStep photoUrl={photoUrl} progress={scanProgress} />
      )}

      {step === STEPS.results && recommendations && (
        <ResultsStep
          photoUrl={photoUrl}
          analysis={analysis}
          recommendations={recommendations}
          selectedColor={selectedColor}
          selectedColorId={selectedColorId}
          onSelectColor={setSelectedColorId}
          compareMode={compareMode}
          onToggleCompare={() => setCompareMode((value) => !value)}
          compareColors={compareColors}
          compareIds={compareIds}
          onToggleCompareColor={toggleCompareColor}
          favorites={favorites}
          onFavorite={handleFavorite}
        />
      )}
    </div>
  );
}

function CaptureStep({
  cameraOn,
  cameraError,
  videoRef,
  fileInputRef,
  onStartCamera,
  onStopCamera,
  onCapture,
  onUpload,
}) {
  return (
    <>
      <section className="ar-layout">
        <div className="camera-stage glass-panel mode-braces">
          <video
            ref={videoRef}
            className={cameraOn ? 'camera-video active' : 'camera-video'}
            playsInline
            muted
          />
          {!cameraOn && (
            <div className="face-frame">
              <ScanFace size={42} />
              <span>Mouth-focused capture</span>
              <small>Align your teeth inside the guide. We crop to your smile for preview.</small>
              {cameraError && <b className="camera-error">{cameraError}</b>}
            </div>
          )}
          {cameraOn && (
            <>
              <div className="mouth-guide">
                <span />
              </div>
              <div className="scan-line" />
              <div className="matcher-face-hint">Align teeth inside the guide</div>
            </>
          )}
        </div>

        <aside className="control-panel glass-panel">
          <div className="section-heading compact">
            <span>Camera / Upload</span>
            <small>Mobile-friendly capture</small>
          </div>
          <div className="matcher-action-stack">
            {!cameraOn ? (
              <button className="primary-button full" type="button" onClick={onStartCamera}>
                <Camera size={17} /> Start camera
              </button>
            ) : (
              <>
                <button className="primary-button full" type="button" onClick={onCapture}>
                  <ScanFace size={17} /> Capture &amp; analyze
                </button>
                <button className="secondary-button full" type="button" onClick={onStopCamera}>
                  Stop camera
                </button>
              </>
            )}
            <button className="secondary-button full" type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={17} /> Upload photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              hidden
              onChange={onUpload}
            />
          </div>
          <ul className="matcher-tip-list">
            <li>Use natural lighting when possible.</li>
            <li>Relax your lips so teeth are visible.</li>
            <li>AI works on-device from your photo pixels.</li>
          </ul>
        </aside>
      </section>
    </>
  );
}

function ScanningStep({ photoUrl, progress }) {
  return (
    <section className="ar-layout">
      <div className="camera-stage glass-panel mode-braces">
        <img src={photoUrl} alt="Analyzing mouth close-up" className="matcher-stage-photo" />
        <div className="matcher-scan-overlay">
          <div className="mouth-guide">
            <span />
          </div>
          <div className="scan-line" />
          <div className="matcher-scan-grid" aria-hidden="true" />
        </div>
      </div>
      <aside className="control-panel glass-panel matcher-scan-status">
        <div className="matcher-ai-badge">
          <Sparkles size={16} /> AI analyzing
        </div>
        <h2>Scanning your smile</h2>
        <p>{progress.label}</p>
        <div className="matcher-progress-track">
          <span className="matcher-progress-fill" style={{ width: `${progress.value}%` }} />
        </div>
        <small>{progress.value}% complete</small>
      </aside>
    </section>
  );
}

function ResultsStep({
  photoUrl,
  analysis,
  recommendations,
  selectedColor,
  selectedColorId,
  onSelectColor,
  compareMode,
  onToggleCompare,
  compareColors,
  compareIds,
  onToggleCompareColor,
  favorites,
  onFavorite,
}) {
  return (
    <section className="ar-layout">
      <div className="camera-stage glass-panel mode-braces">
        <img src={photoUrl} alt="Braces color preview on mouth" className="matcher-stage-photo" />
        {selectedColor && (
          <div
            className="mouth-guide"
            style={{ background: bracesPreviewGradient(selectedColor.hex) }}
          >
            <span />
          </div>
        )}
        {selectedColor && (
          <div
            className={`matcher-preview-badge ${selectedColor.isAvoid ? 'matcher-preview-badge--avoid' : ''}`}
          >
            {selectedColor.isAvoid ? <AlertTriangle size={14} /> : <Sparkles size={14} />}
            {selectedColor.name}
            {selectedColor.isAvoid
              ? ' · Not recommended'
              : selectedColor.confidence
                ? ` · ${selectedColor.confidence}%`
                : ''}
          </div>
        )}
        {compareMode && compareColors.length > 0 && (
          <div className="matcher-compare-dock">
            {compareColors.map((color) => (
              <button
                key={color.id}
                type="button"
                className={`matcher-compare-dot ${selectedColorId === color.id ? 'active' : ''}`}
                style={{ background: color.hex }}
                onClick={() => onSelectColor(color.id)}
                title={`${color.name} (${color.confidence}%)`}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="control-panel glass-panel matcher-color-panel">
        <div className="matcher-color-panel-head">
          <div className="section-heading compact">
            <span>AI profile</span>
            <small>{recommendations.skinToneLabel} · {recommendations.teethShade}</small>
          </div>
        </div>

        <div className="matcher-color-panel-scroll">
          {recommendations.bestMatch && (
            <article className="matcher-best-match compact">
              <span className="matcher-best-label">
                <Sparkles size={14} /> Best match — {recommendations.bestMatch.name}
              </span>
              <p>
                {recommendations.bestMatch.reason} · {recommendations.bestMatch.confidence}% match
              </p>
            </article>
          )}

          <div className="matcher-panel-toolbar">
            <label className="matcher-strip-label">Recommended</label>
            <button
              className={`icon-button ${compareMode ? 'active' : ''}`}
              type="button"
              onClick={onToggleCompare}
              aria-label="Toggle compare mode"
              title="Compare colors"
            >
              <Columns2 size={18} />
            </button>
          </div>
          <RecommendedColorList
            colors={recommendations.topMatches}
            selectedColorId={selectedColorId}
            onSelect={onSelectColor}
            favorites={favorites}
            onFavorite={onFavorite}
            compareMode={compareMode}
            compareIds={compareIds}
            onToggleCompare={onToggleCompareColor}
          />

          {recommendations.avoid?.length > 0 && (
            <NotRecommendedSection
              colors={recommendations.avoid}
              selectedColorId={selectedColorId}
              onSelect={onSelectColor}
            />
          )}

          <label className="matcher-strip-label">Choose any color (16)</label>
          <ColorSwatchStrip
            colors={recommendations.pickerColors}
            selectedColorId={selectedColorId}
            onSelect={onSelectColor}
            favorites={favorites}
            onFavorite={onFavorite}
            compareMode={compareMode}
            compareIds={compareIds}
            onToggleCompare={onToggleCompareColor}
            pickerGrid
          />
          {favorites.length > 0 && (
            <>
              <label className="matcher-strip-label">Favorites</label>
              <div className="matcher-favorite-swatches">
                {favorites.map((id) => {
                  const color = BRACES_PALETTE.find((item) => item.id === id);
                  if (!color) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`matcher-favorite-chip ${selectedColorId === id ? 'active' : ''}`}
                      onClick={() => onSelectColor(id)}
                    >
                      <i style={{ background: color.hex }} />
                      {color.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </aside>
    </section>
  );
}

function NotRecommendedSection({ colors, selectedColorId, onSelect }) {
  return (
    <section className="matcher-avoid" aria-label="Not recommended brace colors">
      <label className="matcher-strip-label">Not recommended</label>
      <p>These shades can make teeth look less white — use for preview only if the patient still wants them.</p>
      <div className="matcher-avoid-swatches">
        {colors.map((color) => (
          <button
            key={color.id}
            type="button"
            className={`matcher-avoid-chip ${selectedColorId === color.id ? 'active' : ''}`}
            onClick={() => onSelect(color.id)}
            title={color.reason}
          >
            <i style={{ background: color.hex }} aria-hidden="true" />
            {color.name}
          </button>
        ))}
      </div>
      {selectedColorId && colors.some((c) => c.id === selectedColorId) && (
        <p className="matcher-avoid-selected-reason">
          {colors.find((c) => c.id === selectedColorId)?.reason}
        </p>
      )}
    </section>
  );
}

function RecommendedColorList({
  colors,
  selectedColorId,
  onSelect,
  favorites,
  onFavorite,
  compareMode,
  compareIds,
  onToggleCompare,
}) {
  return (
    <ul className="matcher-recommended-list">
      {colors.map((color) => (
        <li key={color.id}>
          <div className={`matcher-recommended-item ${selectedColorId === color.id ? 'active' : ''}`}>
            <button
              type="button"
              className="matcher-recommended-main"
              onClick={() => onSelect(color.id)}
            >
              <span className="matcher-recommended-swatch" style={{ background: color.hex }} aria-hidden="true" />
              <span className="matcher-recommended-name">{color.name}</span>
              <span className="matcher-recommended-percent">{color.confidence}%</span>
            </button>
            <div className="matcher-recommended-actions">
              <button
                type="button"
                className={`icon-button ${favorites.includes(color.id) ? 'active' : ''}`}
                onClick={() => onFavorite(color.id)}
                aria-label={favorites.includes(color.id) ? 'Remove favorite' : 'Save favorite'}
              >
                <Heart size={14} fill={favorites.includes(color.id) ? 'currentColor' : 'none'} />
              </button>
              {compareMode && (
                <button
                  type="button"
                  className={`icon-button ${compareIds.includes(color.id) ? 'active' : ''}`}
                  onClick={() => onToggleCompare(color.id)}
                  aria-label="Add to compare"
                >
                  {compareIds.includes(color.id) ? <Check size={14} /> : <Bookmark size={14} />}
                </button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ColorSwatchStrip({
  colors,
  selectedColorId,
  onSelect,
  favorites,
  onFavorite,
  compareMode,
  compareIds,
  onToggleCompare,
  showPercent = false,
  pickerGrid = false,
}) {
  return (
    <div
      className={`matcher-color-strip ${showPercent ? 'with-percent' : ''} ${pickerGrid ? 'picker-grid' : ''}`}
    >
      {colors.map((color) => (
        <div key={color.id} className="matcher-swatch-wrap">
          <button
            type="button"
            className={`matcher-swatch-btn ${selectedColorId === color.id ? 'active' : ''} ${color.isAvoid ? 'caution' : ''}`}
            style={{ '--swatch-color': color.hex }}
            onClick={() => onSelect(color.id)}
            title={`${color.name}${color.confidence != null ? ` · ${color.confidence}%` : ''}`}
            aria-label={`${color.name}${color.confidence != null ? `, ${color.confidence}% match` : ''}`}
            aria-pressed={selectedColorId === color.id}
          />
          {showPercent && color.confidence != null && (
            <span className="matcher-swatch-percent">{color.confidence}%</span>
          )}
          {pickerGrid && (
            <span className="matcher-swatch-name">{color.name}</span>
          )}
          <button
            type="button"
            className={`matcher-swatch-heart ${favorites.includes(color.id) ? 'active' : ''}`}
            onClick={() => onFavorite(color.id)}
            aria-label={favorites.includes(color.id) ? 'Remove favorite' : 'Save favorite'}
          >
            <Heart size={12} fill={favorites.includes(color.id) ? 'currentColor' : 'none'} />
          </button>
          {compareMode && (
            <button
              type="button"
              className={`matcher-swatch-compare ${compareIds.includes(color.id) ? 'active' : ''}`}
              onClick={() => onToggleCompare(color.id)}
              aria-label="Add to compare"
            >
              {compareIds.includes(color.id) ? <Check size={11} /> : <Bookmark size={11} />}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
