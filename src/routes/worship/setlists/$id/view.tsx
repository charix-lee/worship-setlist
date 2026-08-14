import { useState, useEffect, useRef, useCallback } from 'react';
import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import {
  Download,
  Loader2,
  Music2,
  Edit2,
  X,
  Play,
  ArrowLeft,
  User,
  Calendar,
  Copy,
  ChevronDown,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { useSetlists } from '@/hooks/useSetlists';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import DrawingCanvas from '@/components/DrawingCanvas';
import LyricsModal from '@/components/LyricsModal';
import type { SetlistWithItems, SetlistItemWithSong } from '@/types/database';
import { getServiceTypeColors } from '@/utils/colors';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

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
  const { can } = usePermissions();
  const { profile } = useAuth();

  const [setlist, setSetlist] = useState<SetlistWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [editingItems, setEditingItems] = useState<Set<string>>(new Set());
  const [lyricsItem, setLyricsItem] = useState<SetlistItemWithSong | null>(null);

  // 찬양 모드 (전체화면)
  const [worshipMode, setWorshipMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(true); // 멘트 표시 토글

  // 악보 내보내기
  const [exportingSheets, setExportingSheets] = useState(false);

  // 다운로드 드롭다운
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const downloadDropdownRef = useRef<HTMLDivElement>(null);

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

  // 드롭다운 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target as Node)) {
        setDownloadDropdownOpen(false);
      }
    };

    if (downloadDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [downloadDropdownOpen]);

  const openWorshipMode = () => {
    setCurrentIndex(0);
    setWorshipMode(true);
  };

  const closeWorshipMode = () => {
    setWorshipMode(false);
  };

  const copySongList = async () => {
    if (!setlist || setlist.setlist_items.length === 0) {
      toast.error('복사할 곡이 없습니다.');
      return;
    }

    const songList = setlist.setlist_items
      .map((item, index) => {
        const youtubeLink = item.song.youtube_url || '';
        return `${index + 1}. ${item.song.title}\n${youtubeLink}`;
      })
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(songList);
      toast.success('곡 리스트가 복사되었습니다!');
    } catch {
      toast.error('복사 실패');
    }
  };

  const exportSheetsPDF = async () => {
    if (!setlist || setlist.setlist_items.length === 0) {
      toast.error('악보가 없습니다.');
      return;
    }

    setExportingSheets(true);
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

        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        const aspectRatio = img.width / img.height;

        let finalWidth = maxWidth;
        let finalHeight = finalWidth / aspectRatio;

        if (finalHeight > maxHeight) {
          finalHeight = maxHeight;
          finalWidth = finalHeight * aspectRatio;
        }

        if (!isFirstPage) {
          pdf.addPage();
        }
        isFirstPage = false;

        const xOffset = margin + (maxWidth - finalWidth) / 2;
        pdf.addImage(sheet.file_url, 'PNG', xOffset, margin, finalWidth, finalHeight);
      }

      const fileName = `${dayjs(setlist.date).format('YYMMDD')}_악보.pdf`;
      pdf.save(fileName);
      toast.success('PDF가 다운로드되었습니다.');
    } catch (error) {
      console.error('PDF 생성 실패:', error);
      toast.error('PDF 생성에 실패했습니다.');
    } finally {
      setExportingSheets(false);
    }
  };

  const exportSheetsImages = async () => {
    if (!setlist || setlist.setlist_items.length === 0) {
      toast.error('악보가 없습니다.');
      return;
    }

    setExportingSheets(true);
    try {
      const zip = new JSZip();

      for (const item of setlist.setlist_items) {
        const sheet = item.song.song_sheets.find((s) => s.music_key === item.selected_key);
        if (!sheet?.file_url) continue;
        if (sheet.file_url.toLowerCase().endsWith('.pdf')) continue;

        // 원본 이미지를 blob으로 가져오기
        const response = await fetch(sheet.file_url);
        const blob = await response.blob();

        const fileName = `${item.position}_${item.song.title}_${item.selected_key}.png`;
        zip.file(fileName, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dayjs(setlist.date).format('YYMMDD')}_악보.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('이미지가 다운로드되었습니다.');
    } catch (error) {
      console.error('이미지 내보내기 실패:', error);
      toast.error('이미지 내보내기에 실패했습니다.');
    } finally {
      setExportingSheets(false);
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-5 pt-4 sm:pt-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[11px] sm:text-[13px] mb-3 sm:mb-4">
            <span className="text-gray-500 font-medium">찬양팀</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-500 font-medium">콘티목록</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-primary-600 font-semibold truncate">{formatDate(setlist.date)}</span>
          </div>

          {/* Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => navigate({ to: '/worship/setlists' })}
                className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-3">
                  <h1 className="text-[18px] sm:text-[20px] lg:text-[24px] font-bold text-gray-900 truncate">{formatDate(setlist.date)}</h1>
                  <div
                    className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md flex-shrink-0"
                    style={{ backgroundColor: getServiceTypeColors(setlist.service_type).bg }}
                  >
                    <span
                      className="text-[11px] sm:text-[13px] font-semibold whitespace-nowrap"
                      style={{ color: getServiceTypeColors(setlist.service_type).text }}
                    >
                      {setlist.service_type}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-end">
              <button
                onClick={openWorshipMode}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white"
                title="찬양 모드"
              >
                <Play className="w-4 h-4" />
                <span className="hidden sm:inline">찬양</span>
              </button>
              <button
                onClick={copySongList}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white"
                title="곡 리스트 복사"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden md:inline">곡 리스트 복사</span>
              </button>
              {can.editSetlist && (
                <button
                  onClick={() => navigate({ to: '/worship/setlists/$id', params: { id: id! } })}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors bg-white"
                  title="편집"
                >
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">편집</span>
                </button>
              )}

              {/* 다운로드 드롭다운 */}
              <div className="relative" ref={downloadDropdownRef}>
                <button
                  onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                  disabled={exporting || exportingSheets}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2.5 border border-primary-600 rounded-lg text-sm font-semibold text-primary-600 hover:bg-primary-50 transition-colors bg-white disabled:opacity-50"
                  title="다운로드"
                >
                  {(exporting || exportingSheets) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">다운로드</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${downloadDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {downloadDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                    <button
                      onClick={() => {
                        exportSheetsPDF();
                        setDownloadDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      악보 PDF
                    </button>
                    <button
                      onClick={() => {
                        exportSheetsImages();
                        setDownloadDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <ImageIcon className="w-4 h-4" />
                      악보 이미지
                    </button>
                    <div className="h-px bg-gray-200 my-1" />
                    <button
                      onClick={() => {
                        handleExportPDF();
                        setDownloadDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      전체 PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center gap-3 sm:gap-5 pb-2 text-[11px] sm:text-[13px]">
            {setlist.creator?.name && (
              <div className="flex items-center gap-1 sm:gap-1.5">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                <span className="text-gray-600">{setlist.creator.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
              <span className="text-gray-600">{dayjs(setlist.created_at).format('YYYY. M. D.')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Music2 className="w-5 h-5 text-gray-900" />
            <h2 className="text-[17px] font-bold text-gray-900">예배 찬양 콘티</h2>
            <div className="h-max bg-primary-600 px-2 pb-1 rounded-[100px]">
              <span className="text-[12px] font-semibold text-white">{setlist.setlist_items.length}곡</span>
            </div>
          </div>
        </div>

        {setlist.setlist_items.length === 0 ? (
          <div className="text-center py-12">
            <Music2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">등록된 곡이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {setlist.setlist_items.map((item) => {
              const sheet = item.selected_key
                ? item.song.song_sheets.find((s) => s.music_key === item.selected_key)
                : item.song.song_sheets[0];
              const displaySheet = sheet || item.song.song_sheets[0];
              const isPdf = displaySheet?.file_url?.toLowerCase().endsWith('.pdf');
              const isImage = displaySheet && !isPdf;

              return (
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
                  {/* Song Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-8 h-8 bg-primary-600 text-white rounded-2xl flex items-center justify-center flex-shrink-0 font-bold text-[15px]">
                        {item.position}
                      </div>
                      <Link
                        to="/worship/songs/$id/view"
                        params={{ id: item.song.id }}
                        className="text-[18px] font-bold text-gray-900 hover:text-primary-600 transition-colors"
                      >
                        {item.song.title}
                      </Link>
                      {item.song.artist && (
                        <span className="text-[13px] text-gray-500">{item.song.artist}</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {(item.selected_key || displaySheet?.music_key) && (
                        <div className="bg-gray-100 px-2.5 py-1 rounded-md">
                          <span className="text-[13px] font-semibold text-gray-600">
                            {item.selected_key || displaySheet?.music_key}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-gray-100 mb-4" />

                  {/* Song Details */}
                  <div className="flex flex-col gap-2.5 py-3.5">
                    {/* Memo Section */}
                    {item.note && (
                      <div className="bg-yellow-50 px-3.5 py-3 rounded-lg">
                        <p className="text-[12px] font-bold text-yellow-900 uppercase mb-1.5">메모</p>
                        <p className="text-[14px] text-yellow-900 whitespace-pre-wrap">{item.note}</p>
                      </div>
                    )}

                    {/* Ment Section */}
                    {item.comment && setlist.created_by === profile?.id && (
                      <div className="bg-purple-50 px-3.5 py-3 rounded-lg">
                        <p className="text-[12px] font-bold text-purple-900 uppercase mb-1.5">멘트</p>
                        <p className="text-[14px] text-purple-900 whitespace-pre-wrap">{item.comment}</p>
                      </div>
                    )}

                    {/* Action Badges */}
                    <div className="flex items-center justify-end gap-2 pt-3.5">
                      {item.song.youtube_url && (
                        <a
                          href={item.song.youtube_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-red-100 text-red-600 text-[13px] font-semibold rounded-lg hover:bg-red-200 transition-colors"
                        >
                          유튜브
                        </a>
                      )}
                      {item.song.lyrics && (
                        <button
                          onClick={() => setLyricsItem(item)}
                          className="px-3 py-1.5 bg-green-100 text-green-700 text-[13px] font-semibold rounded-lg hover:bg-green-200 transition-colors"
                        >
                          가사보기
                        </button>
                      )}
                      {can.editSetlist && (
                        <button
                          onClick={() => toggleEditing(item.id)}
                          className={`px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors ${
                            editingItems.has(item.id)
                              ? 'bg-primary-600 text-white'
                              : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                          }`}
                        >
                          {editingItems.has(item.id) ? '완료' : '그리기'}
                        </button>
                      )}
                    </div>

                    {/* Sheet Preview */}
                    {displaySheet ? (
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                        {isPdf ? (
                          <iframe
                            src={displaySheet.file_url}
                            className="w-full h-[800px]"
                            title={`${item.song.title} 악보`}
                          />
                        ) : isImage ? (
                          <DrawingCanvas
                            imageUrl={displaySheet.file_url}
                            annotations={item.annotations || undefined}
                            onSave={(annotations) => handleSaveAnnotations(item.id, annotations)}
                            readOnly={!can.editSetlist || !editingItems.has(item.id)}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-6 h-[300px] flex flex-col items-center justify-center">
                        <Music2 className="w-8 h-8 text-gray-400 mb-3" />
                        <p className="text-[16px] font-semibold text-gray-600 mb-1">악보 미리보기</p>
                        <p className="text-[13px] text-gray-400">PDF 파일이 업로드되면 여기에 표시됩니다.</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
        <div className="fixed inset-0 bg-[#0b0914] z-[100] flex flex-col">
          {/* 상단 바 */}
          <div className="bg-[#101222] border-b border-[#202442]">
            <div className="flex items-center justify-between px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0 flex-1">
                <div className="px-2 sm:px-3 py-1 bg-primary-600 rounded-lg flex-shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {currentIndex + 1} / {setlist.setlist_items.length}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 sm:gap-2 min-w-0">
                  <h2 className="text-base sm:text-lg lg:text-[22px] font-bold text-white truncate">
                    {setlist.setlist_items[currentIndex]?.song.title}
                  </h2>
                  {setlist.setlist_items[currentIndex]?.song.artist && (
                    <span className="text-xs sm:text-sm text-gray-400 hidden md:inline truncate">
                      {setlist.setlist_items[currentIndex]?.song.artist}
                    </span>
                  )}
                </div>
                {setlist.setlist_items[currentIndex]?.selected_key && (
                  <div className="px-2 sm:px-3 pb-0.5 sm:pb-1 bg-[#181b34] border border-primary-600 rounded-lg flex-shrink-0">
                    <span className="text-[10px] sm:text-xs font-semibold text-primary-400">
                      {setlist.setlist_items[currentIndex]?.selected_key}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-shrink-0">
                {setlist.created_by === profile?.id && setlist.setlist_items[currentIndex]?.comment && (
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className={`px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 sm:gap-1.5 transition-colors ${
                      showComments
                        ? 'bg-purple-200 text-purple-900'
                        : 'bg-purple-200/50 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    {showComments && (
                      <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-purple-900 rounded-full" />
                    )}
                    <span className="text-[11px] sm:text-[13px] font-bold">멘트</span>
                  </button>
                )}
                <button
                  onClick={closeWorshipMode}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* 메모 영역 - 두 번째 줄 */}
            {setlist.setlist_items[currentIndex]?.note && (
              <div className="px-3 sm:px-6 lg:px-8 pb-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  <div className="px-2 py-0.5 bg-yellow-900/30 border border-yellow-600/50 rounded flex-shrink-0">
                    <span className="text-[10px] sm:text-xs font-semibold text-yellow-400">메모</span>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-300 truncate">
                    {setlist.setlist_items[currentIndex]?.note}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 악보 영역 */}
          <div className="flex-1 overflow-hidden relative bg-[#faf9f0]">
            {/* 이전 클릭 영역 */}
            {currentIndex > 0 && (
              <button
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="absolute left-0 top-0 bottom-0 w-1/4 z-10 cursor-w-resize opacity-0 hover:opacity-100 hover:bg-black/20 transition-opacity flex items-center justify-start pl-8"
              >
                <span className="text-white/50 text-5xl">‹</span>
              </button>
            )}

            {/* 다음 클릭 영역 */}
            {currentIndex < setlist.setlist_items.length - 1 && (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="absolute right-0 top-0 bottom-0 w-1/4 z-10 cursor-e-resize opacity-0 hover:opacity-100 hover:bg-black/20 transition-opacity flex items-center justify-end pr-8"
              >
                <span className="text-white/50 text-5xl">›</span>
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
                  <div className="w-full h-full flex flex-col items-center justify-center gap-5">
                    <div className="w-16 h-16 bg-[#efefde] rounded-full flex items-center justify-center">
                      <Music2 className="w-8 h-8 text-[#64748b]" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-gray-900 mb-2">악보가 여기에 표시됩니다</p>
                    </div>
                  </div>
                );
              }

              const isPdf = displaySheet.file_url?.toLowerCase().endsWith('.pdf');

              if (isPdf) {
                return (
                  <div className="w-full h-full overflow-hidden">
                    <iframe
                      src={displaySheet.file_url}
                      className="w-full h-full"
                      title={`${item.song.title} 악보`}
                    />
                  </div>
                );
              }

              return (
                <div className="w-full h-full overflow-hidden">
                  <WorshipModeSheet
                    key={item.id}
                    imageUrl={displaySheet.file_url}
                    annotations={item.annotations}
                    title={item.song.title}
                  />
                </div>
              );
            })()}

            {/* 멘트 영역 - 악보 위 오버레이 */}
            {setlist.setlist_items[currentIndex]?.comment && setlist.created_by === profile?.id && showComments && (
              <div className="absolute bottom-0 left-0 right-0 bg-[rgba(19,17,34,0.85)] backdrop-blur-lg border-t border-[#1d1a39] px-4 sm:px-6 lg:px-8 py-3 sm:py-4 z-20">
                <div className="flex flex-col gap-1.5 sm:gap-2">
                  <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-purple-200 rounded-md w-fit">
                    <span className="text-[11px] sm:text-[13px] font-bold text-purple-900">멘트</span>
                  </div>
                  <p className="text-sm sm:text-base text-gray-100 leading-relaxed whitespace-pre-wrap">
                    {setlist.setlist_items[currentIndex]?.comment}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
