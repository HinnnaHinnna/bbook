document.addEventListener("DOMContentLoaded", () => {
  const data = window.EXHIBITION_DATA;

  if (!data || !Array.isArray(data.items)) {
    console.error("EXHIBITION_DATA가 없거나 items 배열이 없습니다.");
    return;
  }

  /* =========================
     DOM 참조
  ========================= */
  const scene = document.getElementById("scene");
  const dynamicAssets = document.getElementById("dynamicAssets");
  const galleryRoot = document.getElementById("galleryRoot");
  const rig = document.getElementById("cameraRig");
  const camera = document.getElementById("camera");
  const floorPlane = document.getElementById("floorPlane");

  const introOverlay = document.getElementById("introOverlay");
  const introScratchBox = document.getElementById("introScratchBox");
  const introPosterImage = document.getElementById("introPosterImage");
  const scratchCanvas = document.getElementById("scratchCanvas");

  const guideText = document.getElementById("guideText");

  const resetPositionButton = document.getElementById("resetPositionButton");

  const mobileControls = document.getElementById("mobileControls");
  const moveButtons = document.querySelectorAll(".move-btn");

  /* =========================
     설정
  ========================= */
  const settings = data.settings || {};

  const spawnPosition = settings.spawnPosition || { x: -10, y: 0, z: -3 };
  const rowZ = settings.rowZ ?? -10.5;
  const mmToWorld = settings.mmToWorld ?? 0.016;
  const gapWorld = settings.gapWorld ?? 0.65;
  const rowBaseY = settings.rowBaseY ?? 0.02;
  const iconOffsetY = settings.iconOffsetY ?? 0.22;
  const minHitWidth = settings.minHitWidth ?? 0.34;

  const desktopAcceleration = settings.desktopAcceleration ?? 45;
  const mobileMoveSpeed = settings.mobileMoveSpeed ?? 3.2;

  const worldPaddingX = settings.worldPaddingX ?? 4;
  const worldMinZ = settings.worldMinZ ?? -18;
  const worldMaxZ = settings.worldMaxZ ?? 8;

  const floorWidth = settings.floorWidth ?? 240;
  const floorHeight = settings.floorHeight ?? 100;
  const floorEdgePadding = settings.floorEdgePadding ?? 3;

  const fadeStartDistance = settings.fadeStartDistance ?? 18;
  const fadeEndDistance = settings.fadeEndDistance ?? 36;
  const fadeMinOpacity = settings.fadeMinOpacity ?? 0;
  /*
    시작 화면 / 3D 책등 덮개가 함께 쓰는 공용 설정값
    style.css의 :root 변수에서 읽어온다.
  */
  const rootStyles = getComputedStyle(document.documentElement);

  const scratchOverlayColor =
    rootStyles.getPropertyValue("--scratch-overlay-color").trim() || "#ff6ae6";

  const scratchBrushSize =
    Number.parseFloat(
      rootStyles.getPropertyValue("--scratch-brush-size")
    ) || 42;

  const scratchBrushRadius = scratchBrushSize / 2;

  /*
    3D 책등 덮개 캔버스 해상도 배율
    너무 낮으면 긁은 자국이 거칠게 보이고,
    너무 높으면 성능이 무거워질 수 있다.
  */
  const scratchTextureScale = 4;

  /* =========================
     상태
  ========================= */
  const state = {
    started: false,

    selectedId: null,
    currentPlayingId: null,

    audioMap: new Map(),
    audioStateMap: new Map(),

    iconTextMap: new Map(),
    iconActivatedMap: new Map(),

    /*
      거리 페이드용
    */
    imagePlaneMap: new Map(),

    /*
  3D 책등 덮개 캔버스 / 텍스처 관리
*/
    scratchLayerMap: new Map(),
    scratchLastPoint: null,

    itemMap: new Map(),

    isLeftMouseDown: false,
    isRightDragging: false,
    lastRightDragX: 0,
    lastRightDragY: 0,
    scratchItemId: null,

    /*
      모바일 문지르기 / 두 손가락 시점 이동 상태
    */
    mobileScratchTouchId: null,
    mobileScratchStartX: 0,
    mobileScratchStartY: 0,
    mobileScratchMoved: false,

    mobileLookTouchIds: [],
    mobileLookLastCenterX: 0,
    mobileLookLastCenterY: 0,

    move: {
      forward: false,
      backward: false,
      left: false,
      right: false
    },

    isTouchDevice:
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window,

    worldBounds: {
      minX: -12,
      maxX: 12,
      minZ: worldMinZ,
      maxZ: worldMaxZ
    }
  };

  /* =========================
     상태 아이콘
  ========================= */
  const AUDIO_ICONS = {
    stopped: "STOP",
    playing: "PLAY",
    paused: "PAUSE"
  };

  const AUDIO_LABELS = {
    stopped: "정지 상태",
    playing: "재생 중",
    paused: "일시정지 상태"
  };

  /* =========================
     초기 세팅
  ========================= */
  rig.setAttribute(
    "wasd-controls",
    `acceleration: ${desktopAcceleration}; fly: false`
  );

  camera.setAttribute(
    "look-controls",
    "mouseEnabled: false; touchEnabled: false; pointerLockEnabled: false; magicWindowTrackingEnabled: false"
  );

  if (!state.isTouchDevice) {
    mobileControls.style.display = "none";
  }

  if (scene.hasLoaded) {
    buildGallery();
  } else {
    scene.addEventListener("loaded", buildGallery, { once: true });
  }

  /* =========================
     이벤트
  ========================= */
  function enterSpace() {
    /*
      시작 화면에서 남아 있던 입력 상태를 먼저 초기화
    */
    state.isLeftMouseDown = false;
    state.isRightDragging = false;
    state.mobileScratchTouchId = null;
    state.mobileScratchMoved = false;

    pauseScratchPlayback();
    resetScratchStroke();
    resetAllScratchLayers();

    state.started = true;
    introOverlay.classList.add("is-hidden");

    guideText.innerHTML = state.isTouchDevice
      ? "화면 오른쪽 하단 화살표 버튼으로 이동하세요. 손가락 두개로 드래그하면 시점이 바뀝니다. 손가락 한개로 책등을 긁을 때만 서평을 들을 수 있습니다."
      : "W A S D 또는 화살표 키로 이동하세요. 마우스 오른쪽 버튼을 누르면서 드래그하면 시점이 바뀝니다. 마우스 왼쪽 버튼을 누르면서 책등을 긁을 때만 서평을 들을 수 있습니다.";
  }

  setupScratchIntro();
  setupDesktopInteraction();
  setupMobileTouchInteraction();

  resetPositionButton.addEventListener("click", () => {
    resetPlayerPosition();
  });

  setupMobileMoveButtons();
  startMobileMovementLoop();

  window.addEventListener(
    "keydown",
    (event) => {
      const tagName = document.activeElement?.tagName?.toLowerCase();

      const isTypingField =
        tagName === "input" ||
        tagName === "textarea" ||
        document.activeElement?.isContentEditable;

      if (isTypingField) return;

      const blockedKeys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        " ",
        "f",
        "F"
      ];

      if (blockedKeys.includes(event.key)) {
        event.preventDefault();
      }
    },
    { passive: false }
  );

  window.addEventListener("blur", () => {
    stopAllMovement();
    resetMobileTouchState();
    pauseScratchPlayback();
    document.body.classList.remove("is-view-dragging");
    document.body.classList.remove("is-scratching");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopAllMovement();
      resetMobileTouchState();
      pauseScratchPlayback();
      document.body.classList.remove("is-view-dragging");
      document.body.classList.remove("is-scratching");
    }
  });

  /* =========================
     갤러리 생성
  ========================= */
  function buildGallery() {
    galleryRoot.innerHTML = "";
    dynamicAssets.innerHTML = "";
    state.scratchLayerMap.clear();

    const preparedItems = data.items.map((item, index) =>
      prepareItem(item, index)
    );

    preparedItems.forEach((item) => {
      state.itemMap.set(item.id, item);
      state.audioStateMap.set(item.id, "stopped");
      state.iconActivatedMap.set(item.id, false);

      const assetId = createImageAsset(item);

      const group = document.createElement("a-entity");
      group.setAttribute(
        "position",
        `${item.position.x} ${item.position.y} ${item.position.z}`
      );
      group.setAttribute(
        "rotation",
        `${item.rotation.x} ${item.rotation.y} ${item.rotation.z}`
      );

      const visualGroup = document.createElement("a-entity");

      const imagePlane = document.createElement("a-plane");
      imagePlane.setAttribute("width", item.displayWidth);
      imagePlane.setAttribute("height", item.displayHeight);
      imagePlane.setAttribute("position", "0 0 0");
      imagePlane.setAttribute(
        "material",
        `shader: flat; src: #${assetId}; transparent: true; side: double; opacity: 1`
      );

      state.imagePlaneMap.set(item.id, imagePlane);

      /*
        책등 시각 요소는 visualGroup 안에 넣음
      */
      visualGroup.appendChild(imagePlane);

      /*
        일반 책등에는 시작 화면과 같은 단면 덮개를
        한 장 더 올린다.
        이 덮개를 긁으면 아래 이미지가 드러난다.
      */
      if (!item.isDecorative) {
        const scratchLayerId = createScratchLayer(item);

        const scratchPlane = document.createElement("a-plane");
        scratchPlane.setAttribute("width", item.displayWidth);
        scratchPlane.setAttribute("height", item.displayHeight);
        scratchPlane.setAttribute("position", "0 0 0.01");
        scratchPlane.setAttribute(
          "material",
          `shader: flat; src: #${scratchLayerId}; transparent: true; alphaTest: 0.02; side: double; opacity: 1`
        );

        visualGroup.appendChild(scratchPlane);

        const scratchLayer = state.scratchLayerMap.get(item.id);
        if (scratchLayer) {
          scratchLayer.overlayPlane = scratchPlane;
        }
      }

      /*
        장식 이미지(work-18 ~ work-22)는
        클릭 / hover / 상태아이콘 / 오디오 기능 없이
        그냥 이미지로만 사용
      */
      if (!item.isDecorative) {
        /*
          클릭 판정용 투명 hitbox
        */
        const hitbox = document.createElement("a-plane");
        hitbox.setAttribute("width", item.hitboxWidth);
        hitbox.setAttribute("height", item.displayHeight + 0.2);
        hitbox.setAttribute("position", "0 0 0.02");
        hitbox.setAttribute("class", "clickable");
        hitbox.setAttribute(
          "material",
          "shader: flat; transparent: true; opacity: 0; side: double"
        );

        /*
          상태 아이콘
          처음에는 보이지 않음
        */
        const iconText = document.createElement("a-text");
        iconText.setAttribute("value", "");
        iconText.setAttribute("align", "center");
        iconText.setAttribute("anchor", "center");
        iconText.setAttribute("baseline", "bottom");
        iconText.setAttribute("color", "#ff6ae6");

        /*
          아이콘 크기는 항상 고정
        */
        iconText.setAttribute("width", "6");
        iconText.setAttribute("scale", "1 1 1");

        /*
          책등 이미지 맨 위쪽 + 가운데 정렬
        */
        const iconX = 0;
        const iconY = (item.displayHeight / 2) + 0.06;
        const iconZ = 0.12;

        iconText.setAttribute("position", `${iconX} ${iconY} ${iconZ}`);
        iconText.setAttribute("visible", "false");

        state.iconTextMap.set(item.id, iconText);

        hitbox.addEventListener("mouseenter", async () => {
          /*
            hover 시 크기 변화 없음
            단, 왼쪽 버튼을 누른 채 들어오면 바로 재생 시작
          */
          if (!state.isTouchDevice && state.isLeftMouseDown) {
            await startScratchPlayback(item);
          }
        });

        hitbox.addEventListener("mousedown", async (event) => {
          if (state.isTouchDevice) return;

          const button =
            event?.detail?.mouseEvent?.button ??
            event?.button ??
            0;

          if (button !== 0) return;

          state.isLeftMouseDown = true;
          resetScratchStroke();

          const clientX =
            event?.detail?.mouseEvent?.clientX ?? event.clientX;
          const clientY =
            event?.detail?.mouseEvent?.clientY ?? event.clientY;

          const scratchedItem = handleScratchAtClientPoint(clientX, clientY);

          await startScratchPlayback(scratchedItem || item);
        });

        item.hitboxRef = hitbox;

        visualGroup.appendChild(hitbox);
        group.appendChild(iconText);
      }

      group.appendChild(visualGroup);

      galleryRoot.appendChild(group);
      item.groupRef = group;
      item.visualRef = visualGroup;
    });

    updateWorldBounds(preparedItems);

    /*
      바닥 크기 먼저 적용
    */
    applyFloorSize();

    /*
      이동 범위를 책등이 아니라
      실제 바닥 크기에 맞춰 다시 계산
    */
    updateBoundsFromFloor();

    /*
      바닥 범위가 계산된 뒤 시작 위치 적용
    */
    setRigPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);

    updateDistanceFade();
  }

  /* =========================
     아이템 준비
  ========================= */
  function prepareItem(item, index) {
    const displayHeight = item.spineHeightMm * mmToWorld;
    const displayWidth = item.spineWidthMm * mmToWorld;

    return {
      id: item.id || `item-${index + 1}`,
      title: item.title || `책등 ${index + 1}`,
      description: item.description || "",
      image: item.image || "",
      audio: item.audio || "",
      spineHeightMm: item.spineHeightMm,
      spineWidthMm: item.spineWidthMm,
      displayHeight,
      displayWidth,
      hitboxWidth: Math.max(displayWidth + 0.16, minHitWidth),

      position: { x: 0, y: 0, z: rowZ },

      rotation: {
        x: item.rotationX ?? 0,
        y: item.rotationY ?? 0,
        z: item.rotationZ ?? 0
      },

      xOffset: item.xOffset ?? 0,
      yOffset: item.yOffset ?? 0,
      zOffset: item.zOffset ?? 0,

      isDecorative: item.isDecorative ?? false,

      groupRef: null,
      visualRef: null,
      hitboxRef: null
    };
  }

  /* =========================
     왼쪽 -> 오른쪽 일렬 배치
  ========================= */
  function updateWorldBounds(items) {
    if (items.length === 0) return;

    const totalWidth =
      items.reduce((sum, item) => sum + item.displayWidth, 0) +
      gapWorld * Math.max(items.length - 1, 0);

    let cursorX = -totalWidth / 2;

    items.forEach((item) => {
      /*
        기본 자동 일렬 배치 좌표
      */
      const baseX = cursorX + item.displayWidth / 2;
      const baseY = item.displayHeight / 2 + rowBaseY;
      const baseZ = rowZ;

      /*
        projects-data.js에 적은 개별 오프셋 반영
      */
      const finalX = baseX + item.xOffset;
      const finalY = baseY + item.yOffset;
      const finalZ = baseZ + item.zOffset;

      item.position = {
        x: finalX,
        y: finalY,
        z: finalZ
      };

      if (item.groupRef) {
        item.groupRef.setAttribute("position", `${finalX} ${finalY} ${finalZ}`);
        item.groupRef.setAttribute(
          "rotation",
          `${item.rotation.x} ${item.rotation.y} ${item.rotation.z}`
        );
      }

      cursorX += item.displayWidth + gapWorld;
    });

    const xs = items.map((item) => item.position.x);
    const leftMost = Math.min(...xs);
    const rightMost = Math.max(...xs);

    state.worldBounds.minX = leftMost - worldPaddingX;
    state.worldBounds.maxX = rightMost + worldPaddingX;

    state.worldBounds.minZ = worldMinZ;
    state.worldBounds.maxZ = worldMaxZ;
  }

  /* =========================
     이미지 asset 생성
  ========================= */
  function createImageAsset(item) {
    const assetId = `asset-${item.id}`;
    const img = document.createElement("img");

    img.setAttribute("id", assetId);
    img.setAttribute("src", item.image || createPlaceholderImage(item.title));

    dynamicAssets.appendChild(img);
    return assetId;
  }

  function createPlaceholderImage(title) {
    const safeTitle = escapeHtml(title);

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="1200" viewBox="0 0 300 1200">
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#f9fdff"/>
            <stop offset="100%" stop-color="#d8efff"/>
          </linearGradient>
        </defs>

        <rect width="300" height="1200" fill="url(#g)"/>

        <text x="50%" y="48%" text-anchor="middle" fill="#ff6ae6"
          font-family="pretendard, Helvetica, sans-serif"
          font-size="28" letter-spacing="1">
          ${safeTitle}
        </text>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  /* =========================
     오디오 제어
  ========================= */
  async function handleSpineClick(item) {
    state.selectedId = item.id;

    state.iconActivatedMap.set(item.id, true);

    const currentState = state.audioStateMap.get(item.id) || "stopped";

    if (currentState === "playing") {
      pauseItem(item);

      if (item.visualRef) {
        item.visualRef.object3D.scale.set(1, 1, 1);
      }

      return;
    }

    if (state.currentPlayingId && state.currentPlayingId !== item.id) {
      const previousItem = state.itemMap.get(state.currentPlayingId);
      if (previousItem) {
        pauseItem(previousItem, false);
      }
    }

    await playOrResumeItem(item);

    if (item.visualRef) {
      item.visualRef.object3D.scale.set(1, 1, 1);
    }
  }

  async function playOrResumeItem(item) {
    const audio = getOrCreateAudio(item);

    try {
      await audio.play();

      state.currentPlayingId = item.id;
      state.audioStateMap.set(item.id, "playing");
      updateIcon(item.id, "playing");
      document.body.classList.add("is-scratching");
    } catch (error) {
      console.error("오디오 재생 실패:", error);
    }
  }

  function pauseItem(item, updateHudToo = true) {
    const audio = state.audioMap.get(item.id);
    if (!audio) return;

    audio.pause();

    state.audioStateMap.set(item.id, "paused");
    updateIcon(item.id, "paused");

    if (state.currentPlayingId === item.id) {
      state.currentPlayingId = null;
    }

    if (item.visualRef) {
      item.visualRef.object3D.scale.set(1, 1, 1);
    }

    if (updateHudToo) {
    }
  }

  async function restartFromBeginning(item) {
    const audio = getOrCreateAudio(item);

    state.iconActivatedMap.set(item.id, true);

    if (state.currentPlayingId && state.currentPlayingId !== item.id) {
      const previousItem = state.itemMap.get(state.currentPlayingId);
      if (previousItem) {
        pauseItem(previousItem, false);
      }
    }

    audio.pause();
    audio.currentTime = 0;

    try {
      await audio.play();

      state.currentPlayingId = item.id;
      state.audioStateMap.set(item.id, "playing");
      updateIcon(item.id, "playing");

      if (item.visualRef) {
        item.visualRef.object3D.scale.set(1, 1, 1);
      }

    } catch (error) {
      console.error("다시 재생 실패:", error);
    }
  }

  function getOrCreateAudio(item) {
    if (state.audioMap.has(item.id)) {
      return state.audioMap.get(item.id);
    }

    const audio = new Audio(item.audio);
    audio.preload = "auto";

    audio.addEventListener("ended", () => {
      state.audioStateMap.set(item.id, "stopped");
      updateIcon(item.id, "stopped");

      if (item.visualRef) {
        item.visualRef.object3D.scale.set(1, 1, 1);
      }

      if (state.currentPlayingId === item.id) {
        state.currentPlayingId = null;
      }

    });

    audio.addEventListener("error", () => {
      state.audioStateMap.set(item.id, "stopped");
      updateIcon(item.id, "stopped");

      if (state.currentPlayingId === item.id) {
        state.currentPlayingId = null;
      }

    });

    state.audioMap.set(item.id, audio);
    return audio;
  }

  /* =========================
     상태 아이콘
  ========================= */
  function updateIcon(itemId, newState) {
    const iconText = state.iconTextMap.get(itemId);
    const activated = state.iconActivatedMap.get(itemId);

    if (!iconText) return;

    if (!activated) {
      iconText.setAttribute("visible", "false");
      iconText.setAttribute("value", "");
      return;
    }

    iconText.setAttribute("visible", "true");
    iconText.setAttribute("value", AUDIO_ICONS[newState] || "");

    if (newState === "playing") {
      iconText.setAttribute("color", "#ffffff");
    } else if (newState === "paused") {
      iconText.setAttribute("color", "#272727");
    } else {
      iconText.setAttribute("color", "#fefefe");
    }
  }

  /* =========================
     바닥 크기 조절
  ========================= */
  function applyFloorSize() {
    if (!floorPlane) return;

    floorPlane.setAttribute("width", floorWidth);
    floorPlane.setAttribute("height", floorHeight);
  }

  function updateBoundsFromFloor() {
    if (!floorPlane) return;

    /*
      현재 바닥의 실제 위치를 읽는다.
      width는 x축 길이
      height는 z축 길이
    */
    const floorPosition = floorPlane.getAttribute("position") || { x: 0, y: 0, z: -12 };

    const halfWidth = floorWidth / 2;
    const halfHeight = floorHeight / 2;

    /*
      바닥 가장자리보다 약간 안쪽까지만 이동 가능
    */
    state.worldBounds.minX = floorPosition.x - halfWidth + floorEdgePadding;
    state.worldBounds.maxX = floorPosition.x + halfWidth - floorEdgePadding;

    state.worldBounds.minZ = floorPosition.z - halfHeight + floorEdgePadding;
    state.worldBounds.maxZ = floorPosition.z + halfHeight - floorEdgePadding;
  }


  /* =========================
     거리 페이드
     - 멀어질수록 서서히 사라짐
  ========================= */
  function updateDistanceFade() {
    const cameraWorldPosition = new THREE.Vector3();
    camera.object3D.getWorldPosition(cameraWorldPosition);

    state.itemMap.forEach((item, itemId) => {
      const imagePlane = state.imagePlaneMap.get(itemId);
      const iconText = state.iconTextMap.get(itemId);

      if (!imagePlane || !item.groupRef) return;

      const groupWorldPosition = new THREE.Vector3();
      item.groupRef.object3D.getWorldPosition(groupWorldPosition);

      const distance = cameraWorldPosition.distanceTo(groupWorldPosition);

      let t = 0;

      if (distance <= fadeStartDistance) {
        t = 0;
      } else if (distance >= fadeEndDistance) {
        t = 1;
      } else {
        t =
          (distance - fadeStartDistance) /
          (fadeEndDistance - fadeStartDistance);
      }

      /*
        부드러운 감쇠
      */
      const smoothT = t * t * (3 - 2 * t);
      const opacity = 1 - smoothT * (1 - fadeMinOpacity);

      /*
        material 전체를 다시 덮어쓰지 말고
        opacity만 갱신해야 기존 이미지 src가 유지된다.
      */
      imagePlane.setAttribute("material", "opacity", opacity);

      /*
        아이콘도 멀어지면 숨김
      */
      const activated = state.iconActivatedMap.get(itemId);

      if (iconText) {
        if (activated && opacity > 0.22) {
          iconText.setAttribute("visible", "true");
        } else {
          iconText.setAttribute("visible", "false");
        }
      }
    });
  }

  /* =========================
     모바일 이동
  ========================= */
  function setupMobileMoveButtons() {
    moveButtons.forEach((button) => {
      const direction = button.dataset.move;

      const startMove = (event) => {
        event.preventDefault();
        if (!state.started) return;
        state.move[direction] = true;
      };

      const endMove = (event) => {
        event.preventDefault();
        state.move[direction] = false;
      };

      button.addEventListener("pointerdown", startMove);
      button.addEventListener("pointerup", endMove);
      button.addEventListener("pointercancel", endMove);
      button.addEventListener("pointerleave", endMove);
    });
  }

  function stopAllMovement() {
    state.move.forward = false;
    state.move.backward = false;
    state.move.left = false;
    state.move.right = false;
  }

  function startMobileMovementLoop() {
    let lastTime = performance.now();

    function loop(now) {
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      /*
        모바일 이동 버튼으로 움직일 때만 직접 이동 처리
      */
      if (state.started && state.isTouchDevice) {
        updateMobileMovement(delta);
      }

      /*
        중요:
        데스크탑의 wasd-controls 이동도
        매 프레임 여기서 강제로 경계 안으로 되돌린다.
      */
      clampRigToBounds();

      /*
        거리 페이드도 계속 갱신
      */
      updateDistanceFade();

      requestAnimationFrame(loop);
    }

    requestAnimationFrame(loop);
  }

  function updateMobileMovement(delta) {
    const moving =
      state.move.forward ||
      state.move.backward ||
      state.move.left ||
      state.move.right;

    if (!moving) return;

    const forward = new THREE.Vector3();
    camera.object3D.getWorldDirection(forward);

    forward.y = 0;

    if (forward.lengthSq() === 0) return;

    forward.normalize();

    const right = new THREE.Vector3(forward.z, 0, -forward.x).normalize();
    const moveVector = new THREE.Vector3();

    if (state.move.forward) moveVector.sub(forward);
    if (state.move.backward) moveVector.add(forward);
    if (state.move.left) moveVector.sub(right);
    if (state.move.right) moveVector.add(right);

    if (moveVector.lengthSq() === 0) return;

    moveVector.normalize().multiplyScalar(mobileMoveSpeed * delta);

    rig.object3D.position.add(moveVector);
    clampRigToBounds();
  }

  /* =========================
     위치 제어
  ========================= */
  function setRigPosition(x, y, z) {
    rig.object3D.position.set(x, y, z);
    clampRigToBounds();
  }

  function clampRigToBounds() {
    rig.object3D.position.x = clamp(
      rig.object3D.position.x,
      state.worldBounds.minX,
      state.worldBounds.maxX
    );

    rig.object3D.position.z = clamp(
      rig.object3D.position.z,
      state.worldBounds.minZ,
      state.worldBounds.maxZ
    );

    rig.object3D.position.y = 0;
  }

  function resetPlayerPosition() {
    stopAllMovement();
    setRigPosition(spawnPosition.x, spawnPosition.y, spawnPosition.z);

    const lookControls = camera.components["look-controls"];

    if (lookControls) {
      try {
        lookControls.pitchObject.rotation.x = 0;
        lookControls.yawObject.rotation.y = 0;
      } catch (error) {
        console.warn("look-controls 초기화 경고:", error);
      }
    }

    camera.object3D.rotation.set(0, 0, 0);
  }

  /* =========================
     유틸리티
  ========================= */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getScratchCanvasSize(item) {
    return {
      width: Math.max(64, Math.round(item.spineWidthMm * scratchTextureScale)),
      height: Math.max(256, Math.round(item.spineHeightMm * scratchTextureScale))
    };
  }

  function drawScratchCover(ctx, width, height) {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);

    /*
      기본 단면 색
    */
    ctx.fillStyle = scratchOverlayColor;
    ctx.fillRect(0, 0, width, height);

    /*
      시작 화면과 비슷한 거친 결감
    */
    const grainCount = Math.max(80, Math.round((width * height) / 4500));

    for (let i = 0; i < grainCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const w = 6 + Math.random() * 20;
      const h = 1 + Math.random() * 3;

      ctx.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.06})`;
      ctx.fillRect(x, y, w, h);
    }
  }

  function createScratchLayer(item) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const size = getScratchCanvasSize(item);

    canvas.setAttribute("id", `scratch-layer-${item.id}`);
    canvas.width = size.width;
    canvas.height = size.height;

    drawScratchCover(ctx, size.width, size.height);

    dynamicAssets.appendChild(canvas);

    state.scratchLayerMap.set(item.id, {
      canvas,
      ctx,
      overlayPlane: null
    });

    return canvas.id;
  }

  function markScratchLayerDirty(itemId) {
    const layer = state.scratchLayerMap.get(itemId);
    const mesh = layer?.overlayPlane?.getObject3D("mesh");

    if (!mesh || !mesh.material || !mesh.material.map) return;

    mesh.material.map.needsUpdate = true;
    mesh.material.needsUpdate = true;
  }

  function resetAllScratchLayers() {
    state.scratchLayerMap.forEach((layer, itemId) => {
      if (!layer || !layer.ctx || !layer.canvas) return;

      drawScratchCover(layer.ctx, layer.canvas.width, layer.canvas.height);
      markScratchLayerDirty(itemId);
    });

    resetScratchStroke();
  }

  function resetScratchStroke() {
    state.scratchLastPoint = null;
  }

  function scratchLayerAtUv(item, uv) {
    if (!item || !uv) return;

    const layer = state.scratchLayerMap.get(item.id);
    if (!layer) return;

    const ctx = layer.ctx;
    const x = uv.x * layer.canvas.width;
    const y = (1 - uv.y) * layer.canvas.height;

    const previousPoint =
      state.scratchLastPoint &&
        state.scratchLastPoint.itemId === item.id
        ? state.scratchLastPoint
        : null;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = scratchBrushSize;

    if (previousPoint) {
      ctx.beginPath();
      ctx.moveTo(previousPoint.x, previousPoint.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, scratchBrushRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    state.scratchLastPoint = {
      itemId: item.id,
      x,
      y
    };

    markScratchLayerDirty(item.id);
  }

  function getScratchHitFromClientPoint(clientX, clientY) {
    const canvas = scene?.canvas || scene?.querySelector?.("canvas");
    const threeCamera = camera.getObject3D("camera");

    if (!canvas || !threeCamera) return null;

    const rect = canvas.getBoundingClientRect();

    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return null;
    }

    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, threeCamera);

    let closestHit = null;

    state.itemMap.forEach((item) => {
      if (item.isDecorative || !item.hitboxRef) return;

      const intersections = raycaster.intersectObject(
        item.hitboxRef.object3D,
        true
      );

      if (!intersections.length) return;

      const hit = intersections[0];

      if (!closestHit || hit.distance < closestHit.distance) {
        closestHit = {
          item,
          uv: hit.uv ? { x: hit.uv.x, y: hit.uv.y } : null,
          distance: hit.distance
        };
      }
    });

    return closestHit;
  }

  function handleScratchAtClientPoint(clientX, clientY) {
    if (!state.started) return null;

    const hit = getScratchHitFromClientPoint(clientX, clientY);

    if (!hit || !hit.item || !hit.uv) {
      resetScratchStroke();
      return null;
    }

    if (
      state.scratchLastPoint &&
      state.scratchLastPoint.itemId !== hit.item.id
    ) {
      resetScratchStroke();
    }

    scratchLayerAtUv(hit.item, hit.uv);
    return hit.item;
  }

  function setupDesktopInteraction() {
    if (state.isTouchDevice) return;

    /*
      브라우저 기본 우클릭 메뉴 방지
    */
    window.addEventListener("contextmenu", (event) => {
      event.preventDefault();
    });

    window.addEventListener("mousedown", (event) => {
      if (!state.started) return;

      if (event.button === 0) {
        state.isLeftMouseDown = true;
      }

      if (event.button === 2) {
        state.isRightDragging = true;
        state.lastRightDragX = event.clientX;
        state.lastRightDragY = event.clientY;
        document.body.classList.add("is-view-dragging");
        document.body.classList.remove("is-scratching");
        event.preventDefault();
      }
    });

    window.addEventListener("mousemove", async (event) => {
      if (!state.started) return;

      if (state.isRightDragging) {
        const lookControls = camera.components["look-controls"];
        if (!lookControls) return;

        const dx = event.clientX - state.lastRightDragX;
        const dy = event.clientY - state.lastRightDragY;

        state.lastRightDragX = event.clientX;
        state.lastRightDragY = event.clientY;

        const yawSpeed = 0.0045;
        const pitchSpeed = 0.0035;

        lookControls.yawObject.rotation.y -= dx * yawSpeed;
        lookControls.pitchObject.rotation.x -= dy * pitchSpeed;

        const maxPitch = Math.PI / 2 - 0.05;
        const minPitch = -Math.PI / 2 + 0.05;

        lookControls.pitchObject.rotation.x = Math.max(
          minPitch,
          Math.min(maxPitch, lookControls.pitchObject.rotation.x)
        );

        return;
      }

      if (!state.isLeftMouseDown) return;

      const scratchedItem = handleScratchAtClientPoint(
        event.clientX,
        event.clientY
      );

      if (!scratchedItem) return;

      if (state.scratchItemId !== scratchedItem.id) {
        await startScratchPlayback(scratchedItem);
      }
    });

    window.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        state.isLeftMouseDown = false;
        resetScratchStroke();
        pauseScratchPlayback();
      }

      if (event.button === 2) {
        state.isRightDragging = false;
        document.body.classList.remove("is-view-dragging");
      }
    });

    window.addEventListener("blur", () => {
      state.isLeftMouseDown = false;
      state.isRightDragging = false;
      resetScratchStroke();
      document.body.classList.remove("is-view-dragging");
      document.body.classList.remove("is-scratching");
      pauseScratchPlayback();
    });
  }

  function setupMobileTouchInteraction() {
    if (!state.isTouchDevice) return;

    const scratchMoveThreshold = 10;

    function getSceneCanvas() {
      return scene?.canvas || scene?.querySelector?.("canvas") || null;
    }

    function getTouchById(touchList, id) {
      for (const touch of touchList) {
        if (touch.identifier === id) return touch;
      }
      return null;
    }

    function isUiTarget(target) {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(".move-btn, .ghost-btn, .top-ui, .intro-overlay")
      );
    }

    function getTouchCenter(touchA, touchB) {
      return {
        x: (touchA.clientX + touchB.clientX) / 2,
        y: (touchA.clientY + touchB.clientY) / 2
      };
    }

    function startMobileLookDrag(touches) {
      resetScratchStroke();

      if (touches.length < 2) return;

      state.mobileScratchTouchId = null;
      state.mobileScratchMoved = false;

      state.mobileLookTouchIds = [
        touches[0].identifier,
        touches[1].identifier
      ];

      const center = getTouchCenter(touches[0], touches[1]);
      state.mobileLookLastCenterX = center.x;
      state.mobileLookLastCenterY = center.y;

      document.body.classList.add("is-view-dragging");
      document.body.classList.remove("is-scratching");
    }

    function stopMobileLookDrag() {
      state.mobileLookTouchIds = [];
      document.body.classList.remove("is-view-dragging");
    }

    function resetMobileScratchState() {
      state.mobileScratchTouchId = null;
      state.mobileScratchStartX = 0;
      state.mobileScratchStartY = 0;
      state.mobileScratchMoved = false;
    }

    function resetMobileTouchState() {
      resetMobileScratchState();
      stopMobileLookDrag();
    }

    window.resetMobileTouchState = resetMobileTouchState;

    function getItemFromClientPoint(clientX, clientY) {
      const canvas = getSceneCanvas();
      const threeCamera = camera.getObject3D("camera");

      if (!canvas || !threeCamera) return null;

      const rect = canvas.getBoundingClientRect();

      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null;
      }

      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(ndc, threeCamera);

      let closestItem = null;
      let closestDistance = Infinity;

      state.itemMap.forEach((item) => {
        if (item.isDecorative || !item.hitboxRef) return;

        const intersections = raycaster.intersectObject(
          item.hitboxRef.object3D,
          true
        );

        if (!intersections.length) return;

        const hit = intersections[0];
        if (hit.distance < closestDistance) {
          closestDistance = hit.distance;
          closestItem = item;
        }
      });

      return closestItem;
    }

    async function unlockAudioForItem(item) {
      if (!item || item.isDecorative || !item.audio) return;

      const audio = getOrCreateAudio(item);

      try {
        audio.muted = true;
        audio.currentTime = 0;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      } catch (error) {
        audio.muted = false;
        console.warn("모바일 오디오 unlock 실패:", error);
      }
    }

    async function onTouchStart(event) {
      if (!state.started) return;
      if (isUiTarget(event.target)) return;

      if (event.touches.length >= 2) {
        event.preventDefault();
        startMobileLookDrag(event.touches);
        return;
      }

      if (event.touches.length !== 1) return;

      const touch = event.changedTouches[0];
      if (!touch) return;

      stopMobileLookDrag();

      state.mobileScratchTouchId = touch.identifier;
      state.mobileScratchStartX = touch.clientX;
      state.mobileScratchStartY = touch.clientY;
      state.mobileScratchMoved = false;

      const item = getItemFromClientPoint(touch.clientX, touch.clientY);
      if (item) {
        await unlockAudioForItem(item);
      }
    }

    async function onTouchMove(event) {
      if (!state.started) return;

      if (state.mobileLookTouchIds.length === 2) {
        const touchA = getTouchById(event.touches, state.mobileLookTouchIds[0]);
        const touchB = getTouchById(event.touches, state.mobileLookTouchIds[1]);

        if (touchA && touchB) {
          event.preventDefault();

          const lookControls = camera.components["look-controls"];
          if (!lookControls) return;

          const center = getTouchCenter(touchA, touchB);
          const dx = center.x - state.mobileLookLastCenterX;
          const dy = center.y - state.mobileLookLastCenterY;

          state.mobileLookLastCenterX = center.x;
          state.mobileLookLastCenterY = center.y;

          const yawSpeed = 0.0045;
          const pitchSpeed = 0.0035;

          lookControls.yawObject.rotation.y -= dx * yawSpeed;
          lookControls.pitchObject.rotation.x -= dy * pitchSpeed;

          const maxPitch = Math.PI / 2 - 0.05;
          const minPitch = -Math.PI / 2 + 0.05;

          lookControls.pitchObject.rotation.x = Math.max(
            minPitch,
            Math.min(maxPitch, lookControls.pitchObject.rotation.x)
          );
        }

        return;
      }

      if (state.mobileScratchTouchId === null) return;
      if (event.touches.length !== 1) return;

      const touch = getTouchById(event.touches, state.mobileScratchTouchId);
      if (!touch) return;

      const movedDistance = Math.hypot(
        touch.clientX - state.mobileScratchStartX,
        touch.clientY - state.mobileScratchStartY
      );

      if (movedDistance < scratchMoveThreshold) return;

      event.preventDefault();
      state.mobileScratchMoved = true;

      const scratchedItem = handleScratchAtClientPoint(
        touch.clientX,
        touch.clientY
      );

      if (!scratchedItem) {
        return;
      }

      if (state.scratchItemId === scratchedItem.id) return;

      await startScratchPlayback(scratchedItem);
    }

    function onTouchEnd(event) {
      const scratchEnded = Array.from(event.changedTouches).some(
        (touch) => touch.identifier === state.mobileScratchTouchId
      );

      if (scratchEnded) {
        resetMobileScratchState();
        resetScratchStroke();
        pauseScratchPlayback();
      }

      if (state.mobileLookTouchIds.length === 2) {
        const touchAStillExists = getTouchById(
          event.touches,
          state.mobileLookTouchIds[0]
        );
        const touchBStillExists = getTouchById(
          event.touches,
          state.mobileLookTouchIds[1]
        );

        if (!touchAStillExists || !touchBStillExists) {
          stopMobileLookDrag();
        }
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: false });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });
    window.addEventListener("touchcancel", onTouchEnd, { passive: false });
  }

  async function startScratchPlayback(item) {
    if (!item || item.isDecorative || !item.audio) return;

    state.selectedId = item.id;
    state.iconActivatedMap.set(item.id, true);

    if (state.currentPlayingId && state.currentPlayingId !== item.id) {
      const previousItem = state.itemMap.get(state.currentPlayingId);
      if (previousItem) {
        pauseScratchPlayback(previousItem.id);
      }
    }

    const audio = getOrCreateAudio(item);

    try {
      await audio.play();

      state.currentPlayingId = item.id;
      state.scratchItemId = item.id;
      state.audioStateMap.set(item.id, "playing");
      updateIcon(item.id, "playing");
      document.body.classList.add("is-scratching");
    } catch (error) {
      console.error("스크래치 재생 실패:", item.id, item.audio, error);
    }
  }

  function pauseScratchPlayback(itemId = state.scratchItemId) {
    if (!itemId) return;

    const item = state.itemMap.get(itemId);
    const audio = state.audioMap.get(itemId);

    /*
      진짜 stop이 아니라 pause만 한다.
      currentTime = 0 은 절대 하지 않는다.
    */
    if (audio) {
      audio.pause();
    }

    if (item) {
      state.audioStateMap.set(itemId, "paused");
      updateIcon(itemId, "paused");
    }

    if (state.currentPlayingId === itemId) {
      state.currentPlayingId = null;
    }

    if (state.scratchItemId === itemId) {
      state.scratchItemId = null;
    }

    document.body.classList.remove("is-scratching");
    resetScratchStroke();

  }

  function setupScratchIntro() {
    if (!introScratchBox || !introPosterImage || !scratchCanvas) return;

    const ctx = scratchCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let isPointerDown = false;
    let lastPoint = null;
    let downPoint = null;

    /*
      포인터를 누른 순간,
      그 지점이 이미 드러나 있었는지 저장
    */
    let revealedBeforeDown = false;

    /*
      살짝 흔들린 정도는 클릭으로 인정
    */
    const enterTapThreshold = 10;

    function resizeScratchCanvas() {
      const rect = introScratchBox.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      scratchCanvas.width = Math.floor(rect.width * dpr);
      scratchCanvas.height = Math.floor(rect.height * dpr);

      scratchCanvas.style.width = `${rect.width}px`;
      scratchCanvas.style.height = `${rect.height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      /*
        처음에는 단면 색으로 덮는다
      */
      drawScratchCover(ctx, rect.width, rect.height);
    }

    function getLocalPoint(event) {
      const rect = scratchCanvas.getBoundingClientRect();

      let clientX = 0;
      let clientY = 0;

      if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
      } else if (event.changedTouches && event.changedTouches.length > 0) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    function scratchAt(point) {
      if (!point) return;

      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#000";
      ctx.fillStyle = "#000";
      ctx.lineWidth = scratchBrushSize;

      if (lastPoint) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(point.x, point.y, scratchBrushRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    function isRevealedAt(point) {
      const dpr = window.devicePixelRatio || 1;
      const x = Math.floor(point.x * dpr);
      const y = Math.floor(point.y * dpr);
      const pixel = ctx.getImageData(x, y, 1, 1).data;

      return pixel[3] < 30;
    }

    function onPointerDown(event) {
      event.preventDefault();

      const point = getLocalPoint(event);

      isPointerDown = true;
      downPoint = point;
      lastPoint = point;

      /*
        누르기 직전 상태를 먼저 저장
        이 값이 true일 때만 '입장 클릭' 가능
      */
      revealedBeforeDown = isRevealedAt(point);

      document.body.classList.add("is-scratching");

      /*
        이미 드러난 곳을 클릭한 경우에는
        새로 긁지 않는다.
      */
      if (!revealedBeforeDown) {
        scratchAt(point);
      }
    }

    function onPointerMove(event) {
      if (!isPointerDown) return;
      event.preventDefault();

      const point = getLocalPoint(event);
      scratchAt(point);
      lastPoint = point;
    }

    function onPointerUp(event) {
      if (!isPointerDown) return;
      event.preventDefault();

      const point = getLocalPoint(event);

      const movedDistance = downPoint
        ? Math.hypot(point.x - downPoint.x, point.y - downPoint.y)
        : Infinity;

      /*
        누른 순간 이미 드러나 있던 부분을
        거의 움직이지 않고 탭했을 때만 입장
      */
      if (movedDistance <= enterTapThreshold && revealedBeforeDown) {
        enterSpace();
      }

      isPointerDown = false;
      lastPoint = null;
      downPoint = null;
      revealedBeforeDown = false;

      document.body.classList.remove("is-scratching");
    }

    if (introPosterImage.complete) {
      resizeScratchCanvas();
    } else {
      introPosterImage.addEventListener("load", resizeScratchCanvas, { once: true });
    }

    window.addEventListener("resize", resizeScratchCanvas);

    scratchCanvas.addEventListener("mousedown", onPointerDown);
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("mouseup", onPointerUp);

    scratchCanvas.addEventListener("touchstart", onPointerDown, { passive: false });
    window.addEventListener("touchmove", onPointerMove, { passive: false });
    window.addEventListener("touchend", onPointerUp, { passive: false });

    window.addEventListener("blur", () => {
      isPointerDown = false;
      lastPoint = null;
      downPoint = null;
      revealedBeforeDown = false;
      document.body.classList.remove("is-scratching");
    });

    scratchCanvas.addEventListener("mouseleave", () => {
      if (!isPointerDown) return;
      document.body.classList.remove("is-scratching");
    });
  }
});