import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Undo2, Trash2, Minus, Plus, Save, Loader2, Highlighter, Tag } from 'lucide-react';

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'badge';
type EraserMode = 'partial' | 'stroke';

interface Stroke {
  points: { x: number; y: number; pressure: number }[];
  color: string;
  width: number;
  tool: ToolType;
}

interface Badge {
  id: string;
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  label: string;
  color: string;
}

interface DrawingCanvasProps {
  imageUrl: string;
  annotations?: string; // JSON string of strokes
  onSave?: (annotations: string) => Promise<void>;
  readOnly?: boolean;
}

const PEN_COLORS = [
  '#515C5D', // 차콜 그레이
  '#F4A9A9', // 코랄 핑크
  '#A8D5BA', // 세이지 그린
  '#9DB4C0', // 더스티 블루
  '#E8B4B8', // 로즈
  '#B8A9C9', // 라벤더
  '#F5D6BA', // 피치
  '#7C9885', // 모스 그린
];
const HIGHLIGHTER_COLORS = [
  '#FEF08A', // 레몬
  '#BBF7D0', // 민트
  '#FBCFE8', // 핑크
  '#A5F3FC', // 스카이
  '#FED7AA', // 피치
];
const MIN_WIDTH = 2;
const MAX_WIDTH = 20;
const HIGHLIGHTER_OPACITY = 0.4;

// 뱃지 라벨
const BADGE_LABELS = ['A', 'B', 'C', "A'", "B'", "C'", 'Intro', 'Verse', 'Chorus', 'Bridge', 'Outro'];

// 뱃지 파스텔 색상 (50% 투명도 적용됨)
const BADGE_COLORS = [
  '#FFB3BA', // 파스텔 핑크
  '#BAFFC9', // 파스텔 그린
  '#BAE1FF', // 파스텔 블루
  '#FFFFBA', // 파스텔 옐로우
  '#FFDFba', // 파스텔 오렌지
  '#E0BBE4', // 파스텔 퍼플
];

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
  const [penColor, setPenColor] = useState('#F4A9A9');
  const [highlighterColor, setHighlighterColor] = useState('#FEF08A');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [highlighterWidth, setHighlighterWidth] = useState(16);
  const [eraserMode, setEraserMode] = useState<EraserMode>('partial');
  const [eraserWidth, setEraserWidth] = useState(20);

  const currentColor = tool === 'pen' ? penColor : tool === 'highlighter' ? highlighterColor : '#000000';
  const currentWidth = tool === 'eraser' ? eraserWidth : tool === 'highlighter' ? highlighterWidth : strokeWidth;
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [savedStrokes, setSavedStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [saving, setSaving] = useState(false);

  // Badge state
  const [badges, setBadges] = useState<Badge[]>([]);
  const [savedBadges, setSavedBadges] = useState<Badge[]>([]);
  const [selectedBadgeLabel, setSelectedBadgeLabel] = useState('A');
  const [selectedBadgeColor, setSelectedBadgeColor] = useState(BADGE_COLORS[0]);
  const [, setDraggingBadge] = useState<string | null>(null);

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 멀티터치 감지용 (확대 시 그리기 취소)
  const activePointers = useRef<Set<number>>(new Set());

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(strokes) !== JSON.stringify(savedStrokes) ||
                     JSON.stringify(badges) !== JSON.stringify(savedBadges);

  // Load existing annotations
  useEffect(() => {
    if (annotations) {
      try {
        const parsed = JSON.parse(annotations);
        // 이전 형식(배열) 또는 새 형식(객체) 지원
        if (Array.isArray(parsed)) {
          setStrokes(parsed);
          setSavedStrokes(parsed);
          setBadges([]);
          setSavedBadges([]);
        } else {
          setStrokes(parsed.strokes || []);
          setSavedStrokes(parsed.strokes || []);
          setBadges(parsed.badges || []);
          setSavedBadges(parsed.badges || []);
        }
      } catch {
        setStrokes([]);
        setSavedStrokes([]);
        setBadges([]);
        setSavedBadges([]);
      }
    } else {
      setStrokes([]);
      setSavedStrokes([]);
      setBadges([]);
      setSavedBadges([]);
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

  // Redraw canvas (drawings only, not the image)
  const redraw = useCallback(() => {
    if (!ctx || !canvasRef.current) return;

    const { width, height } = dimensions;
    if (width === 0 || height === 0) return;

    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, width, height);

    // Draw all strokes
    const allStrokes = currentStroke ? [...strokes, currentStroke] : strokes;

    for (const stroke of allStrokes) {
      if (stroke.points.length < 2) continue;

      ctx.beginPath();

      if (stroke.tool === 'eraser') {
        // Eraser removes only drawn content, not the background image
        ctx.strokeStyle = '#FFFFFF';
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-out';
      } else if (stroke.tool === 'highlighter') {
        ctx.strokeStyle = stroke.color;
        ctx.globalAlpha = HIGHLIGHTER_OPACITY;
        ctx.globalCompositeOperation = 'source-over';
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
  }, [ctx, dimensions, strokes, currentStroke]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Find stroke that intersects with given point (for stroke eraser)
  const findIntersectingStrokeIndex = useCallback((point: { x: number; y: number }) => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const stroke = strokes[i];
      if (stroke.tool === 'eraser') continue; // Skip eraser strokes

      for (const p of stroke.points) {
        const dx = (p.x - point.x) * dimensions.width;
        const dy = (p.y - point.y) * dimensions.height;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check if point is within eraser radius + stroke width
        if (distance < eraserWidth / 2 + stroke.width / 2) {
          return i;
        }
      }
    }
    return -1;
  }, [strokes, dimensions, eraserWidth]);

  // Remove stroke at index
  const removeStrokeAt = useCallback((index: number) => {
    if (index >= 0 && index < strokes.length) {
      setStrokes(prev => prev.filter((_, i) => i !== index));
    }
  }, [strokes.length]);

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

  // 멀티터치 시 그리기 취소
  const cancelDrawing = useCallback(() => {
    setCurrentStroke(null);
    setIsDrawing(false);
  }, []);

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;

    // 터치인 경우 포인터 추적
    if (e.pointerType === 'touch') {
      activePointers.current.add(e.pointerId);

      // 두 손가락 이상이면 그리기 취소 (확대/스크롤용)
      if (activePointers.current.size >= 2) {
        cancelDrawing();
        return;
      }
    }

    // 태블릿에서는 펜(스타일러스)으로만 그리기 허용
    if (isTablet() && e.pointerType !== 'pen') {
      return; // 손가락 터치는 스크롤/확대용으로 무시
    }

    e.preventDefault();

    const point = getPoint(e);
    if (!point) return;

    // 뱃지 배치 모드
    if (tool === 'badge') {
      addBadge(point.x, point.y);
      return;
    }

    // 획 지우기 모드
    if (tool === 'eraser' && eraserMode === 'stroke') {
      const strokeIndex = findIntersectingStrokeIndex(point);
      if (strokeIndex >= 0) {
        removeStrokeAt(strokeIndex);
      }
      setIsDrawing(true);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
      return;
    }

    setIsDrawing(true);
    setCurrentStroke({
      points: [point],
      color: currentColor,
      width: currentWidth,
      tool: tool as 'pen' | 'highlighter' | 'eraser',
    });

    // Capture pointer for smooth drawing
    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || readOnly) return;

    // 멀티터치 중이면 그리기 취소
    if (e.pointerType === 'touch' && activePointers.current.size >= 2) {
      cancelDrawing();
      return;
    }

    // 태블릿에서는 펜으로만 그리기
    if (isTablet() && e.pointerType !== 'pen') return;

    e.preventDefault();

    const point = getPoint(e);
    if (!point) return;

    // 획 지우기 모드 - 드래그하면서 여러 획 삭제 가능
    if (tool === 'eraser' && eraserMode === 'stroke') {
      const strokeIndex = findIntersectingStrokeIndex(point);
      if (strokeIndex >= 0) {
        removeStrokeAt(strokeIndex);
      }
      return;
    }

    if (!currentStroke) return;

    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, point],
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    // 터치인 경우 포인터 제거
    if (e.pointerType === 'touch') {
      activePointers.current.delete(e.pointerId);
    }

    if (!isDrawing) return;
    e.preventDefault();

    // 획 지우기 모드는 currentStroke 없이 동작
    if (tool === 'eraser' && eraserMode === 'stroke') {
      setIsDrawing(false);
      return;
    }

    if (!currentStroke) return;

    // Only save strokes with multiple points
    if (currentStroke.points.length >= 2) {
      setStrokes(prev => [...prev, currentStroke]);
    }

    setCurrentStroke(null);
    setIsDrawing(false);
  };

  // 포인터가 캔버스를 벗어났을 때도 포인터 제거
  const handlePointerCancel = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') {
      activePointers.current.delete(e.pointerId);
    }
    if (isDrawing) {
      cancelDrawing();
    }
  };

  // Save to database
  const handleSave = async () => {
    if (!onSave || !hasChanges) return;

    setSaving(true);
    try {
      // 새 형식으로 저장 (strokes + badges)
      await onSave(JSON.stringify({ strokes, badges }));
      setSavedStrokes(strokes);
      setSavedBadges(badges);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSaving(false);
    }
  };

  // Undo last stroke or badge
  const handleUndo = () => {
    if (strokes.length === 0 && badges.length === 0) return;

    // 가장 최근 작업 취소 (뱃지가 더 최근이면 뱃지 취소)
    if (badges.length > 0 && (strokes.length === 0 || badges.length >= strokes.length)) {
      setBadges(prev => prev.slice(0, -1));
    } else {
      setStrokes(prev => prev.slice(0, -1));
    }
  };

  // Clear all
  const handleClear = () => {
    if (strokes.length === 0 && badges.length === 0) return;
    if (!confirm('모든 그림과 뱃지를 지우시겠습니까?')) return;
    setStrokes([]);
    setBadges([]);
  };

  // Add badge at position
  const addBadge = (x: number, y: number) => {
    const newBadge: Badge = {
      id: `badge-${Date.now()}`,
      x,
      y,
      label: selectedBadgeLabel,
      color: selectedBadgeColor,
    };
    setBadges(prev => [...prev, newBadge]);
  };

  // Remove badge by id
  const removeBadge = (id: string) => {
    setBadges(prev => prev.filter(b => b.id !== id));
  };

  // Update badge position
  const updateBadgePosition = (id: string, x: number, y: number) => {
    setBadges(prev => prev.map(b => b.id === id ? { ...b, x, y } : b));
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
            <button
              onClick={() => setTool('badge')}
              className={`p-2 rounded-md transition-colors ${
                tool === 'badge' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              title="뱃지"
            >
              <Tag className="w-5 h-5" />
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
              <label className="relative w-6 h-6 cursor-pointer">
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center"
                  style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
                  title="직접 선택"
                />
              </label>
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
              <label className="relative w-6 h-6 cursor-pointer">
                <input
                  type="color"
                  value={highlighterColor}
                  onChange={(e) => setHighlighterColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="w-6 h-6 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center"
                  style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
                  title="직접 선택"
                />
              </label>
            </div>
          )}

          {/* Badge label selection */}
          {tool === 'badge' && (
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm flex-wrap">
              {BADGE_LABELS.map((label) => (
                <button
                  key={label}
                  onClick={() => setSelectedBadgeLabel(label)}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                    selectedBadgeLabel === label
                      ? 'bg-primary-100 text-primary-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Badge color selection */}
          {tool === 'badge' && (
            <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm">
              {BADGE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedBadgeColor(c)}
                  className={`w-6 h-6 rounded border-2 transition-transform ${
                    selectedBadgeColor === c ? 'border-gray-800 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c, opacity: 0.7 }}
                  title={c}
                />
              ))}
            </div>
          )}

          {/* Eraser mode selection */}
          {tool === 'eraser' && (
            <div className="flex bg-white rounded-lg p-0.5 shadow-sm">
              <button
                onClick={() => setEraserMode('partial')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  eraserMode === 'partial' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                일부
              </button>
              <button
                onClick={() => setEraserMode('stroke')}
                className={`px-2 py-1 text-xs font-medium rounded-md transition-colors ${
                  eraserMode === 'stroke' ? 'bg-primary-100 text-primary-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                획
              </button>
            </div>
          )}

          {/* Eraser size */}
          {tool === 'eraser' && (
            <div className="flex items-center gap-1 bg-white rounded-lg px-2 py-1 shadow-sm">
              <button
                onClick={() => setEraserWidth(Math.max(10, eraserWidth - 5))}
                className="p-1 text-gray-600 hover:text-gray-900"
                disabled={eraserWidth <= 10}
              >
                <Minus className="w-4 h-4" />
              </button>
              <div
                className="w-6 h-6 flex items-center justify-center"
                title={`크기: ${eraserWidth}`}
              >
                <div
                  className="rounded-full bg-gray-400"
                  style={{
                    width: Math.min(eraserWidth * 0.6, 16),
                    height: Math.min(eraserWidth * 0.6, 16),
                  }}
                />
              </div>
              <button
                onClick={() => setEraserWidth(Math.min(40, eraserWidth + 5))}
                className="p-1 text-gray-600 hover:text-gray-900"
                disabled={eraserWidth >= 40}
              >
                <Plus className="w-4 h-4" />
              </button>
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
              disabled={strokes.length === 0 && badges.length === 0}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
              title="실행 취소"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleClear}
              disabled={strokes.length === 0 && badges.length === 0}
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

      {/* Canvas with image underneath */}
      <div
        ref={containerRef}
        className="relative bg-white border border-gray-200 rounded-lg overflow-hidden"
      >
        {/* Background image layer */}
        {image && (
          <img
            src={imageUrl}
            alt="악보"
            tabIndex={-1}
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            className="select-none"
            style={{
              width: dimensions.width,
              height: dimensions.height,
              display: 'block',
              WebkitTouchCallout: 'none',
              WebkitUserSelect: 'none',
            }}
          />
        )}
        {/* Drawing canvas layer (transparent, on top of image) */}
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          tabIndex={-1}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerCancel}
          onPointerCancel={handlePointerCancel}
          className={`absolute top-0 left-0 ${readOnly ? 'touch-auto pointer-events-none' : 'touch-none'}`}
          style={{
            width: dimensions.width,
            height: dimensions.height,
            cursor: readOnly ? 'default' : (tool === 'badge' ? 'copy' : tool === 'pen' ? 'crosshair' : 'cell')
          }}
        />

        {/* Badge layer */}
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`absolute select-none ${!readOnly ? 'cursor-move' : ''}`}
            style={{
              left: badge.x * dimensions.width,
              top: badge.y * dimensions.height,
              transform: 'translate(-50%, -50%)',
            }}
            draggable={false}
            onPointerDown={(e) => {
              if (readOnly) return;
              e.stopPropagation();

              // 지우개 모드면 뱃지 삭제
              if (tool === 'eraser') {
                removeBadge(badge.id);
                return;
              }

              // 드래그 시작
              setDraggingBadge(badge.id);
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;

              const handleMove = (moveE: PointerEvent) => {
                const newX = (moveE.clientX - rect.left) / dimensions.width;
                const newY = (moveE.clientY - rect.top) / dimensions.height;
                updateBadgePosition(badge.id,
                  Math.max(0, Math.min(1, newX)),
                  Math.max(0, Math.min(1, newY))
                );
              };

              const handleUp = () => {
                setDraggingBadge(null);
                document.removeEventListener('pointermove', handleMove);
                document.removeEventListener('pointerup', handleUp);
              };

              document.addEventListener('pointermove', handleMove);
              document.addEventListener('pointerup', handleUp);
            }}
          >
            <div
              className="px-3 py-1.5 rounded-md text-sm font-bold text-gray-800 whitespace-nowrap shadow-sm"
              style={{
                backgroundColor: `${badge.color}99`, // 60% opacity hex
              }}
            >
              {badge.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
