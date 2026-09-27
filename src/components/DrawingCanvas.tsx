import { useRef, useEffect, useState, useCallback } from 'react';
import { Pencil, Eraser, Undo2, Trash2, Minus, Plus, Highlighter, Tag, ZoomIn } from 'lucide-react';

type ToolType = 'pen' | 'highlighter' | 'eraser' | 'badge';
type EraserMode = 'partial' | 'stroke';

interface Point {
  x: number;
  y: number;
  pressure: number;
}

interface Stroke {
  points: Point[];
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

// Zoom 설정
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;

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

// Bezier curve를 사용한 부드러운 선 그리기
function drawSmoothStroke(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  baseWidth: number,
  tool: ToolType,
  canvasWidth: number,
  canvasHeight: number
) {
  if (points.length < 2) return;

  ctx.beginPath();

  if (tool === 'eraser') {
    ctx.strokeStyle = '#FFFFFF';
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-out';
  } else if (tool === 'highlighter') {
    ctx.strokeStyle = color;
    ctx.globalAlpha = HIGHLIGHTER_OPACITY;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.strokeStyle = color;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // 첫 점
  const firstPoint = points[0];
  const firstX = firstPoint.x * canvasWidth;
  const firstY = firstPoint.y * canvasHeight;

  ctx.moveTo(firstX, firstY);

  if (points.length === 2) {
    // 두 점만 있으면 직선
    const secondPoint = points[1];
    const secondX = secondPoint.x * canvasWidth;
    const secondY = secondPoint.y * canvasHeight;

    // 필압 반영
    const avgPressure = (firstPoint.pressure + secondPoint.pressure) / 2;
    ctx.lineWidth = baseWidth * (0.5 + avgPressure * 0.5);

    ctx.lineTo(secondX, secondY);
    ctx.stroke();
    return;
  }

  // 3개 이상의 점: Quadratic Bezier curve로 부드럽게 그리기
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];

    const x0 = p0.x * canvasWidth;
    const y0 = p0.y * canvasHeight;
    const x1 = p1.x * canvasWidth;
    const y1 = p1.y * canvasHeight;

    // 중간점을 control point로 사용
    const cpX = (x0 + x1) / 2;
    const cpY = (y0 + y1) / 2;

    // 필압 반영
    const avgPressure = (p0.pressure + p1.pressure) / 2;
    ctx.lineWidth = baseWidth * (0.5 + avgPressure * 0.5);

    ctx.quadraticCurveTo(x0, y0, cpX, cpY);
  }

  // 마지막 점까지 그리기
  const lastPoint = points[points.length - 1];
  const lastX = lastPoint.x * canvasWidth;
  const lastY = lastPoint.y * canvasHeight;

  ctx.lineWidth = baseWidth * (0.5 + lastPoint.pressure * 0.5);
  ctx.lineTo(lastX, lastY);
  ctx.stroke();

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

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

  // Badge state
  const [badges, setBadges] = useState<Badge[]>([]);
  const [savedBadges, setSavedBadges] = useState<Badge[]>([]);
  const [selectedBadgeLabel, setSelectedBadgeLabel] = useState('A');
  const [selectedBadgeColor, setSelectedBadgeColor] = useState(BADGE_COLORS[0]);
  const [, setDraggingBadge] = useState<string | null>(null);

  // Canvas dimensions
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // 멀티터치 감지용
  const activePointers = useRef<Map<number, PointerEvent>>(new Map());
  const lastPinchDistance = useRef<number>(0);

  // Check if there are unsaved changes
  const hasChanges = JSON.stringify(strokes) !== JSON.stringify(savedStrokes) ||
                     JSON.stringify(badges) !== JSON.stringify(savedBadges);

  // Auto-save when exiting edit mode (readOnly becomes true)
  useEffect(() => {
    if (readOnly && hasChanges && onSave) {
      handleSave();
    }
  }, [readOnly]);

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
    const context = canvasRef.current.getContext('2d', {
      alpha: true,
      desynchronized: true, // 성능 향상
    });
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
      if (stroke.points.length < 1) continue;

      drawSmoothStroke(
        ctx,
        stroke.points,
        stroke.color,
        stroke.width,
        stroke.tool,
        width,
        height
      );
    }
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

  // Get point from event (normalized coordinates)
  const getPoint = (e: React.PointerEvent): Point | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();

    // 화면 좌표를 캔버스 좌표로 변환 (zoom, pan 고려)
    const canvasX = (e.clientX - rect.left - pan.x) / zoom;
    const canvasY = (e.clientY - rect.top - pan.y) / zoom;

    // 정규화된 좌표 (0-1)
    const normalizedX = canvasX / dimensions.width;
    const normalizedY = canvasY / dimensions.height;

    return {
      x: normalizedX,
      y: normalizedY,
      pressure: e.pressure > 0 ? e.pressure : 0.5, // 압력 없으면 기본값
    };
  };

  // 멀티터치 시 그리기 취소
  const cancelDrawing = useCallback(() => {
    setCurrentStroke(null);
    setIsDrawing(false);
    setIsPanning(false);
  }, []);

  // 두 포인터 사이의 거리 계산
  const getDistance = (p1: PointerEvent, p2: PointerEvent): number => {
    const dx = p1.clientX - p2.clientX;
    const dy = p1.clientY - p2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // 두 포인터의 중심점 계산
  const getCenter = (p1: PointerEvent, p2: PointerEvent) => {
    return {
      x: (p1.clientX + p2.clientX) / 2,
      y: (p1.clientY + p2.clientY) / 2,
    };
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;

    // 포인터 추가
    activePointers.current.set(e.pointerId, e.nativeEvent);

    // 두 손가락: 핀치 줌 시작
    if (activePointers.current.size === 2) {
      cancelDrawing();
      const pointers = Array.from(activePointers.current.values());
      lastPinchDistance.current = getDistance(pointers[0], pointers[1]);
      return;
    }

    // 세 손가락 이상: 무시
    if (activePointers.current.size > 2) {
      cancelDrawing();
      return;
    }

    // 한 손가락: 그리기 또는 팬
    // 태블릿에서는 펜만 그리기, 손가락은 팬
    if (isTablet()) {
      if (e.pointerType === 'pen') {
        // Apple Pencil로 그리기
        e.preventDefault();
        startDrawing(e);
      } else {
        // 손가락으로 팬
        e.preventDefault();
        startPanning(e);
      }
    } else {
      // 비태블릿: 모두 그리기
      e.preventDefault();
      startDrawing(e);
    }

    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
  };

  const startDrawing = (e: React.PointerEvent) => {
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
      return;
    }

    setIsDrawing(true);
    setCurrentStroke({
      points: [point],
      color: currentColor,
      width: currentWidth,
      tool: tool as 'pen' | 'highlighter' | 'eraser',
    });
  };

  const startPanning = (e: React.PointerEvent) => {
    // 기본 크기(1배)에서는 팬 비활성화
    if (zoom === 1) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (readOnly) return;

    // 포인터 업데이트
    if (activePointers.current.has(e.pointerId)) {
      activePointers.current.set(e.pointerId, e.nativeEvent);
    }

    // 두 손가락: 핀치 줌 (확대/축소)
    if (activePointers.current.size === 2) {
      e.preventDefault();
      const pointers = Array.from(activePointers.current.values());
      const currentDistance = getDistance(pointers[0], pointers[1]);

      if (lastPinchDistance.current > 0) {
        const scaleFactor = currentDistance / lastPinchDistance.current;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * scaleFactor));

        // 줌 중심점 계산 (두 손가락의 중심)
        const center = getCenter(pointers[0], pointers[1]);
        const rect = canvasRef.current?.getBoundingClientRect();

        if (rect) {
          // 컨테이너 기준 중심점
          const zoomPointX = center.x - rect.left;
          const zoomPointY = center.y - rect.top;

          // 줌 변화율
          const zoomChange = newZoom / zoom;

          // 중심점을 기준으로 팬 조정
          const newPanX = zoomPointX - (zoomPointX - pan.x) * zoomChange;
          const newPanY = zoomPointY - (zoomPointY - pan.y) * zoomChange;

          // 원래 크기(1배)로 돌아가면 팬도 리셋
          if (newZoom === MIN_ZOOM) {
            setPan({ x: 0, y: 0 });
          } else {
            // 팬 범위 제한
            const maxPanX = 0;
            const minPanX = -(dimensions.width * (newZoom - 1));
            const maxPanY = 0;
            const minPanY = -(dimensions.height * (newZoom - 1));

            setPan({
              x: Math.max(minPanX, Math.min(maxPanX, newPanX)),
              y: Math.max(minPanY, Math.min(maxPanY, newPanY)),
            });
          }
        }

        setZoom(newZoom);
      }

      lastPinchDistance.current = currentDistance;
      return;
    }

    // 한 손가락: 팬 중이면 팬
    if (isPanning) {
      e.preventDefault();

      // 팬 범위 계산 (여백이 안 보이게 제한)
      const newPanX = e.clientX - panStart.x;
      const newPanY = e.clientY - panStart.y;

      const maxPanX = 0; // 오른쪽 끝
      const minPanX = -(dimensions.width * (zoom - 1)); // 왼쪽 끝
      const maxPanY = 0; // 위쪽 끝
      const minPanY = -(dimensions.height * (zoom - 1)); // 아래쪽 끝

      setPan({
        x: Math.max(minPanX, Math.min(maxPanX, newPanX)),
        y: Math.max(minPanY, Math.min(maxPanY, newPanY)),
      });
      return;
    }

    if (!isDrawing) return;

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
    // 포인터 제거
    activePointers.current.delete(e.pointerId);

    // 핀치 줌 종료
    if (activePointers.current.size < 2) {
      lastPinchDistance.current = 0;
    }

    if (isPanning) {
      setIsPanning(false);
      return;
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
    activePointers.current.delete(e.pointerId);
    if (isDrawing || isPanning) {
      cancelDrawing();
    }
  };

  // Save to database
  const handleSave = async () => {
    if (!onSave || !hasChanges) return;

    try {
      // 새 형식으로 저장 (strokes + badges)
      await onSave(JSON.stringify({ strokes, badges }));
      setSavedStrokes(strokes);
      setSavedBadges(badges);
    } catch (error) {
      console.error('Save failed:', error);
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

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);

    // 화면 중앙을 기준으로 확대
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const zoomChange = newZoom / zoom;

      const newPanX = centerX - (centerX - pan.x) * zoomChange;
      const newPanY = centerY - (centerY - pan.y) * zoomChange;

      // 팬 범위 제한
      const maxPanX = 0;
      const minPanX = -(dimensions.width * (newZoom - 1));
      const maxPanY = 0;
      const minPanY = -(dimensions.height * (newZoom - 1));

      setPan({
        x: Math.max(minPanX, Math.min(maxPanX, newPanX)),
        y: Math.max(minPanY, Math.min(maxPanY, newPanY)),
      });
    }

    setZoom(newZoom);
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
          {tool !== 'eraser' && tool !== 'badge' && (
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
          <div className="flex items-center gap-1 ml-auto">
            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-white rounded-lg p-0.5 shadow-sm mr-2">
              <button
                onClick={handleZoomIn}
                disabled={zoom >= MAX_ZOOM}
                className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                title="확대"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

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
        </div>
      )}

      {/* Canvas container with zoom/pan */}
      <div
        ref={containerRef}
        className="relative bg-white border border-gray-200 rounded-lg overflow-hidden"
        style={{ touchAction: 'none' }}
      >
        <div
          className="relative"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: dimensions.width,
            height: dimensions.height,
          }}
        >
          {/* Background image layer */}
          {image && (
            <img
              src={imageUrl}
              alt="악보"
              tabIndex={-1}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              className="select-none block"
              style={{
                width: dimensions.width,
                height: dimensions.height,
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
              cursor: readOnly ? 'default' : (
                isPanning ? 'grabbing' :
                tool === 'badge' ? 'copy' :
                tool === 'pen' ? 'crosshair' :
                'cell'
              )
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
                  // transform이 적용된 div의 좌표로 변환
                  const containerX = (moveE.clientX - rect.left - pan.x) / zoom;
                  const containerY = (moveE.clientY - rect.top - pan.y) / zoom;

                  const newX = containerX / dimensions.width;
                  const newY = containerY / dimensions.height;

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

      {/* Zoom/Pan 도움말 */}
      {!readOnly && isTablet() && (
        <div className="text-xs text-gray-500 text-center">
          💡 Apple Pencil로 그리기 | 손가락으로 이동 | 두 손가락으로 확대/축소
        </div>
      )}
    </div>
  );
}
