import { useState, useEffect, useRef, useCallback } from 'react';
import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import {
  Download,
  FileText,
  Loader2,
  Music2,
  Edit2,
  Type,
  PenTool,
  X,
  Play,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useSetlists } from '@/hooks/useSetlists';
import Button from '@/components/Button';
import DrawingCanvas from '@/components/DrawingCanvas';
import LyricsModal from '@/components/LyricsModal';
import type { SetlistWithItems, SetlistItemWithSong } from '@/types/database';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

dayjs.locale('ko');

const HIGHLIGHTER_OPACITY = 0.4;

// 찬양 모드용 악보 컴포넌트 (이미지 + annotations 오버레이)
function WorshipModeSheet({
  imageUrl,
  annotations,
  title
}: {
  imageUrl: string;
  annotations?: string | null;
  title: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // 줌/팬 상태
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [touchDistance, setTouchDistance] = useState<number | null>(null);

  // 이미지 로드
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  // 이미지 변경 시 줌/팬 초기화
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [imageUrl]);

  // 컨테이너 크기에 맞춰 dimensions 계산
  useEffect(() => {
    if (!containerRef.current || !image) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const imgAspect = image.width / image.height;
    const containerAspect = containerWidth / containerHeight;

    let width: number, height: number;
    if (imgAspect > containerAspect) {
      width = containerWidth;
      height = containerWidth / imgAspect;
    } else {
      height = containerHeight;
      width = containerHeight * imgAspect;
    }

    setDimensions({ width, height });
  }, [image]);

  // 더블 클릭으로 줌 토글
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setPosition({
        x: (rect.width / 2 - x) * 2,
        y: (rect.height / 2 - y) * 2,
      });
    }
  }, [scale]);

  // 마우스 드래그 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsPanning(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  }, [scale]);

  // 마우스 드래그
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    e.preventDefault();
    const dx = e.clientX - lastPanPoint.x;
    const dy = e.clientY - lastPanPoint.y;
    setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPanPoint]);

  // 마우스 드래그 종료
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // 터치 시작 (핀치 줌)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setTouchDistance(distance);
    } else if (e.touches.length === 1 && scale > 1) {
      const touch = e.touches[0];
      setIsPanning(true);
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    }
  }, [scale]);

  // 터치 이동 (핀치 줌 + 드래그)
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistance !== null) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      const newScale = Math.max(1, Math.min(4, scale * (distance / touchDistance)));
      setScale(newScale);
      setTouchDistance(distance);
    } else if (e.touches.length === 1 && isPanning) {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - lastPanPoint.x;
      const dy = touch.clientY - lastPanPoint.y;
      setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    }
  }, [touchDistance, isPanning, lastPanPoint, scale]);

  // 터치 종료
  const handleTouchEnd = useCallback(() => {
    setTouchDistance(null);
    setIsPanning(false);
  }, []);

  // annotations 그리기
  const drawAnnotations = useCallback(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 항상 먼저 canvas를 clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // annotations가 없으면 clear만 하고 종료
    if (!annotations) return;

    try {
      const parsed = JSON.parse(annotations);
      const strokes = Array.isArray(parsed) ? parsed : (parsed.strokes || []);
      const badges = Array.isArray(parsed) ? [] : (parsed.badges || []);

      // Draw strokes
      for (const stroke of strokes) {
        if (stroke.points.length < 2) continue;

        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.tool === 'eraser') {
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

      // Draw badges
      for (const badge of badges) {
        const x = badge.x * dimensions.width;
        const y = badge.y * dimensions.height;

        const paddingX = 12;
        const paddingY = 6;
        const fontSize = 14;
        const radius = 6;

        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        const textMetrics = ctx.measureText(badge.label);
        const textWidth = textMetrics.width;

        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = fontSize + paddingY * 2;

        const boxX = x - boxWidth / 2;
        const boxY = y - boxHeight / 2;

        ctx.globalAlpha = 0.6;
        ctx.fillStyle = badge.color;

        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxWidth - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
        ctx.lineTo(boxX + radius, boxY + boxHeight);
        ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge.label, x, y);
      }

      ctx.globalAlpha = 1;
    } catch {
      // Invalid annotations
    }
  }, [annotations, dimensions]);

  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  if (!image) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden"
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ cursor: scale > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
    >
      <div
        className="relative"
        style={{
          width: dimensions.width,
          height: dimensions.height,
          transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
          transformOrigin: 'center center',
          transition: isPanning ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <img
          src={imageUrl}
          alt={`${title} 악보`}
          style={{ width: dimensions.width, height: dimensions.height }}
          className="block"
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="absolute top-0 left-0 pointer-events-none"
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute('/worship/setlists/$id/view')({
  component: SetlistViewPage,
});

function SetlistViewPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { fetchSetlistById, updateSetlistItem } = useSetlists();

  const [setlist, setSetlist] = useState<SetlistWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [editingItems, setEditingItems] = useState<Set<string>>(new Set());
  const [lyricsItem, setLyricsItem] = useState<SetlistItemWithSong | null>(null);

  // 찬양 모드 (전체화면)
  const [worshipMode, setWorshipMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const toggleEditing = (itemId: string) => {
    setEditingItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!id) return;

    const loadSetlist = async () => {
      setLoading(true);
      const data = await fetchSetlistById(id);
      if (data) {
        setSetlist(data);
      } else {
        toast.error('콘티를 찾을 수 없습니다.');
        navigate({ to: '/worship/setlists' });
      }
      setLoading(false);
    };

    loadSetlist();
  }, [id, fetchSetlistById, navigate]);

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('YYYY년 M월 D일 (ddd)');
  };

  const handleSaveAnnotations = async (itemId: string, annotations: string) => {
    try {
      await updateSetlistItem(itemId, { annotations });
      if (setlist) {
        setSetlist({
          ...setlist,
          setlist_items: setlist.setlist_items.map(item =>
            item.id === itemId ? { ...item, annotations } : item
          ),
        });
      }
      toast.success('그림이 저장되었습니다.');
    } catch (error) {
      console.error('Failed to save annotations:', error);
      toast.error('그림 저장 실패');
      throw error;
    }
  };

  // Create annotation canvas (transparent, drawings + badges)
  const createAnnotationCanvas = (
    annotations: string,
    width: number,
    height: number
  ): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return canvas;

    const HIGHLIGHTER_OPACITY = 0.4;

    try {
      const parsed = JSON.parse(annotations);

      // 이전 형식(배열) 또는 새 형식(객체) 지원
      const strokes = Array.isArray(parsed) ? parsed : (parsed.strokes || []);
      const badges = Array.isArray(parsed) ? [] : (parsed.badges || []);

      // Draw strokes
      for (const stroke of strokes) {
        if (stroke.points.length < 2) continue;

        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.tool === 'eraser') {
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
        ctx.moveTo(first.x * width, first.y * height);

        for (const point of rest) {
          ctx.lineTo(point.x * width, point.y * height);
        }

        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      // Draw badges - 화면 미리보기와 동일한 비율로 렌더링
      // 화면에서는 약 500px 너비로 표시되므로 그 비율로 스케일
      const displayWidth = 500;
      const scale = width / displayWidth;

      for (const badge of badges) {
        const x = badge.x * width;
        const y = badge.y * height;

        // 화면에서 보이는 크기 (px) * 스케일 - px-3 py-1.5
        const paddingX = 12 * scale;
        const paddingY = 6 * scale;
        const fontSize = 14 * scale;
        const radius = 6 * scale;

        ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        const textMetrics = ctx.measureText(badge.label);
        const textWidth = textMetrics.width;

        const boxWidth = textWidth + paddingX * 2;
        const boxHeight = fontSize + paddingY * 2;

        // Draw rounded rectangle background
        const boxX = x - boxWidth / 2;
        const boxY = y - boxHeight / 2;

        ctx.globalAlpha = 0.6;
        ctx.fillStyle = badge.color;

        ctx.beginPath();
        ctx.moveTo(boxX + radius, boxY);
        ctx.lineTo(boxX + boxWidth - radius, boxY);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
        ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
        ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
        ctx.lineTo(boxX + radius, boxY + boxHeight);
        ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
        ctx.lineTo(boxX, boxY + radius);
        ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
        ctx.closePath();
        ctx.fill();

        // Draw text (fully opaque)
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#1F2937';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge.label, x, y);
      }

      ctx.globalAlpha = 1;
    } catch {
      // Invalid annotations, skip
    }

    return canvas;
  };

  const handleExportPDF = async () => {
    if (!setlist) return;

    setExporting(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      let isFirstPage = true;

      for (const item of setlist.setlist_items) {
        const sheet = item.song.song_sheets.find((s) => s.music_key === item.selected_key);

        if (!sheet?.file_url) continue;
        if (sheet.file_url.toLowerCase().endsWith('.pdf')) continue;

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.crossOrigin = 'anonymous';
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = sheet.file_url;
        });

        // Create combined canvas with image + annotations
        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = img.width;
        combinedCanvas.height = img.height;
        const combinedCtx = combinedCanvas.getContext('2d');

        if (!combinedCtx) continue;

        // Draw base image first
        combinedCtx.drawImage(img, 0, 0);

        // Create separate annotation canvas and overlay it
        if (item.annotations) {
          const annotationCanvas = createAnnotationCanvas(item.annotations, img.width, img.height);
          combinedCtx.drawImage(annotationCanvas, 0, 0);
        }

        // Calculate dimensions to fit on one page
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        const aspectRatio = img.width / img.height;

        let finalWidth = maxWidth;
        let finalHeight = finalWidth / aspectRatio;

        // If too tall, scale down to fit height
        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = finalHeight * aspectRatio;
        }

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        // Center horizontally if scaled down
        const xOffset = margin + (maxWidth - finalWidth) / 2;

        const combinedData = combinedCanvas.toDataURL('image/png');
        pdf.addImage(combinedData, 'PNG', xOffset, margin, finalWidth, finalHeight);
      }

      const fileName = `${dayjs(setlist.date).format('YYMMDD')}_${setlist.service_type}.pdf`;

      pdf.save(fileName);
      toast.success('PDF가 저장되었습니다.');
    } catch (error) {
      console.error('PDF 생성 실패:', error);
      toast.error('PDF 생성에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  // 키보드 네비게이션
  useEffect(() => {
    if (!worshipMode || !setlist) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        if (currentIndex < setlist.setlist_items.length - 1) {
          setCurrentIndex(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
        }
      } else if (e.key === 'Escape') {
        setWorshipMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [worshipMode, setlist, currentIndex]);

  const openWorshipMode = () => {
    setCurrentIndex(0);
    setWorshipMode(true);
  };

  const closeWorshipMode = () => {
    setWorshipMode(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!setlist) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10 print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            onClick={openWorshipMode}
            icon={<Play className="w-4 h-4" />}
          >
            찬양
          </Button>
          <button
            onClick={() => navigate({ to: '/worship/setlists/$id', params: { id: id! } })}
            className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
            title="편집"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <Button onClick={handleExportPDF} loading={exporting} icon={!exporting ? <Download className="w-4 h-4" /> : undefined}>
            PDF
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 lg:p-8">
          <div className="text-center mb-8 pb-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{formatDate(setlist.date)}</h1>
            <p className="text-lg text-primary-600 font-medium">{setlist.service_type}</p>
            {setlist.description && <p className="mt-2 text-gray-500">{setlist.description}</p>}
          </div>

          {setlist.setlist_items.length === 0 ? (
            <div className="text-center py-12">
              <Music2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">등록된 곡이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {setlist.setlist_items.map((item) => {
                // 선택된 키의 악보가 있으면 사용, 없으면 첫 번째 악보 자동 표시
                const sheet = item.selected_key
                  ? item.song.song_sheets.find((s) => s.music_key === item.selected_key)
                  : item.song.song_sheets[0];
                const displaySheet = sheet || item.song.song_sheets[0];
                const isPdf = displaySheet?.file_url?.toLowerCase().endsWith('.pdf');
                const isImage = displaySheet && !isPdf;

                return (
                  <div key={item.id} className="border-b border-gray-200 pb-8 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-8 h-8 bg-primary-600 text-white rounded-[8px] flex items-center justify-center flex-shrink-0 font-bold">
                        {item.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-end">
                            <Link
                              to="/worship/songs/$id/view"
                              params={{ id: item.song.id }}
                              className="font-semibold text-gray-900 text-[20px] mr-2 hover:text-primary-600 transition-colors"
                            >
                              {item.song.title}
                            </Link>
                            <p className="text-gray-500 text-[12px] mb-1">{item.song.artist || ''}</p>
                          </div>
                          {(item.selected_key || displaySheet?.music_key) && (
                            <span className="px-3 py-1 bg-primary-100 text-primary-700 font-bold rounded-lg text-lg flex-shrink-0">
                              {item.selected_key || displaySheet?.music_key}
                            </span>
                          )}
                        </div>

                        {item.note && (
                          <p className="mt-2 text-sm text-gray-600 bg-yellow-50 px-3 py-2 rounded-lg inline-block">
                            {item.note}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="ml-14">
                      {displaySheet ? (
                        <>
                          <div className="flex justify-end gap-2 mb-2 print:hidden">
                              {item.song.youtube_url && (
                                <a
                                  href={item.song.youtube_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  유튜브
                                </a>
                              )}
                              {item.song.lyrics && (
                                <button
                                  onClick={() => setLyricsItem(item)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                >
                                  <Type className="w-4 h-4" />
                                  가사보기
                                </button>
                              )}
                              <button
                                onClick={() => toggleEditing(item.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  editingItems.has(item.id)
                                    ? 'bg-primary-600 text-white'
                                    : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                }`}
                              >
                                {editingItems.has(item.id) ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    완료
                                  </>
                                ) : (
                                  <>
                                    <PenTool className="w-4 h-4" />
                                    그리기
                                  </>
                                )}
                              </button>
                            </div>
                          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            {isPdf ? (
                              <iframe src={displaySheet.file_url} className="w-full h-[600px]" title={`${item.song.title} 악보`} />
                            ) : isImage ? (
                              <DrawingCanvas
                                imageUrl={displaySheet.file_url}
                                annotations={item.annotations || undefined}
                                onSave={(annotations) => handleSaveAnnotations(item.id, annotations)}
                                readOnly={!editingItems.has(item.id)}
                              />
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <div className="bg-gray-50 rounded-lg p-8 text-center">
                          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-400">등록된 악보가 없습니다</p>
                          <div className="mt-3 flex items-center justify-center gap-2">
                            {item.song.youtube_url && (
                              <a
                                href={item.song.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" />
                                유튜브
                              </a>
                            )}
                            {item.song.lyrics && (
                              <button
                                onClick={() => setLyricsItem(item)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                              >
                                <Type className="w-4 h-4" />
                                가사보기
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
            찬양팀 콘티 · {dayjs().format('YYYY. M. D.')}
          </div>
        </div>
      </div>

      {/* 가사 모달 */}
      {lyricsItem && (
        <LyricsModal
          isOpen={!!lyricsItem}
          onClose={() => setLyricsItem(null)}
          title={lyricsItem.song.title}
          artist={lyricsItem.song.artist}
          lyrics={lyricsItem.song.lyrics || ''}
        />
      )}

      {/* 찬양 모드 (전체화면) */}
      {worshipMode && setlist && setlist.setlist_items.length > 0 && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col">
          {/* 상단 바 */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80">
            <div className="flex items-center gap-3 text-white flex-1 min-w-0">
              <span className="px-2 py-1 bg-primary-600 rounded text-sm font-bold flex-shrink-0">
                {currentIndex + 1} / {setlist.setlist_items.length}
              </span>
              <span className="font-medium flex-shrink-0">
                {setlist.setlist_items[currentIndex]?.song.title}
              </span>
              {setlist.setlist_items[currentIndex]?.selected_key && (
                <span className="px-2 py-0.5 bg-white/20 rounded text-sm flex-shrink-0">
                  {setlist.setlist_items[currentIndex]?.selected_key}
                </span>
              )}
              {setlist.setlist_items[currentIndex]?.note && (
                <span className="px-2 py-0.5 bg-yellow-500/80 text-gray-900 rounded text-sm truncate">
                  {setlist.setlist_items[currentIndex]?.note}
                </span>
              )}
            </div>
            <button
              onClick={closeWorshipMode}
              className="p-2 text-white/70 hover:text-white transition-colors flex-shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 악보 영역 */}
          <div className="flex-1 flex items-center justify-center bg-white overflow-hidden relative">
            {/* 이전 클릭 영역 */}
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-w-resize opacity-0 hover:opacity-100 hover:bg-black/5 transition-opacity flex items-center justify-start pl-4"
              >
                <span className="text-gray-400 text-4xl">‹</span>
              </button>
            )}

            {/* 다음 클릭 영역 */}
            {currentIndex < setlist.setlist_items.length - 1 && (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="absolute right-0 top-0 bottom-0 w-1/4 z-10 cursor-e-resize opacity-0 hover:opacity-100 hover:bg-black/5 transition-opacity flex items-center justify-end pr-4"
              >
                <span className="text-gray-400 text-4xl">›</span>
              </button>
            )}

            {(() => {
              const item = setlist.setlist_items[currentIndex];
              const sheet = item?.selected_key
                ? item.song.song_sheets.find((s) => s.music_key === item.selected_key)
                : item?.song.song_sheets[0];
              const displaySheet = sheet || item?.song.song_sheets[0];

              if (!displaySheet) {
                return (
                  <div className="text-center text-gray-400">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p>악보가 없습니다</p>
                  </div>
                );
              }

              const isPdf = displaySheet.file_url?.toLowerCase().endsWith('.pdf');

              if (isPdf) {
                return (
                  <iframe
                    src={displaySheet.file_url}
                    className="w-full h-full"
                    title={`${item.song.title} 악보`}
                  />
                );
              }

              return (
                <WorshipModeSheet
                  key={item.id}
                  imageUrl={displaySheet.file_url}
                  annotations={item.annotations}
                  title={item.song.title}
                />
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
