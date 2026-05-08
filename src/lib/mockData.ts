import type { SongWithSheets, SetlistWithItems } from '../types/database';

export const mockSongs: SongWithSheets[] = [
  {
    id: 'song-1',
    title: '주님께 드리는 노래',
    artist: '어노인팅',
    youtube_url: 'https://www.youtube.com/watch?v=example1',
    lyrics: `주님께 드리는 노래
나의 삶을 드리는 예배
이 작은 나의 마음이
주님께 기쁨이 되기를

후렴)
주님 나 주님을 사랑합니다
나의 모든 것 드립니다
오직 주님만 높이며
영원토록 찬양합니다`,
    memo: '느리게 시작해서 점점 빌드업',
    created_by: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    song_sheets: [
      {
        id: 'sheet-1-1',
        song_id: 'song-1',
        music_key: 'G',
        file_url: 'https://example.com/sheet1-g.pdf',
        file_name: '주님께 드리는 노래_G.pdf',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'sheet-1-2',
        song_id: 'song-1',
        music_key: 'A',
        file_url: 'https://example.com/sheet1-a.pdf',
        file_name: '주님께 드리는 노래_A.pdf',
        created_at: '2024-01-01T00:00:00Z',
      },
    ],
  },
  {
    id: 'song-2',
    title: '은혜 (Grace)',
    artist: '마커스워십',
    youtube_url: 'https://www.youtube.com/watch?v=example2',
    lyrics: `나 같은 죄인 살리신
주 은혜 놀라워
잃었던 생명 찾았고
광명을 얻었네

후렴)
은혜 은혜 나를 구원한 은혜
예수 그리스도의 은혜
내 평생에 찬양해`,
    memo: null,
    created_by: null,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    song_sheets: [
      {
        id: 'sheet-2-1',
        song_id: 'song-2',
        music_key: 'D',
        file_url: 'https://example.com/sheet2-d.pdf',
        file_name: '은혜_D.pdf',
        created_at: '2024-01-02T00:00:00Z',
      },
    ],
  },
  {
    id: 'song-3',
    title: '나의 가장 낮은 곳에서',
    artist: '소원 (김윤진)',
    youtube_url: 'https://www.youtube.com/watch?v=example3',
    lyrics: `나의 가장 낮은 곳에서
주님의 발을 적시네
내 눈물로 씻긴
그의 발 앞에

내 모든 것 쏟아 드리며
향유 옥합 깨뜨리네
내 향기로 가득 채워지는
주님의 발 앞에

후렴)
주님 내가 가진 가장 귀한 것
주님께 드립니다
나의 예수 나의 모든 것
주님께 드립니다`,
    memo: '간주 때 싱어 솔로',
    created_by: null,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    song_sheets: [
      {
        id: 'sheet-3-1',
        song_id: 'song-3',
        music_key: 'E',
        file_url: 'https://example.com/sheet3-e.pdf',
        file_name: '나의가장낮은곳에서_E.pdf',
        created_at: '2024-01-03T00:00:00Z',
      },
      {
        id: 'sheet-3-2',
        song_id: 'song-3',
        music_key: 'F',
        file_url: 'https://example.com/sheet3-f.pdf',
        file_name: '나의가장낮은곳에서_F.pdf',
        created_at: '2024-01-03T00:00:00Z',
      },
    ],
  },
  {
    id: 'song-4',
    title: '예수가 우리를 부르는 소리',
    artist: '전통찬송',
    youtube_url: null,
    lyrics: `예수가 우리를 부르는 소리
복된 소식 알려주네
어서 가자 저 천국
어서 가자 저 천국

후렴)
어서 가자 저 천국
어서 가자 저 천국
주 예수를 믿고서
어서 가자 저 천국`,
    memo: null,
    created_by: null,
    created_at: '2024-01-04T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z',
    song_sheets: [],
  },
  {
    id: 'song-5',
    title: '내 평생 소원 (I Love You Lord)',
    artist: 'Hillsong',
    youtube_url: 'https://www.youtube.com/watch?v=example5',
    lyrics: `내 평생 소원 이 세상보다
주님을 더욱 사랑하는 것
주님을 더욱 신뢰하는 것
주 안에서 평안을 누리는 것

후렴)
I love You Lord
I worship You
내 삶의 이유 되신 주님
내 모든 것 다 바쳐
찬양합니다`,
    memo: '영어 버전과 한글 버전 번갈아 부르기',
    created_by: null,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
    song_sheets: [
      {
        id: 'sheet-5-1',
        song_id: 'song-5',
        music_key: 'C',
        file_url: 'https://example.com/sheet5-c.pdf',
        file_name: '내평생소원_C.pdf',
        created_at: '2024-01-05T00:00:00Z',
      },
    ],
  },
];

export const mockSetlists: SetlistWithItems[] = [
  {
    id: 'setlist-1',
    title: '2024-01-07 주일 1부',
    date: '2024-01-07',
    service_type: '주일 1부',
    description: '신년 첫 예배',
    created_by: null,
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-05T00:00:00Z',
    setlist_items: [
      {
        id: 'item-1-1',
        setlist_id: 'setlist-1',
        song_id: 'song-1',
        position: 1,
        selected_key: 'G',
        note: '인트로 길게',
        annotations: null,
        created_at: '2024-01-05T00:00:00Z',
        song: mockSongs[0],
      },
      {
        id: 'item-1-2',
        setlist_id: 'setlist-1',
        song_id: 'song-2',
        position: 2,
        selected_key: 'D',
        note: null,
        annotations: null,
        created_at: '2024-01-05T00:00:00Z',
        song: mockSongs[1],
      },
      {
        id: 'item-1-3',
        setlist_id: 'setlist-1',
        song_id: 'song-3',
        position: 3,
        selected_key: 'E',
        note: '마지막 리프레인 반복',
        annotations: null,
        created_at: '2024-01-05T00:00:00Z',
        song: mockSongs[2],
      },
    ],
  },
  {
    id: 'setlist-2',
    title: '2024-01-14 주일 2부',
    date: '2024-01-14',
    service_type: '주일 2부',
    description: null,
    created_by: null,
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-12T00:00:00Z',
    setlist_items: [
      {
        id: 'item-2-1',
        setlist_id: 'setlist-2',
        song_id: 'song-5',
        position: 1,
        selected_key: 'C',
        note: null,
        annotations: null,
        created_at: '2024-01-12T00:00:00Z',
        song: mockSongs[4],
      },
      {
        id: 'item-2-2',
        setlist_id: 'setlist-2',
        song_id: 'song-1',
        position: 2,
        selected_key: 'A',
        note: '키를 A로 변경',
        annotations: null,
        created_at: '2024-01-12T00:00:00Z',
        song: mockSongs[0],
      },
    ],
  },
  {
    id: 'setlist-3',
    title: '2024-01-10 수요예배',
    date: '2024-01-10',
    service_type: '수요예배',
    description: '기도회 특송',
    created_by: null,
    created_at: '2024-01-08T00:00:00Z',
    updated_at: '2024-01-08T00:00:00Z',
    setlist_items: [
      {
        id: 'item-3-1',
        setlist_id: 'setlist-3',
        song_id: 'song-3',
        position: 1,
        selected_key: 'F',
        note: null,
        annotations: null,
        created_at: '2024-01-08T00:00:00Z',
        song: mockSongs[2],
      },
    ],
  },
];
