/**
 * src/components/ui/ImageCropModal.jsx
 * Interactive HTML5 Canvas Image Cropper & Aspect-Ratio Selector Modal
 * 
 * Features:
 * - Local image file upload with immediate FileReader preview
 * - Aspect ratio presets: 1:1 (Avatar / Album Art), 3:1 (Hero Banner), 16:9 (Widescreen), Free
 * - Interactive canvas: Smooth pan & drag, zoom slider (1x - 3x), mouse wheel zoom
 * - Circular / square guide overlay for avatars and rounded artwork
 * - High-quality canvas crop export to base64 DataURL (image/webp or image/jpeg fallback)
 * - Accessible Framer Motion dialog with ESC key dismiss & backdrop click
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crop,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Check,
  X,
  Upload,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';

const ASPECT_RATIO_PRESETS = [
  { id: '1:1', label: '1:1 (Square)', ratio: 1, desc: 'Avatar / Music Cover' },
  { id: '3:1', label: '3:1 (Banner)', ratio: 3, desc: 'Hero Header Banner' },
  { id: '16:9', label: '16:9 (Wide)', ratio: 16 / 9, desc: 'Landscape / Cards' },
  { id: '4:3', label: '4:3 (Photo)', ratio: 4 / 3, desc: 'Standard Photo' },
  { id: 'free', label: 'Freeform', ratio: null, desc: 'Custom Shape' },
];

export default function ImageCropModal({
  isOpen,
  onClose,
  onCropComplete,
  initialImageSrc = null,
  title = 'Crop & Adjust Image',
  defaultAspect = '1:1',
  circularGuide = false,
}) {
  const [imageSrc, setImageSrc] = useState(initialImageSrc);
  const [aspectId, setAspectId] = useState(defaultAspect);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const imgElementRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync initial image src and reset parameters when modal opens
  useEffect(() => {
    if (isOpen) {
      setImageSrc(initialImageSrc || null);
      setAspectId(defaultAspect);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialImageSrc, defaultAspect]);

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP, GIF).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageSrc(event.target.result);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Keyboard shortcut: ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load image object whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgElementRef.current = img;
      drawCanvas();
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Redraw canvas whenever pan, zoom, rotation, or aspect ratio changes
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgElementRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Dark checkerboard / background pattern
    ctx.fillStyle = '#11141d';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    // Center transformations
    ctx.translate(width / 2 + pan.x, height / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate scale to fit image inside canvas initially
    const scale = Math.min((width * 0.85) / img.width, (height * 0.85) / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    // Draw crop guidelines overlay
    drawGuideOverlay(ctx, width, height);
  }, [pan, zoom, rotation, aspectId, circularGuide]);

  // Draw crop framing guide overlay
  const drawGuideOverlay = (ctx, width, height) => {
    const selectedPreset = ASPECT_RATIO_PRESETS.find((p) => p.id === aspectId);
    let targetRatio = selectedPreset?.ratio;

    let boxW, boxH;
    const maxBoxSize = Math.min(width, height) * 0.82;

    if (!targetRatio) {
      // Freeform: square box
      boxW = maxBoxSize;
      boxH = maxBoxSize;
    } else if (targetRatio >= 1) {
      boxW = maxBoxSize;
      boxH = maxBoxSize / targetRatio;
      if (boxH > height * 0.85) {
        boxH = height * 0.85;
        boxW = boxH * targetRatio;
      }
    } else {
      boxH = maxBoxSize;
      boxW = maxBoxSize * targetRatio;
    }

    const boxX = (width - boxW) / 2;
    const boxY = (height - boxH) / 2;

    // Dark semi-transparent scrim outside crop box
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';

    // Path with hole
    ctx.beginPath();
    ctx.rect(0, 0, width, height);

    if (circularGuide && aspectId === '1:1') {
      const radius = boxW / 2;
      ctx.arc(boxX + radius, boxY + radius, radius, 0, Math.PI * 2, true);
    } else {
      ctx.rect(boxX + boxW, boxY, -boxW, boxH);
    }
    ctx.fill();

    // Guideline border
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    if (circularGuide && aspectId === '1:1') {
      const radius = boxW / 2;
      ctx.beginPath();
      ctx.arc(boxX + radius, boxY + radius, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeRect(boxX, boxY, boxW, boxH);
    }

    // Rule of thirds lines (subtle)
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    // Vertical grid
    ctx.moveTo(boxX + boxW / 3, boxY);
    ctx.lineTo(boxX + boxW / 3, boxY + boxH);
    ctx.moveTo(boxX + (boxW * 2) / 3, boxY);
    ctx.lineTo(boxX + (boxW * 2) / 3, boxY + boxH);
    // Horizontal grid
    ctx.moveTo(boxX, boxY + boxH / 3);
    ctx.lineTo(boxX + boxW, boxY + boxH / 3);
    ctx.moveTo(boxX, boxY + (boxH * 2) / 3);
    ctx.lineTo(boxX + boxW, boxY + (boxH * 2) / 3);
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Pointer / Drag Event Handlers for Panning
  const handlePointerDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Mouse Wheel Zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomStep = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.min(Math.max(0.5, prev + zoomStep), 3.5));
  };

  // Perform Final Crop & Export to DataURL
  const handleConfirmCrop = () => {
    const canvas = canvasRef.current;
    const img = imgElementRef.current;
    if (!canvas || !img) {
      onClose();
      return;
    }

    const width = canvas.width;
    const height = canvas.height;

    const selectedPreset = ASPECT_RATIO_PRESETS.find((p) => p.id === aspectId);
    let targetRatio = selectedPreset?.ratio;

    let boxW, boxH;
    const maxBoxSize = Math.min(width, height) * 0.82;

    if (!targetRatio) {
      boxW = maxBoxSize;
      boxH = maxBoxSize;
    } else if (targetRatio >= 1) {
      boxW = maxBoxSize;
      boxH = maxBoxSize / targetRatio;
      if (boxH > height * 0.85) {
        boxH = height * 0.85;
        boxW = boxH * targetRatio;
      }
    } else {
      boxH = maxBoxSize;
      boxW = maxBoxSize * targetRatio;
    }

    const boxX = (width - boxW) / 2;
    const boxY = (height - boxH) / 2;

    // Create export offscreen canvas with sharp output resolution
    const exportCanvas = document.createElement('canvas');
    const outputWidth = Math.round(boxW * 2); // 2x for sharp retina output
    const outputHeight = Math.round(boxH * 2);
    exportCanvas.width = outputWidth;
    exportCanvas.height = outputHeight;

    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return;

    // Scale to match box coordinates
    expCtx.translate(outputWidth / 2, outputHeight / 2);
    expCtx.translate(pan.x * (outputWidth / boxW), pan.y * (outputHeight / boxH));
    expCtx.rotate((rotation * Math.PI) / 180);
    expCtx.scale(zoom, zoom);

    const scale = Math.min((width * 0.85) / img.width, (height * 0.85) / img.height);
    const factor = outputWidth / boxW;
    const drawW = img.width * scale * factor;
    const drawH = img.height * scale * factor;

    expCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);

    // Export as high quality webp or jpeg
    try {
      const dataUrl = exportCanvas.toDataURL('image/webp', 0.92);
      onCropComplete(dataUrl);
      onClose();
    } catch {
      const fallbackUrl = exportCanvas.toDataURL('image/jpeg', 0.9);
      onCropComplete(fallbackUrl);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="crop-modal-portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[70] overflow-y-auto flex items-center justify-center p-3 sm:p-4 pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div
            key="crop-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md pointer-events-auto"
            aria-hidden="true"
          />

          {/* Modal Panel */}
          <motion.div
            key="crop-panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative z-10 w-full max-w-xl bg-theme-surface/95 backdrop-blur-2xl border border-theme-primary/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs text-theme-main max-h-[92vh] pointer-events-auto"
          >
            {/* Header */}
            <header className="p-4 sm:p-5 border-b border-theme-glow/20 flex items-center justify-between shrink-0 bg-black/30">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-theme-primary/10 text-theme-primary border border-theme-primary/30 shadow-glow">
                  <Crop className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-white">{title}</h3>
                  <p className="text-[10px] text-theme-sub">Pan, zoom & select aspect ratio</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-theme-surface border border-theme-glow/30 hover:border-theme-primary text-theme-sub hover:text-white transition-all text-[11px]"
                  title="Choose a different image file"
                >
                  <Upload className="w-3.5 h-3.5 text-theme-primary" />
                  <span>Choose File</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-theme-sub hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </header>

            {/* Canvas Body */}
            <div className="relative flex-1 bg-black/70 flex items-center justify-center p-2 min-h-[260px] sm:min-h-[340px] select-none overflow-hidden">
              {imageSrc ? (
                <div
                  className="relative cursor-move touch-none"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onWheel={handleWheel}
                >
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={380}
                    className="max-w-full max-h-[50vh] object-contain rounded-xl shadow-inner border border-theme-glow/20"
                  />
                  <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/60 text-[10px] text-theme-sub pointer-events-none backdrop-blur-sm border border-white/10">
                    Scroll to zoom • Drag to pan
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-theme-sub">
                  <div className="p-4 rounded-2xl bg-white/5 border border-theme-glow/20 text-theme-primary">
                    <ImageIcon className="w-10 h-10 opacity-70" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">No image loaded</p>
                    <p className="text-[11px] text-theme-sub mt-1">
                      Upload an image from your computer to crop and customize.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-primary text-black font-bold shadow-glow hover:scale-105 active:scale-95 transition-all text-xs"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Select Image File</span>
                  </button>
                </div>
              )}
            </div>

            {/* Controls Bar */}
            {imageSrc && (
              <div className="p-3 sm:p-4 bg-black/40 border-t border-theme-glow/20 space-y-3 shrink-0">
                {/* Aspect Ratio Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  <span className="text-[10px] font-bold text-theme-sub mr-1 uppercase">Ratio:</span>
                  {ASPECT_RATIO_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAspectId(preset.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-mono transition-all shrink-0 ${
                        aspectId === preset.id
                          ? 'bg-theme-primary text-black font-bold shadow-glow'
                          : 'bg-theme-surface/70 text-theme-sub hover:text-white border border-theme-glow/20'
                      }`}
                      title={preset.desc}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Zoom & Rotation Controls */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  {/* Zoom Slider */}
                  <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                    <ZoomOut
                      className="w-3.5 h-3.5 text-theme-sub cursor-pointer hover:text-white"
                      onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
                    />
                    <input
                      type="range"
                      min="0.5"
                      max="3.5"
                      step="0.05"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-theme-primary"
                    />
                    <ZoomIn
                      className="w-3.5 h-3.5 text-theme-sub cursor-pointer hover:text-white"
                      onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
                    />
                    <span className="text-[10px] text-theme-sub w-10 text-right">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>

                  {/* Rotate & Reset Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-theme-surface border border-theme-glow/20 hover:border-theme-primary text-theme-sub hover:text-white transition-all text-[11px]"
                      title="Rotate 90 degrees clockwise"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Rotate</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setZoom(1);
                        setPan({ x: 0, y: 0 });
                        setRotation(0);
                      }}
                      className="p-1.5 rounded-xl bg-theme-surface border border-theme-glow/20 hover:border-theme-primary text-theme-sub hover:text-white transition-all"
                      title="Reset Position"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <footer className="p-3 sm:p-4 border-t border-theme-glow/20 bg-black/50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-theme-sub hover:text-white hover:bg-white/5 border border-theme-glow/20 transition-all text-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmCrop}
                disabled={!imageSrc}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-theme-primary to-theme-accent text-black font-bold shadow-glow hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply & Save Crop</span>
              </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
