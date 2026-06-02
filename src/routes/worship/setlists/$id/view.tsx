import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useSetlists } from '@/hooks/useSetlists';
import Button from '@/components/Button';
import DrawingCanvas from '@/components/DrawingCanvas';
import LyricsModal from '@/components/LyricsModal';
import type { SetlistWithItems, SetlistItemWithSong } from '@/types/database';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';

dayjs.locale('ko');

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

  // Create annotation canvas (transparent, drawings only)
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
      const strokes = JSON.parse(annotations);

      for (const stroke of strokes) {
        if (stroke.points.length < 2) continue;

        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (stroke.tool === 'eraser') {
          // Eraser only removes drawings on this canvas, not the image
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
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-end">
          <div className="flex items-center gap-2">
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
                                  <X className="w-4 h-4" />
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
                          {item.song.lyrics && (
                            <button
                              onClick={() => setLyricsItem(item)}
                              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors mx-auto"
                            >
                              <Type className="w-4 h-4" />
                              가사보기
                            </button>
                          )}
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
    </div>
  );
}
