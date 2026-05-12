import { useState, useRef, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Camera,
  User,
  Mail,
  Calendar,
  MapPin,
  Church as ChurchIcon,
  Building2,
  Save,
  Search,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChurches } from '@/hooks/useChurches';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { REGIONS, DENOMINATIONS, type Church } from '@/types/database';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/mypage/')({
  component: MyPage,
});

function MyPage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuth();
  const { churches, searchChurches, createChurch, getChurchById } = useChurches();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [region, setRegion] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // 프로필 데이터 로드시 상태 업데이트
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setBirthDate(profile.birth_date || '');
      setRegion(profile.region || '');
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  // 교회 관련 상태
  const [selectedChurch, setSelectedChurch] = useState<Church | null>(null);
  const [churchSearchQuery, setChurchSearchQuery] = useState('');
  const [churchSearchResults, setChurchSearchResults] = useState<Church[]>([]);
  const [showChurchDropdown, setShowChurchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // 교회 추가 모달
  const [showAddChurchModal, setShowAddChurchModal] = useState(false);
  const [newChurchName, setNewChurchName] = useState('');
  const [newChurchAddress, setNewChurchAddress] = useState('');
  const [newChurchDenomination, setNewChurchDenomination] = useState('');
  const [addingChurch, setAddingChurch] = useState(false);

  // 초기 교회 정보 로드
  useEffect(() => {
    if (profile?.church_id) {
      getChurchById(profile.church_id).then((church) => {
        if (church) {
          setSelectedChurch(church);
          setChurchSearchQuery(church.name);
        }
      });
    }
  }, [profile?.church_id, getChurchById]);

  // 교회 검색
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (churchSearchQuery.trim() && showChurchDropdown) {
        setIsSearching(true);
        const results = await searchChurches(churchSearchQuery);
        setChurchSearchResults(results);
        setIsSearching(false);
      } else {
        setChurchSearchResults(churches.slice(0, 10));
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [churchSearchQuery, showChurchDropdown, churches, searchChurches]);

  const handleChurchSelect = (church: Church) => {
    setSelectedChurch(church);
    setChurchSearchQuery(church.name);
    setShowChurchDropdown(false);
  };

  const handleClearChurch = () => {
    setSelectedChurch(null);
    setChurchSearchQuery('');
  };

  const handleAddChurch = async () => {
    if (!newChurchName.trim()) {
      toast.error('교회 이름을 입력해주세요.');
      return;
    }

    setAddingChurch(true);
    try {
      const newChurch = await createChurch({
        name: newChurchName.trim(),
        address: newChurchAddress.trim() || null,
        denomination: newChurchDenomination || null,
      });

      if (newChurch) {
        setSelectedChurch(newChurch);
        setChurchSearchQuery(newChurch.name);
        toast.success('교회가 추가되었습니다.');
        setShowAddChurchModal(false);
        setNewChurchName('');
        setNewChurchAddress('');
        setNewChurchDenomination('');
      }
    } catch {
      toast.error('교회 추가에 실패했습니다.');
    } finally {
      setAddingChurch(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('파일 크기는 5MB 이하여야 합니다.');
      return;
    }

    // 프로필 사진은 나중에 Storage 연동 후 저장
    const reader = new FileReader();
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: name || null,
        birth_date: birthDate || null,
        region: region || null,
        church_id: selectedChurch?.id || null,
      });
      toast.success('프로필이 저장되었습니다.');
    } catch (error) {
      console.error('Profile save error:', error);
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">돌아가기</span>
          </button>
          <h1 className="font-semibold text-gray-900">마이페이지</h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* 프로필 이미지 섹션 */}
          <div className="p-6 lg:p-8 border-b border-gray-200 flex flex-col items-center">
            <div className="relative">
              <button
                onClick={handleAvatarClick}
                className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg hover:opacity-90 transition-opacity"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="프로필"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12 text-primary-600" />
                )}
              </button>
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-md hover:bg-primary-700 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <p className="mt-3 text-sm text-gray-500">클릭하여 프로필 사진 변경</p>
          </div>

          {/* 프로필 정보 폼 */}
          <div className="p-6 lg:p-8 space-y-5">
            {/* 이름 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* 이메일 (읽기 전용) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4" />
                이메일
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* 생년월일 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4" />
                생년월일
              </label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* 거주지역 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4" />
                거주지역
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">선택하세요</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* 교회 선택 */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <ChurchIcon className="w-4 h-4" />
                출석 교회
              </label>
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={churchSearchQuery}
                    onChange={(e) => {
                      setChurchSearchQuery(e.target.value);
                      setShowChurchDropdown(true);
                      if (!e.target.value) {
                        setSelectedChurch(null);
                      }
                    }}
                    onFocus={() => setShowChurchDropdown(true)}
                    placeholder="교회를 검색하세요"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  {selectedChurch && (
                    <button
                      onClick={handleClearChurch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* 검색 드롭다운 */}
                {showChurchDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {isSearching ? (
                      <div className="p-3 text-center text-gray-500">검색 중...</div>
                    ) : churchSearchResults.length > 0 ? (
                      <>
                        {churchSearchResults.map((church) => (
                          <button
                            key={church.id}
                            onClick={() => handleChurchSelect(church)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <div className="font-medium text-gray-900">{church.name}</div>
                              {church.denomination && (
                                <div className="text-xs text-gray-500">{church.denomination}</div>
                              )}
                              {church.address && (
                                <div className="text-xs text-gray-400">{church.address}</div>
                              )}
                            </div>
                            {selectedChurch?.id === church.id && (
                              <Check className="w-4 h-4 text-primary-600" />
                            )}
                          </button>
                        ))}
                      </>
                    ) : churchSearchQuery ? (
                      <div className="p-3 text-center text-gray-500">
                        검색 결과가 없습니다
                      </div>
                    ) : null}

                    {/* 교회 추가 버튼 */}
                    <button
                      onClick={() => {
                        setShowChurchDropdown(false);
                        setNewChurchName(churchSearchQuery);
                        setShowAddChurchModal(true);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-primary-50 flex items-center gap-2 text-primary-600 border-t border-gray-200"
                    >
                      <Plus className="w-4 h-4" />
                      <span>새 교회 추가하기</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 선택된 교회 정보 표시 */}
              {selectedChurch && (
                <div className="mt-2 p-3 bg-primary-50 rounded-lg">
                  <div className="font-medium text-primary-900">{selectedChurch.name}</div>
                  {selectedChurch.denomination && (
                    <div className="text-sm text-primary-700">{selectedChurch.denomination}</div>
                  )}
                  {selectedChurch.address && (
                    <div className="text-sm text-primary-600">{selectedChurch.address}</div>
                  )}
                </div>
              )}
            </div>

            {/* 교단 (선택된 교회에서 자동 표시) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4" />
                교단
              </label>
              <input
                type="text"
                value={selectedChurch?.denomination || '교회를 선택하면 자동으로 표시됩니다'}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* 저장 버튼 */}
            <div className="pt-4">
              <Button
                onClick={handleSave}
                loading={saving}
                fullWidth
                icon={!saving ? <Save className="w-4 h-4" /> : undefined}
              >
                {saving ? '저장 중...' : '저장하기'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 드롭다운 외부 클릭시 닫기 */}
      {showChurchDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowChurchDropdown(false)}
        />
      )}

      {/* 교회 추가 모달 */}
      <Modal
        isOpen={showAddChurchModal}
        onClose={() => setShowAddChurchModal(false)}
        title="새 교회 추가"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              교회 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newChurchName}
              onChange={(e) => setNewChurchName(e.target.value)}
              placeholder="교회 이름을 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주소
            </label>
            <input
              type="text"
              value={newChurchAddress}
              onChange={(e) => setNewChurchAddress(e.target.value)}
              placeholder="교회 주소를 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              교단
            </label>
            <select
              value={newChurchDenomination}
              onChange={(e) => setNewChurchDenomination(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">선택하세요</option>
              {DENOMINATIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowAddChurchModal(false)}
              fullWidth
            >
              취소
            </Button>
            <Button
              onClick={handleAddChurch}
              loading={addingChurch}
              fullWidth
            >
              추가
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
