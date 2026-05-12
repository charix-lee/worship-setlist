import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  User,
  Mail,
  Church as ChurchIcon,
  Building2,
  MapPin,
  Search,
  Plus,
  Check,
  X,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChurches } from '@/hooks/useChurches';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { REGIONS, DENOMINATIONS, type Church } from '@/types/database';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/onboarding/')({
  component: OnboardingPage,
});

function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuth();
  const { churches, searchChurches, createChurch } = useChurches();

  const [name, setName] = useState(profile?.name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [region, setRegion] = useState(profile?.region || '');
  const [saving, setSaving] = useState(false);

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

  // 이미 온보딩 완료된 경우 홈으로
  useEffect(() => {
    if (profile?.is_onboarded) {
      navigate({ to: '/' });
    }
  }, [profile?.is_onboarded, navigate]);

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

  const handleComplete = async () => {
    if (!name.trim()) {
      toast.error('이름을 입력해주세요.');
      return;
    }
    if (!email.trim()) {
      toast.error('이메일을 입력해주세요.');
      return;
    }
    if (!selectedChurch) {
      toast.error('출석 교회를 선택해주세요.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        region: region || null,
        church_id: selectedChurch.id,
        is_onboarded: true,
      });
      toast.success('환영합니다!');
      navigate({ to: '/' });
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <ChurchIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">환영합니다!</h1>
          <p className="text-gray-600 mt-1">서비스 이용을 위해 정보를 입력해주세요</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-5">
          {/* 프로필 이미지 (카카오에서 가져온 것) */}
          {profile?.avatar_url && (
            <div className="flex justify-center mb-4">
              <img
                src={profile.avatar_url}
                alt="프로필"
                className="w-20 h-20 rounded-full border-4 border-primary-100"
              />
            </div>
          )}

          {/* 이름 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4" />
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* 이메일 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4" />
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
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
              출석 교회 <span className="text-red-500">*</span>
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
              </div>
            )}
          </div>

          {/* 교단 (선택된 교회에서 자동 표시) */}
          {selectedChurch?.denomination && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Building2 className="w-4 h-4" />
                교단
              </label>
              <input
                type="text"
                value={selectedChurch.denomination}
                disabled
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>
          )}

          {/* 완료 버튼 */}
          <div className="pt-4">
            <Button
              onClick={handleComplete}
              loading={saving}
              fullWidth
              icon={!saving ? <ArrowRight className="w-4 h-4" /> : undefined}
            >
              {saving ? '저장 중...' : '시작하기'}
            </Button>
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
