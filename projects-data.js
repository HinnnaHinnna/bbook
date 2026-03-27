/*
  ============================================
  책등 데이터 파일
  ============================================

  이번 버전의 핵심:
  1. 책등은 왼쪽 -> 오른쪽으로 일렬 배치
  2. 실제 책등 세로/가로(mm) 비율 반영
  3. 시작 위치를 더 가깝게 조정


*/

window.EXHIBITION_DATA = {
  settings: {
    spawnPosition: { x: -110, y: 0, z: 4 },

    desktopAcceleration: 45,
    mobileMoveSpeed: 3.2,

    rowZ: -9,
    mmToWorld: 0.06,
    gapWorld: 3.6,

    rowBaseY: 0.02,
    iconOffsetY: 0.22,
    minHitWidth: 0.34,

    worldPaddingX: 4,
    worldMinZ: -18,
    worldMaxZ: 8,

    /*
      바닥 전체 크기
      여기 숫자를 직접 바꾸면 돼.
      width = 좌우 길이
      height = 앞뒤 길이
    */
    floorWidth: 420,
    floorHeight: 50,
    /*
        바닥 가장자리에서 얼마나 안쪽까지 이동 가능하게 할지
        숫자가 클수록 가장자리 가까이 못 감
      */
    floorEdgePadding: 3,
    /*
      카메라에서 얼마나 멀어지면 서서히 사라질지
      - fadeStartDistance: 여기부터 투명해지기 시작
      - fadeEndDistance: 여기쯤 되면 거의 안 보임
    */
    fadeStartDistance: 18,
    fadeEndDistance: 36,

    /*
      완전히 안 보이게 할지,
      아주 희미하게 남길지 정하는 최소 opacity
      0이면 완전히 사라짐
    */
    fadeMinOpacity: 0
  },

  items: [
    {
      id: "work-01",
      title: "뉴노멀",
      description: "2022",
      image: "assets/images/20_뉴노멀.webp",
      audio: "assets/audio/20_뉴노멀.mp3",
      spineHeightMm: 180,
      spineWidthMm: 21
    },
    {
      id: "work-02",
      title: "디스이즈네버디스이즈네버댓",
      description: "2022",
      image: "assets/images/20_디스이즈네버디스이즈네버댓.webp",
      audio: "assets/audio/20_디스이즈네버디스이즈네버댓.mp3",
      spineHeightMm: 248,
      spineWidthMm: 33
    },
    {
      id: "work-03",
      title: "디에센셜조지오엘",
      description: "2022",
      image: "assets/images/20_디에센셜조지오엘.webp",
      audio: "assets/audio/20_디에센셜조지오엘.mp3",
      spineHeightMm: 188,
      spineWidthMm: 31
    },
    {
      id: "work-04",
      title: "모눈지우개",
      description: "2022",
      image: "assets/images/20_모눈지우개.webp",
      audio: "assets/audio/20_모눈지우개.mp3",
      spineHeightMm: 207,
      spineWidthMm: 10
    },
    {
      id: "work-05",
      title: "시와산책",
      description: "2022",
      image: "assets/images/20_시와산책.webp",
      audio: "assets/audio/20_시와산책.mp3",
      spineHeightMm: 200,
      spineWidthMm: 15
    },
    {
      id: "work-06",
      title: "IN THE SPOTLIGHT: 아리랑예술단",
      description: "2022",
      image: "assets/images/20_아리랑예술단.webp",
      audio: "assets/audio/20_아리랑예술단.mp3",
      spineHeightMm: 245,
      spineWidthMm: 19
    },
    {
      id: "work-07",
      title: "혁명노트",
      description: "2021",
      image: "assets/images/21_블루노트.webp",
      audio: "assets/audio/21_블루노트.mp3",
      spineHeightMm: 188,
      spineWidthMm: 20
    },
    {
      id: "work-08",
      title: "기록으로돌아보기",
      description: "2021",
      image: "assets/images/21_기록으로돌아보기.webp",
      audio: "assets/audio/21_기록으로돌아보기.mp3",
      spineHeightMm: 205,
      spineWidthMm: 30
    },
    {
      id: "work-09",
      title: "블루노트",
      description: "2021",
      image: "assets/images/21_블루노트.webp",
      audio: "assets/audio/21_블루노트.mp3",
      spineHeightMm: 205,
      spineWidthMm: 19
    },
    {
      id: "work-10",
      title: "아웃 오브 (콘)텍스트",
      description: "2021",
      image: "assets/images/21_아웃 오브 (콘)텍스트.webp",
      audio: "assets/audio/21_아웃-오브-(콘)텍스트.mp3",
      spineHeightMm: 257,
      spineWidthMm: 20
    },
    {
      id: "work-11",
      title: "작업의 방식",
      description: "2022",
      image: "assets/images/22_작업의 방식.webp",
      audio: "assets/audio/22_작업의-방식.mp3",
      spineHeightMm: 280,
      spineWidthMm: 10
    },
    {
      id: "work-12",
      title: "고수의 도구",
      description: "2022",
      image: "assets/images/22_고수의 도구.webp",
      audio: "assets/audio/22_고수의-도구.mp3",
      spineHeightMm: 180,
      spineWidthMm: 11
    },
    {
      id: "work-13",
      title: "곁에 있어",
      description: "2022",
      image: "assets/images/22_곁에 있어.webp",
      audio: "assets/audio/22_곁에-있어.mp3",
      spineHeightMm: 180,
      spineWidthMm: 11
    },
    {
      id: "work-14",
      title: "김군을 찾아서",
      description: "2022",
      image: "assets/images/22_김군을 찾아서.webp",
      audio: "assets/audio/22_김군을-찾아서.mp3",
      spineHeightMm: 198,
      spineWidthMm: 15
    },
    {
      id: "work-15",
      title: "미얀마 8요일력",
      description: "2022",
      image: "assets/images/22_미얀마 8요일력.webp",
      audio: "assets/audio/22_미얀마-8요일력1.mp3",
      spineHeightMm: 234,
      spineWidthMm: 9
    },
    {
      id: "work-16",
      title: "민간인 통제구역",
      description: "2022",
      image: "assets/images/22_민간인 통제구역1 복사.webp",
      audio: "assets/audio/22_민간인-통제구역.mp3",
      spineHeightMm: 217,
      spineWidthMm: 35
    },
    {
      id: "work-17",
      title: "셰익스피어 전집",
      description: "2022",
      image: "assets/images/22_셰익스피어 전집.webp",
      audio: "assets/audio/22_셰익스피어-전집.mp3",
      spineHeightMm: 290,
      spineWidthMm: 80
    },
    {
      id: "work-18",
      title: "서문1.png",
      image: "assets/images/서문1.png",
      spineHeightMm: 11.2,
      spineWidthMm: 475,
      xOffset: -89,
      yOffset: 0,
      zOffset: 10,
      isDecorative: true
    },
    {
      id: "work-19",
      title: "서문2.png",
      image: "assets/images/서문2.png",
      spineHeightMm: 11.2,
      spineWidthMm: 400,
      xOffset: -99.95,
      yOffset: 0,
      zOffset: 10,
      isDecorative: true
    },
    {
      id: "work-20",
      title: "서문3.png",
      image: "assets/images/서문3.png",
      spineHeightMm: 11.2,
      spineWidthMm: 485,
      xOffset: -99.9,
      yOffset: 0,
      zOffset: 10,
      isDecorative: true
    },
    {
      id: "work-21",
      title: "서문4.png",
      image: "assets/images/서문4.png",
      spineHeightMm: 11.2,
      spineWidthMm: 363,
      xOffset: -99.85,
      yOffset: 0,
      zOffset: 10,
      isDecorative: true
    },
    {
      id: "work-22",
      title: "서문5.png",
      image: "assets/images/서문5.png",
      spineHeightMm: 11.2,
      spineWidthMm: 180,
      xOffset: -99.8,
      yOffset: 0,
      zOffset: 10,
      isDecorative: true
    }

  ]
}; 
