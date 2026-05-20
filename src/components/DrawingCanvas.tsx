import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Undo2, Trash2, Minus, Plus, Save, Loader2, Highlighter } from 'lucide-react';

type ToolType = 'pen' | 'highlighter' | 'eraser';

interface Stroke {
  points: { x: number; y: number; pressure: number }[];
  color: string;
  width: number;
  tool: ToolType;
}

interface DrawingCanvasProps {
  imageUrl: string;
  annotations?: string; // JSON string of strokes
  onSave?: (annotations: string) => Promise<void>;
  readOnly?: boolean;
}

const PEN_COLORS = ['#000000', '#FF0000', '#0066FF', '#00AA00', '#FF6600', '#9900FF'];
const HIGHLIGHTER_COLORS = ['#FFFF00', '#00FF00', '#FF69B4', '#00FFFF', '#FFA500'];
const MIN_WIDTH = 2;
const MAX_WIDTH = 20;
const HIGHLIGHTER_OPACITY = 0.4;

// 태블릿(iPad, Galaxy Tab) 감지
const isTablet = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // iPad 감지 (iOS 13+ Safari는 Mac으로 보고하므로 maxTouchPoints 확인)
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  // Galaxy Tab 감지
  const isGalaxyTab = /SM-T/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua));
  return isIPad || isGalaxyTab;
};

export default function DrawingCanvas({
  imageUrl,
  annotations,
  onSave,
  readOnly = false,
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<ToolType>('pen');
  const [penColor, setPenColor] = useState('#FF0000');
  const [highlighterColor, setHighlighterColor] = useState('#FFFF00');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [highlighterWidth, setHighlighterWidth] = useState(16);

  const currentColor = tool === 'pen' ? penColor : tool === 'highlighter' ? highlighterColor : '#000000';
  const currentWidth = tool === 'highlighter' ? highlighterWidth : strokeWidth;
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [savedStrokes, setSavedStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [saving, setSaving] = useState(false);

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(strokes) !== JSON.stringify(savedStrokes);

  // Load existing annotations
  useEffect(() => {
    if (annotations) {
      try {
        const parsed = JSON.parse(annotations);
        setStrokes(parsed);
        setSavedStrokes(parsed);
      } catch {
        setStrokes([]);
        setSavedStrokes([]);
      }
    } else {
      setStrokes([]);
      setSavedStrokes([]);
    }
  }, [annotations]);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImage(img);
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.error('Failed to load image:', imageUrl);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Set up canvas dimensions
  useEffect(() => {
    if (!containerRef.current || !image) return;

    const containerWidth = containerRef.current.clientWidth;
    const scale = containerWidth / image.width;
    const width = containerWidth;
    const height = image.height * scale;

    setDimensions({ width, height });
  }, [image, containerRef.current?.clientWidth]);

  // Set up canvas context
  useEffect(() => {
    if (!canvasRef.current) return;
    const context = canvasRef.current.getContext('2d');
    if (context) {
      context.lineCap = 'round';
      context.lineJoin = 'round';
      setCtx(context);
    }
  }, [dimensions]);

  // Redraw canvas
  const redraw = useCallback(() => {
    if (!ctx || !canvasRef.current || !image) return;

    const { width, height } = dimensions;
    if (width === 0 || height === 0) return;

    // Clear and draw image
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    // Draw all strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;

      ctx.beginPath();

      if (stroke.tool === 'eraser') {
        ctx.strokeStyle = '#FFFFFF';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-out';
      } else if (stroke.tool === 'highlighter') {
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = HIGHLIGHTER_OPACITY;
        ctx.globalCompositeOperation = 'multiply';
      } else {
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.lineWidth = stroke.width;

      const [first, ...rest] = stroke.points;
      ctx.moveTo(first.x * dimensions.width, first.y * dimensions.height);

      for (const point of rest) {
        ctx.lineTo(point.x * dimensions.width, point.y * dimensions.height);
      }

      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }, [ctx, image, dimensions, strokes, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Get point from event
  const getPoint = (e: React.PointerEvent) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / dimensions.width,
      y: (e.clientY - rect.top) / dimensions.height,
      pressure: e.pressure || 0.5,
    };
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;

    // 태블릿에서는 펜(스타일러스)으로만 그리기 허용
    if (isTablet() && e.pointerType !== 'pen') {
      return; // 손가락 터치는 스크롤/확대용으로 무시
    }

    e.preventDefault();

    const point = getPoint(e);
    if (!point) return;

    setIsDrawing(true);
    setCurrentStroke({
      points: [point],
      color: currentColor,
      width: currentWidth,
      tool,
    });

    // Capture pointer for smooth drawing
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || readOnly || !currentStroke) return;

    // 태블릿에서는 펜으로만 그리기
    if (isTablet() && e.pointerType !== 'pen') return;

    e.preventDefault();

    const point = getPoint(e);
    if (!point) return;

    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, point],
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing || !currentStroke) return;
    e.preventDefault();

    // Only save strokes with multiple points
    if (currentStroke.points.length >= 2) {
      setStrokes(prev => [...prev, currentStroke]);
    }

    setCurrentStroke(null);
    setIsDrawing(false);
  };

  // Save to database
  const handleSave = async () => {
    if (!onSave || !hasChanges) return;

    setSaving(true);
    try {
      await onSave(JSON.stringify(strokes));
      setSavedStrokes(strokes);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  // Undo last stroke
  const handleUndo = () => {
    if (strokes.length === 0) return;
    setStrokes(prev => prev.slice(0, -1));
  };

  // Clear all
  const handleClear = () => {
    if (strokes.length === 0) return;
    if (!confirm('모든 그림을 지우시겠습니까?')) return;
    setStrokes([]);
  };

  if (!imageLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-gray-400">악보 로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      {!readOnly && (
        <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg flex-wrap">
          {/* Tool selection */}
          <div className="flex bg-white rounded-lg p-0.5 shadow-sm">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded-md transition-colors ${
                tool === 'pen' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="펜"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool('highlighter')}
              className={`p-2 rounded-md transition-colors ${
                tool === 'highlighter' ? 'bg-yellow-100 text-yellow-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="형광펜"
            >
              <Highlighter className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-md transition-colors ${
                tool === 'eraser' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="지우개"
            >
              <Eraser className="w-5 h-5" />
            </button>
          </div>

          {/* Pen color selection */}
          {tool === 'pen' && (
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    penColor === c ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Highlighter color selection */}
          {tool === 'highlighter' && (
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
              {HIGHLIGHTER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setHighlighterColor(c)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    highlighterColor === c ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c, opacity: 0.7 }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Stroke width */}
          {tool !== 'eraser' && (
            <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 shadow-sm">
              <button
                onClick={() => {
                  if (tool === 'highlighter') {
                    setHighlighterWidth(Math.max(8, highlighterWidth - 4));
                  } else {
                    setStrokeWidth(Math.max(MIN_WIDTH, strokeWidth - 2));
                  }
                }}
                className="p-1 text-gray-600 hover:text-gray-900"
                disabled={tool === 'highlighter' ? highlighterWidth <= 8 : strokeWidth <= MIN_WIDTH}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div
                className="w-6 h-6 flex items-center justify-center"
                title={`굵기: ${currentWidth}`}
              >
                <div
                  className="rounded-full"
                  style={{
                    width: Math.min(currentWidth, 16),
                    height: Math.min(currentWidth, 16),
                    backgroundColor: currentColor,
                    opacity: tool === 'highlighter' ? 0.5 : 1
                  }}
                />
              </div>
              <button
                onClick={() => {
                  if (tool === 'highlighter') {
                    setHighlighterWidth(Math.min(32, highlighterWidth + 4));
                  } else {
                    setStrokeWidth(Math.min(MAX_WIDTH, strokeWidth + 2));
                  }
                }}
                className="p-1 text-gray-600 hover:text-gray-900"
                disabled={tool === 'highlighter' ? highlighterWidth >= 32 : strokeWidth >= MAX_WIDTH}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
              title="실행 취소"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleClear}
              disabled={strokes.length === 0}
              className="p-2 text-gray-600 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="전체 지우기"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              hasChanges
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            title="저장"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            저장
          </button>
        </div>
      )}

      {/* Unsaved changes indicator */}
      {!readOnly && hasChanges && (
        <div className="text-xs text-amber-600 text-center">
          저장되지 않은 변경사항이 있습니다
        </div>
      )}

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative bg-white border border-gray-200 rounded-lg overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="touch-none"
          style={{
            width: dimensions.width,
            height: dimensions.height,
            cursor: readOnly ? 'default' : (tool === 'pen' ? 'crosshair' : 'cell')
          }}
        />
      </div>
    </div>
  );
}
