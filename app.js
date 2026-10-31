const LAKE = { x: -3.2, z: -16.8, rx: 6.8, rz: 4.2, tilt: -0.26 };
const GROUND_RADIUS = 36;
const GROUND_FAR_RADIUS = 210;
const GROUND_BASE_Y = -0.16;

const STORAGE_KEY = "star-isle-park-v1";
const CARRY_PREFIX = `${STORAGE_KEY}::`;
const HASH_PREFIX = "#park=";
const DEFAULT_DARKNESS = 40;
let storageAvailable = true;
let carryToHash = false;
let storageError = "";
let darknessSaveTimer = null;
let clockTimer = null;
let weatherRefreshTimer = null;
let weatherAbortController = null;
let citySearchResults = [];
let selectedCabinIndex = null;
let musicContext = null;
let musicMaster = null;
let musicDelay = null;
let musicScheduler = null;
let currentTrackIndex = -1;
let musicPaused = false;
let userMusicTracks = [];
let userMusicUrls = [];
let currentAudio = null;
let activeMusicTrackIndex = -1;
let musicPlayToken = 0;
let pendingMusicDirectory = null;

const facilities = [
  {
    id: "ferris",
    number: "01",
    name: "月轮摩天轮",
    category: "缓慢升空",
    subtitle: "把整座乐园，收进一圈月光里。",
    lore: "它转得很慢，慢到刚好看清远处的灯，也刚好听见自己心里的声音。",
    accent: "#f6c469",
    world: [-11, 0, -7],
    focusTarget: 4.2,
    focusDistance: 18.5
  },
  {
    id: "coaster",
    number: "02",
    name: "流星过山车",
    category: "风里失重",
    subtitle: "沿着夜色俯冲，再带着还没说完的话返航。",
    lore: "第一秒有些紧张，第二秒开始大笑。它专门收集那些来不及藏起来的快乐。",
    accent: "#ef7455",
    world: [8, 0, -9],
    focusTarget: 2.6,
    focusDistance: 23,
    focusTargetX: -1.4,
    focusYaw: -0.05
  },
  {
    id: "carousel",
    number: "03",
    name: "云朵旋转木马",
    category: "旧梦回转",
    subtitle: "挑一匹喜欢的白马，绕一圈很远以前。",
    lore: "音乐响起以后，请挑一个最顺眼的位置。没有固定的舞步，开心就好。",
    accent: "#7fd8c4",
    world: [0, 0, 0],
    focusTarget: 2.5,
    focusDistance: 16.5
  },
  {
    id: "slide",
    number: "04",
    name: "暮色滑梯",
    category: "向晚滑落",
    subtitle: "从最高的位置出发，把没必要的烦恼留在身后。",
    lore: "滑下来的时候别闭眼。风会替你翻页，落地以后又是轻飘飘的一天。",
    accent: "#59c2e0",
    world: [-12, 0, 10],
    focusTarget: 3.3,
    focusDistance: 18,
    focusPitch: 0.46
  },
  {
    id: "garden",
    number: "05",
    name: "失语花园",
    category: "安静发光",
    subtitle: "一座只有你知道入口的花园。",
    lore: "这里不赶时间。可以在花丛边坐一会儿，把没说出口的话交给晚风。",
    accent: "#b98be6",
    world: [12, 0, 10],
    focusTarget: 2.4,
    focusDistance: 14,
    focusPitch: 0.4
  },
  {
    id: "pendulum",
    number: "06",
    name: "夜航大摆锤",
    category: "心跳悬空",
    subtitle: "荡到云层之上，和晚风短暂地打个照面。",
    lore: "最高点会安静两秒。看见月亮时，记得替今天的自己许一个小愿望。",
    accent: "#f08a4b",
    world: [12, 0, -1],
    focusTarget: 4,
    focusDistance: 17
  }
];

const defaultProfile = {
  name: "心",
  tagline: "心之所向"
};

// 上一版默认值：若浏览器里存的正是它，视为未改名，自动换成新默认值
const legacyDefaults = {
  name: "星屿游乐园",
  tagline: "把喜欢的日子，都收进这一座游乐园。"
};

let state = loadState();
let activeFacilityId = null;
let activeModel = null;
let toastTimer = null;
let lastFocusedSite = null;
let overviewWorld = null;
let focusWorld = null;
let modelTime = 0;
let lastFrameTime = 0;

const elements = {
  appShell: document.getElementById("appShell"),
  headerParkName: document.getElementById("headerParkName"),
  periodLabel: document.getElementById("periodLabel"),
  mapSites: document.getElementById("mapSites"),
  overviewView: document.getElementById("overviewView"),
  focusView: document.getElementById("focusView"),
  overviewCanvas: document.getElementById("overviewCanvas"),
  focusCanvas: document.getElementById("focusCanvas"),
  focusCopy: document.querySelector(".focus-copy"),
  backButton: document.getElementById("backButton"),
  focusIndex: document.getElementById("focusIndex"),
  focusCounter: document.getElementById("focusCounter"),
  focusCategory: document.getElementById("focusCategory"),
  focusEyebrow: document.getElementById("focusEyebrow"),
  focusTitle: document.getElementById("focusTitle"),
  focusSubtitle: document.getElementById("focusSubtitle"),
  focusLore: document.getElementById("focusLore"),
  briefForm: document.getElementById("briefForm"),
  briefText: document.getElementById("briefText"),
  characterCount: document.getElementById("characterCount"),
  saveState: document.getElementById("saveState"),
  clearBriefButton: document.getElementById("clearBriefButton"),
  profileDialog: document.getElementById("profileDialog"),
  profileForm: document.getElementById("profileForm"),
  parkNameInput: document.getElementById("parkNameInput"),
  parkTaglineInput: document.getElementById("parkTaglineInput"),
  profileCharacterCount: document.getElementById("profileCharacterCount"),
  profileStorageHint: document.getElementById("profileStorageHint"),
  journalDialog: document.getElementById("journalDialog"),
  journalList: document.getElementById("journalList"),
  journalCount: document.getElementById("journalCount"),
  journalTotal: document.getElementById("journalTotal"),
  darknessSlider: document.getElementById("darknessSlider"),
  darknessValue: document.getElementById("darknessValue"),
  weatherButton: document.getElementById("weatherButton"),
  localWeatherTime: document.getElementById("localWeatherTime"),
  weatherSymbol: document.getElementById("weatherSymbol"),
  weatherPlace: document.getElementById("weatherPlace"),
  weatherReading: document.getElementById("weatherReading"),
  weatherDialog: document.getElementById("weatherDialog"),
  useLocationButton: document.getElementById("useLocationButton"),
  citySearchForm: document.getElementById("citySearchForm"),
  citySearchInput: document.getElementById("citySearchInput"),
  cityResults: document.getElementById("cityResults"),
  weatherMessage: document.getElementById("weatherMessage"),
  weatherMemory: document.getElementById("weatherMemory"),
  weatherMemoryPlace: document.getElementById("weatherMemoryPlace"),
  weatherMemoryClear: document.getElementById("weatherMemoryClear"),
  weatherNow: document.getElementById("weatherNow"),
  weatherNowIcon: document.getElementById("weatherNowIcon"),
  weatherNowPlace: document.getElementById("weatherNowPlace"),
  weatherNowConditions: document.getElementById("weatherNowConditions"),
  weatherNowTemp: document.getElementById("weatherNowTemp"),
  weatherFeels: document.getElementById("weatherFeels"),
  weatherHumidity: document.getElementById("weatherHumidity"),
  weatherWind: document.getElementById("weatherWind"),
  weatherDetails: document.getElementById("weatherDetails"),
  focusVisual: document.querySelector(".focus-visual"),
  cabinHint: document.getElementById("cabinHint"),
  musicLibraryButton: document.getElementById("musicLibraryButton"),
  musicPlayer: document.getElementById("musicPlayer"),
  musicToggle: document.getElementById("musicToggle"),
  trackTitle: document.getElementById("trackTitle"),
  musicNext: document.getElementById("musicNext"),
  musicStop: document.getElementById("musicStop"),
  musicDialog: document.getElementById("musicDialog"),
  chooseMusicFolderButton: document.getElementById("chooseMusicFolderButton"),
  chooseMusicFilesButton: document.getElementById("chooseMusicFilesButton"),
  musicFilesInput: document.getElementById("musicFilesInput"),
  musicLibraryMessage: document.getElementById("musicLibraryMessage"),
  musicLibraryList: document.getElementById("musicLibraryList"),
  musicLibraryCount: document.getElementById("musicLibraryCount"),
  clearMusicLibrary: document.getElementById("clearMusicLibrary"),
  toast: document.getElementById("toast"),
  photoPanel: document.getElementById("photoPanel"),
  photoAdminEntry: document.getElementById("photoAdminEntry"),
  photoSearchForm: document.getElementById("photoSearchForm"),
  photoSearchInput: document.getElementById("photoSearchInput"),
  photoMessage: document.getElementById("photoMessage"),
  photoStorage: document.getElementById("photoStorage"),
  photoResult: document.getElementById("photoResult"),
  photoResultImage: document.getElementById("photoResultImage"),
  photoResultName: document.getElementById("photoResultName"),
  photoResultDate: document.getElementById("photoResultDate"),
  photoAdminDialog: document.getElementById("photoAdminDialog"),
  photoGate: document.getElementById("photoGate"),
  photoGateForm: document.getElementById("photoGateForm"),
  photoPassInput: document.getElementById("photoPassInput"),
  photoGateMessage: document.getElementById("photoGateMessage"),
  photoAdminBody: document.getElementById("photoAdminBody"),
  photoUploadForm: document.getElementById("photoUploadForm"),
  photoNameInput: document.getElementById("photoNameInput"),
  photoFileInput: document.getElementById("photoFileInput"),
  photoUploadMessage: document.getElementById("photoUploadMessage"),
  photoList: document.getElementById("photoList"),
  photoPassForm: document.getElementById("photoPassForm"),
  photoOldPass: document.getElementById("photoOldPass"),
  photoNewPass: document.getElementById("photoNewPass"),
  photoPassMessage: document.getElementById("photoPassMessage"),
  photoChangePassButton: document.getElementById("photoChangePassButton"),
  photoLockButton: document.getElementById("photoLockButton")
};

/* ---------- 旋转木马相册：图片存在 IndexedDB，密码存在 localStorage ---------- */

const ALBUM_DB_NAME = "star-isle-album";
const ALBUM_STORE = "photos";
const ALBUM_LOCAL_KEY = "star-isle-album-photos";
const ALBUM_PASS_KEY = "star-isle-album-pass";
const ALBUM_DEFAULT_PASS = "200701";
const ALBUM_MAX_SIZE = 12 * 1024 * 1024;

let albumDbPromise = null;
let albumBackend = null;
let albumMemory = [];
let albumUnlocked = false;
let albumListUrls = [];
let albumResultUrl = null;

// 打开 IndexedDB。被浏览器拒绝（iframe、file://、无痕等）时返回 null，交给上层降级
function openAlbumDb() {
  if (albumDbPromise) return albumDbPromise;
  albumDbPromise = new Promise((resolve) => {
    if (!window.indexedDB) {
      resolve(null);
      return;
    }
    let request;
    try {
      request = window.indexedDB.open(ALBUM_DB_NAME, 1);
    } catch (error) {
      resolve(null);
      return;
    }
    // 有些环境（沙箱 iframe、无痕模式）会让 open 一直不回调，加个兜底超时
    let settled = false;
    let timer = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve(value);
    };
    timer = window.setTimeout(() => finish(null), 4000);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ALBUM_STORE)) {
        const store = db.createObjectStore(ALBUM_STORE, { keyPath: "id" });
        store.createIndex("name", "name", { unique: false });
      }
    };
    request.onsuccess = () => finish(request.result);
    request.onerror = () => finish(null);
    request.onblocked = () => finish(null);
  });
  return albumDbPromise;
}

function localAlbumAvailable() {
  try {
    const probe = "__star_isle_album_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch (error) {
    return false;
  }
}

function readLocalAlbum() {
  try {
    const raw = window.localStorage.getItem(ALBUM_LOCAL_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (error) {
    return [];
  }
}

function writeLocalAlbum(list) {
  window.localStorage.setItem(ALBUM_LOCAL_KEY, JSON.stringify(list));
}

// 三种后端：IndexedDB → 浏览器缓存 → 只在内存里
async function ensureAlbumBackend() {
  if (albumBackend) return albumBackend;
  const db = await openAlbumDb();
  if (db) {
    albumBackend = "idb";
  } else if (localAlbumAvailable()) {
    albumBackend = "local";
  } else {
    albumBackend = "memory";
  }
  return albumBackend;
}

function photoSourceFor(photo) {
  if (photo.blob) return URL.createObjectURL(photo.blob);
  return photo.data || "";
}

// 降级存储放不下原图，先压到最长边 1280 的 JPEG
function blobToDataUrl(blob, compress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (!compress) {
        resolve(reader.result);
        return;
      }
      const image = new Image();
      image.onload = () => {
        const limit = 1280;
        const scale = Math.min(1, limit / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        try {
          resolve(canvas.toDataURL("image/jpeg", 0.78));
        } catch (error) {
          resolve(reader.result);
        }
      };
      image.onerror = () => resolve(reader.result);
      image.src = reader.result;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function albumAll() {
  const backend = await ensureAlbumBackend();
  if (backend === "idb") {
    const db = await openAlbumDb();
    return new Promise((resolve, reject) => {
      const request = db.transaction(ALBUM_STORE, "readonly").objectStore(ALBUM_STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }
  if (backend === "local") return readLocalAlbum();
  return albumMemory.slice();
}

async function albumPut(record) {
  const backend = await ensureAlbumBackend();
  if (backend === "idb") {
    const db = await openAlbumDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ALBUM_STORE, "readwrite");
      tx.objectStore(ALBUM_STORE).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  const data = await blobToDataUrl(record.blob, backend === "local");
  const slim = {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    type: record.type,
    size: record.size,
    data
  };
  if (backend === "local") {
    const list = readLocalAlbum();
    list.push(slim);
    writeLocalAlbum(list);
  } else {
    albumMemory.push(slim);
  }
  return slim;
}

async function albumRemove(id) {
  const backend = await ensureAlbumBackend();
  if (backend === "idb") {
    const db = await openAlbumDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ALBUM_STORE, "readwrite");
      tx.objectStore(ALBUM_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  if (backend === "local") {
    writeLocalAlbum(readLocalAlbum().filter((photo) => photo.id !== id));
  } else {
    albumMemory = albumMemory.filter((photo) => photo.id !== id);
  }
}

function readAlbumPass() {
  try {
    return localStorage.getItem(ALBUM_PASS_KEY) || ALBUM_DEFAULT_PASS;
  } catch (error) {
    return ALBUM_DEFAULT_PASS;
  }
}

function writeAlbumPass(value) {
  try {
    localStorage.setItem(ALBUM_PASS_KEY, value);
  } catch (error) {
    // 存储被禁用时只在内存里生效
  }
}

async function updatePhotoStorageHint() {
  if (!elements.photoStorage) return;
  const backend = await ensureAlbumBackend();
  if (backend === "idb") {
    elements.photoStorage.textContent = "照片保存在这台设备的浏览器数据库里。";
    elements.photoStorage.dataset.mode = "idb";
  } else if (backend === "local") {
    elements.photoStorage.textContent = "本地数据库不可用，照片改存浏览器缓存（会自动压缩）。";
    elements.photoStorage.dataset.mode = "local";
  } else {
    elements.photoStorage.textContent = "当前环境不允许本地存储，照片只在这次打开期间有效。";
    elements.photoStorage.dataset.mode = "memory";
  }
}

function setAlbumMessage(node, text, tone) {
  if (!node) return;
  node.textContent = text || "";
  node.classList.toggle("is-error", tone === "error");
  node.classList.toggle("is-ok", tone === "ok");
}

function releaseListUrls() {
  albumListUrls.forEach((url) => URL.revokeObjectURL(url));
  albumListUrls = [];
}

function listUrlFor(photo) {
  const url = photoSourceFor(photo);
  if (url.indexOf("blob:") === 0) albumListUrls.push(url);
  return url;
}

function resultUrlFor(photo) {
  if (albumResultUrl && albumResultUrl.indexOf("blob:") === 0) URL.revokeObjectURL(albumResultUrl);
  albumResultUrl = photoSourceFor(photo);
  return albumResultUrl;
}

function hidePhotoResult() {
  if (!elements.photoResult) return;
  elements.photoResult.hidden = true;
  elements.photoResultImage.removeAttribute("src");
  if (albumResultUrl && albumResultUrl.indexOf("blob:") === 0) URL.revokeObjectURL(albumResultUrl);
  albumResultUrl = null;
}

function showPhotoResult(photo) {
  elements.photoResultImage.src = resultUrlFor(photo);
  elements.photoResultImage.alt = photo.name;
  elements.photoResultName.textContent = photo.name;
  elements.photoResultDate.textContent = new Date(photo.createdAt).toLocaleDateString("zh-CN");
  elements.photoResult.hidden = false;
}

// 只有名字完全对上才给看图
async function runPhotoSearch(event) {
  if (event) event.preventDefault();
  const keyword = elements.photoSearchInput.value.trim();
  if (!keyword) {
    hidePhotoResult();
    setAlbumMessage(elements.photoMessage, "先输入照片名字。", "error");
    return;
  }
  try {
    const photos = await albumAll();
    const match = photos.find((photo) => photo.name.trim().toLowerCase() === keyword.toLowerCase());
    if (!match) {
      hidePhotoResult();
      setAlbumMessage(elements.photoMessage, "没有叫「" + keyword + "」的照片。", "error");
      return;
    }
    showPhotoResult(match);
    setAlbumMessage(elements.photoMessage, "", "");
  } catch (error) {
    hidePhotoResult();
    setAlbumMessage(elements.photoMessage, "相册读取失败，换个浏览器或关闭无痕模式再试。", "error");
  }
}

function hidePhotoAdminBody() {
  elements.photoGate.hidden = false;
  elements.photoAdminBody.hidden = true;
}

async function showPhotoAdminBody() {
  elements.photoGate.hidden = true;
  elements.photoAdminBody.hidden = false;
  await renderAlbumList();
}

function openPhotoAdmin() {
  setAlbumMessage(elements.photoGateMessage, "");
  setAlbumMessage(elements.photoUploadMessage, "");
  setAlbumMessage(elements.photoPassMessage, "");
  elements.photoPassInput.value = "";
  if (!elements.photoAdminDialog.open) elements.photoAdminDialog.showModal();
  updatePhotoStorageHint();
  if (albumUnlocked) {
    showPhotoAdminBody();
  } else {
    hidePhotoAdminBody();
    window.setTimeout(() => elements.photoPassInput.focus(), 80);
  }
}

async function renderAlbumList() {
  const list = elements.photoList;
  if (!list) return;
  releaseListUrls();
  list.innerHTML = "";
  let photos = [];
  try {
    photos = await albumAll();
  } catch (error) {
    list.innerHTML = '<p class="photo-empty">相册读取失败。</p>';
    return;
  }
  photos.sort((a, b) => b.createdAt - a.createdAt);
  updatePhotoStorageHint();
  if (!photos.length) {
    list.innerHTML = '<p class="photo-empty">还没有照片。上传一张，并给它起个名字。</p>';
    return;
  }
  photos.forEach((photo) => {
    const item = document.createElement("div");
    item.className = "photo-item";

    const image = document.createElement("img");
    image.src = listUrlFor(photo);
    image.alt = photo.name;
    item.appendChild(image);

    const copy = document.createElement("div");
    copy.className = "photo-item-copy";
    const name = document.createElement("strong");
    name.textContent = photo.name;
    const meta = document.createElement("span");
    meta.textContent = new Date(photo.createdAt).toLocaleString("zh-CN");
    copy.appendChild(name);
    copy.appendChild(meta);
    item.appendChild(copy);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "photo-item-remove";
    remove.textContent = "删除";
    remove.addEventListener("click", async () => {
      if (!window.confirm("删除「" + photo.name + "」？删除后无法恢复。")) return;
      try {
        await albumRemove(photo.id);
        await renderAlbumList();
        if (elements.photoResultName.textContent === photo.name) hidePhotoResult();
        setAlbumMessage(elements.photoUploadMessage, "已删除「" + photo.name + "」。", "ok");
      } catch (error) {
        setAlbumMessage(elements.photoUploadMessage, "删除失败，请重试。", "error");
      }
    });
    item.appendChild(remove);

    list.appendChild(item);
  });
}

async function submitPhotoUpload(event) {
  event.preventDefault();
  const name = elements.photoNameInput.value.trim();
  const file = elements.photoFileInput.files[0];
  if (!name) {
    setAlbumMessage(elements.photoUploadMessage, "先给这张照片起个名字。", "error");
    return;
  }
  if (!file) {
    setAlbumMessage(elements.photoUploadMessage, "选一张图片。", "error");
    return;
  }
  if (!file.type.startsWith("image/")) {
    setAlbumMessage(elements.photoUploadMessage, "这个文件不是图片。", "error");
    return;
  }
  if (file.size > ALBUM_MAX_SIZE) {
    setAlbumMessage(elements.photoUploadMessage, "图片超过 12MB，换一张小一点的。", "error");
    return;
  }
  try {
    const existing = await albumAll();
    if (existing.some((photo) => photo.name.trim().toLowerCase() === name.toLowerCase())) {
      setAlbumMessage(elements.photoUploadMessage, "已经有同名的照片，换个名字或者先删掉旧的。", "error");
      return;
    }
    await albumPut({
      id: (window.crypto && window.crypto.randomUUID) ? window.crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      name,
      createdAt: Date.now(),
      type: file.type,
      size: file.size,
      blob: file
    });
    elements.photoNameInput.value = "";
    elements.photoFileInput.value = "";
    setAlbumMessage(elements.photoUploadMessage, "已保存「" + name + "」。", "ok");
    await renderAlbumList();
  } catch (error) {
    const quota = error && (error.name === "QuotaExceededError" || String(error.message).indexOf("quota") >= 0);
    setAlbumMessage(
      elements.photoUploadMessage,
      quota
        ? "浏览器的本地空间放不下了，删掉几张再试。"
        : "保存失败：" + (error && error.message ? error.message : "未知原因"),
      "error"
    );
  }
}

function submitPhotoGate(event) {
  event.preventDefault();
  const input = elements.photoPassInput.value.trim();
  if (!input) {
    setAlbumMessage(elements.photoGateMessage, "请输入密码。", "error");
    return;
  }
  if (input !== readAlbumPass()) {
    setAlbumMessage(elements.photoGateMessage, "密码不对。", "error");
    elements.photoPassInput.select();
    return;
  }
  albumUnlocked = true;
  setAlbumMessage(elements.photoGateMessage, "", "");
  elements.photoPassInput.value = "";
  showPhotoAdminBody();
}

function submitPhotoPass(event) {
  event.preventDefault();
  const current = elements.photoOldPass.value.trim();
  const next = elements.photoNewPass.value.trim();
  if (current !== readAlbumPass()) {
    setAlbumMessage(elements.photoPassMessage, "当前密码不对。", "error");
    return;
  }
  if (next.length < 4 || next.length > 20) {
    setAlbumMessage(elements.photoPassMessage, "新密码要 4 到 20 位。", "error");
    return;
  }
  writeAlbumPass(next);
  elements.photoOldPass.value = "";
  elements.photoNewPass.value = "";
  elements.photoPassForm.hidden = true;
  setAlbumMessage(elements.photoPassMessage, "密码已更新，下次用新密码进入。", "ok");
}

function initPhotoAlbum() {
  if (!elements.photoPanel) return;

  elements.photoSearchForm.addEventListener("submit", runPhotoSearch);
  elements.photoAdminEntry.addEventListener("click", openPhotoAdmin);
  elements.photoGateForm.addEventListener("submit", submitPhotoGate);
  elements.photoUploadForm.addEventListener("submit", submitPhotoUpload);
  elements.photoPassForm.addEventListener("submit", submitPhotoPass);

  elements.photoChangePassButton.addEventListener("click", () => {
    elements.photoPassForm.hidden = !elements.photoPassForm.hidden;
    setAlbumMessage(elements.photoPassMessage, "");
    if (!elements.photoPassForm.hidden) elements.photoOldPass.focus();
  });

  elements.photoLockButton.addEventListener("click", () => {
    albumUnlocked = false;
    hidePhotoAdminBody();
    setAlbumMessage(elements.photoGateMessage, "已退出管理。", "ok");
  });

  elements.photoAdminDialog.addEventListener("close", () => {
    releaseListUrls();
    setAlbumMessage(elements.photoGateMessage, "");
    setAlbumMessage(elements.photoUploadMessage, "");
  });

  // 切到别的设施时收起相册，避免残留上一张图
  elements.photoSearchInput.addEventListener("input", () => {
    if (!elements.photoSearchInput.value.trim()) {
      hidePhotoResult();
      setAlbumMessage(elements.photoMessage, "", "");
    }
  });
}

function init() {
  renderProfile();
  renderSites();
  renderJournalMeta();
  bindEvents();
  initPhotoAlbum();
  loadBundledMusic();
  applyDarkness(state.darkness, false);
  renderWeatherStatus(state.weather);
  updateLocalClock();
  clockTimer = window.setInterval(updateLocalClock, 30000);
  initThreeWorlds();
  animateWorlds();
  if (state.location) refreshWeather(false);
  restoreMusicFiles();
  weatherRefreshTimer = window.setInterval(() => {
    if (state.location) refreshWeather(state.location, false);
  }, 10 * 60 * 1000);
}

function encodeState(payload) {
  try {
    return btoa(unescape(encodeURIComponent(payload)));
  } catch {
    return "";
  }
}

function decodeState(encoded) {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return null;
  }
}

// 浏览器存储不可用时的两条退路：window.name（同一预览框跨刷新）+ 地址栏
function readCarriedState() {
  try {
    const carried = window.name;
    if (typeof carried === "string" && carried.startsWith(CARRY_PREFIX)) {
      return carried.slice(CARRY_PREFIX.length);
    }
  } catch {
    /* window.name 不可用则继续尝试地址栏 */
  }

  const hash = window.location.hash || "";
  if (hash.startsWith(HASH_PREFIX)) {
    carryToHash = true;
    return decodeState(hash.slice(HASH_PREFIX.length));
  }
  return null;
}

function loadState() {
  const remembered = recallPlace();
  const fallback = {
    profile: { ...defaultProfile },
    notes: {},
    darkness: DEFAULT_DARKNESS,
    location: remembered,
    weather: null
  };

  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
    storageAvailable = true;
  } catch (error) {
    // 沙箱 iframe（预览面板）或浏览器禁用第三方存储时，这里会抛 SecurityError
    storageAvailable = false;
    storageError = (error && error.name) || "blocked";
  }
  if (!raw) raw = readCarriedState();

  try {
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return fallback;

    const storedName = cleanString(saved.profile?.name, defaultProfile.name);
    const storedTagline = cleanString(saved.profile?.tagline, defaultProfile.tagline);
    const profile = {
      name: storedName === legacyDefaults.name ? defaultProfile.name : storedName,
      tagline: storedTagline === legacyDefaults.tagline ? defaultProfile.tagline : storedTagline
    };

    const notes = {};
    if (saved.notes && typeof saved.notes === "object") {
      facilities.forEach((facility) => {
        const note = saved.notes[facility.id];
        if (!note || typeof note !== "object") return;
        const text = cleanString(note.text, "").slice(0, 500);
        if (!text) return;
        notes[facility.id] = {
          text,
          updatedAt: Number(note.updatedAt) || Date.now()
        };
      });
    }

    const location = normalizeSavedLocation(saved.location) || remembered;
    const weather = normalizeSavedWeather(saved.weather);

    return {
      profile,
      notes,
      darkness: Number.isFinite(Number(saved.darkness))
        ? Math.min(100, Math.max(0, Number(saved.darkness)))
        : DEFAULT_DARKNESS,
      location,
      weather
    };
  } catch {
    return fallback;
  }
}

function cleanString(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeSavedLocation(location) {
  if (!location || typeof location !== "object") return null;
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    name: cleanString(location.name, "当前位置"),
    detail: cleanString(location.detail, ""),
    latitude,
    longitude,
    timezone: cleanString(location.timezone, "auto")
  };
}

function normalizeSavedWeather(weather) {
  if (!weather || typeof weather !== "object") return null;
  const code = Number(weather.code);
  const temperature = Number(weather.temperature);
  if (!Number.isFinite(code) || !Number.isFinite(temperature)) return null;
  return {
    code,
    temperature,
    feelsLike: Number(weather.feelsLike),
    humidity: Number(weather.humidity),
    wind: Number(weather.wind),
    isDay: Boolean(weather.isDay),
    observedAt: Number(weather.observedAt) || Date.now()
  };
}


// 记住上次的城市：localStorage 会随预览端口变化失效，cookie 则按域名共享，能跨端口留住
const PLACE_COOKIE = "star-isle-place";

function rememberPlace(location) {
  const normalized = normalizeSavedLocation(location);
  if (!normalized) return;
  try {
    const value = encodeURIComponent(JSON.stringify(normalized));
    document.cookie = PLACE_COOKIE + "=" + value + "; max-age=" + 60 * 60 * 24 * 180 + "; path=/; SameSite=Lax";
  } catch (error) {
    // file:// 下 cookie 可能不可用，忽略即可，localStorage 仍是主存储
  }
}

function recallPlace() {
  try {
    const entry = document.cookie
      .split("; ")
      .find((item) => item.startsWith(PLACE_COOKIE + "="));
    if (!entry) return null;
    const raw = decodeURIComponent(entry.slice(PLACE_COOKIE.length + 1));
    return normalizeSavedLocation(JSON.parse(raw));
  } catch (error) {
    return null;
  }
}

function forgetPlace() {
  try {
    document.cookie = PLACE_COOKIE + "=; max-age=0; path=/";
  } catch (error) {
    // 忽略
  }
}

function persistState(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, payload);
    storageAvailable = true;
    return true;
  } catch {
    storageAvailable = false;
  }

  // 兜底 1：把状态写进地址栏，刷新（URL 不变）后仍能读回
  const encoded = encodeState(payload);
  if (encoded && encoded.length < 6000) {
    const base = window.location.pathname + window.location.search;
    try {
      window.history.replaceState(null, "", base + HASH_PREFIX + encoded);
      carryToHash = true;
    } catch {
      try {
        window.location.hash = HASH_PREFIX.slice(1) + encoded;
        carryToHash = true;
      } catch {
        carryToHash = false;
      }
    }
  }

  // 兜底 2：window.name 能在同一标签页/预览框内跨刷新保留
  try {
    window.name = CARRY_PREFIX + payload;
  } catch {
    /* 完全隔离的环境里只能留在内存 */
  }
  return false;
}

function saveState() {
  const ok = persistState(JSON.stringify(state));
  syncStorageHint();
  return ok;
}

function syncStorageHint() {
  const hint = elements.profileStorageHint;
  if (hint) {
    if (storageAvailable) {
      hint.textContent = "改动会保存在这台设备的浏览器里，下次打开还在。";
    } else if (carryToHash) {
      hint.textContent = "预览环境禁止网页存储，改动已写进当前页面地址，刷新后仍在。想永久保存，用浏览器直接打开这个 index.html 即可。";
    } else {
      hint.textContent = "预览环境禁止网页存储，改动只在当前页面有效。用浏览器直接打开这个 index.html 即可长期保存。";
    }
    hint.classList.toggle("is-warning", !storageAvailable);
  }
  elements.saveState.dataset.persisted = storageAvailable ? "1" : "0";
}

function renderProfile() {
  elements.headerParkName.textContent = state.profile.name;

  // 园门已改成场景里的三维牌坊，改名时重绘它的匾额贴图
  if (overviewWorld && overviewWorld.gate) {
    overviewWorld.gate.setSign(state.profile.name, state.profile.tagline);
  }

  document.title = `${state.profile.name} · 夜游`;
}

function renderSites() {
  elements.mapSites.innerHTML = facilities.map((facility) => {
    const note = state.notes[facility.id];
    return `
      <button
        type="button"
        class="map-site site-${facility.id}${note ? " has-note" : ""}"
        style="--accent:${facility.accent}"
        data-facility="${facility.id}"
        aria-label="${facility.name}${note ? "，查看并编辑项目简述" : "，进入特写并写下项目简述"}"
      >
        <span class="site-pin" aria-hidden="true">
          <span>${facility.number}</span>
        </span>
        <span class="site-label">
          <strong>${facility.name}</strong>
          <small>${facility.category}</small>
          ${note ? '<i class="site-note" aria-hidden="true"></i>' : ""}
        </span>
      </button>
    `;
  }).join("");
}

function bindEvents() {
  elements.mapSites.addEventListener("click", (event) => {
    const site = event.target.closest("[data-facility]");
    if (!site) return;
    lastFocusedSite = site;
    openFacility(site.dataset.facility);
  });

  elements.backButton.addEventListener("click", closeFacility);
  document.getElementById("brandButton").addEventListener("click", openProfile);
  document.getElementById("decorateButton").addEventListener("click", openProfile);
  document.getElementById("journalButton").addEventListener("click", openJournal);
  elements.weatherButton.addEventListener("click", openWeatherDialog);
  elements.useLocationButton.addEventListener("click", requestCurrentLocation);

  if (elements.weatherMemoryClear) {
    elements.weatherMemoryClear.addEventListener("click", () => {
      forgetPlace();
      renderWeatherMemory();
      showToast("已忘记这个城市，下次打开需要重新选择");
    });
  }
  elements.citySearchForm.addEventListener("submit", handleCitySearch);
  elements.cityResults.addEventListener("click", (event) => {
    const result = event.target.closest("[data-city-index]");
    if (!result) return;
    const location = citySearchResults[Number(result.dataset.cityIndex)];
    if (location) selectWeatherLocation(location);
  });
  elements.musicLibraryButton.addEventListener("click", openMusicDialog);
  elements.musicLibraryButton.addEventListener("click", (event) => event.stopPropagation());
  elements.chooseMusicFolderButton.addEventListener("click", chooseMusicFolder);
  elements.chooseMusicFilesButton.addEventListener("click", () => elements.musicFilesInput.click());
  elements.musicFilesInput.addEventListener("change", async (event) => {
    await importMusicFiles(Array.from(event.target.files || []));
    event.target.value = "";
  });
  elements.clearMusicLibrary.addEventListener("click", clearMusicLibrary);
  elements.musicToggle.addEventListener("click", toggleMusic);
  elements.musicNext.addEventListener("click", () => playRandomTrack());
  elements.musicStop.addEventListener("click", () => stopMusic(true));

  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog")?.close());
  });

  [elements.profileDialog, elements.journalDialog, elements.weatherDialog, elements.musicDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  elements.briefText.addEventListener("input", updateBriefCount);

  elements.briefForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeFacilityId) return;

    const text = elements.briefText.value.trim().slice(0, 500);
    if (!text) {
      elements.saveState.textContent = "至少留下一句话，再收好它。";
      elements.briefText.focus();
      return;
    }

    state.notes[activeFacilityId] = { text, updatedAt: Date.now() };
    const persisted = saveState();

    renderSites();
    positionMapMarkers();
    renderJournalMeta();
    elements.saveState.textContent = persisted ? "已经收进园长手记" : "已更新 · 本次预览有效";
    elements.clearBriefButton.hidden = false;
    showToast(
      persisted
        ? "这段话已经留在这个夜晚"
        : carryToHash
          ? "已收录，并写进了当前页面地址"
          : "已更新（当前环境不保存）"
    );
  });

  elements.clearBriefButton.addEventListener("click", () => {
    if (!activeFacilityId || !state.notes[activeFacilityId]) return;
    const facility = facilities.find((item) => item.id === activeFacilityId);
    if (!window.confirm(`要清空“${facility.name}”的项目简述吗？`)) return;

    delete state.notes[activeFacilityId];
    saveState();

    elements.briefText.value = "";
    updateBriefCount();
    elements.saveState.textContent = "";
    elements.clearBriefButton.hidden = true;
    renderSites();
    positionMapMarkers();
    renderJournalMeta();
    showToast("这枚手记已经收起");
  });

  elements.profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    // 允许只改其中一项：留空的字段沿用原值，不再因为空值而拒绝保存
    const rawName = elements.parkNameInput.value.trim().slice(0, 24);
    const rawTagline = elements.parkTaglineInput.value.trim().slice(0, 80);
    const name = rawName || state.profile.name || defaultProfile.name;
    const tagline = rawTagline || state.profile.tagline || defaultProfile.tagline;

    if (!rawName && !rawTagline) {
      showToast("至少写下乐园名称或一句欢迎语");
      elements.parkNameInput.focus();
      return;
    }

    state.profile = { name, tagline };
    const persisted = saveState();

    elements.parkNameInput.value = name;
    elements.parkTaglineInput.value = tagline;
    elements.profileCharacterCount.textContent = `${tagline.length} / 80`;
    renderProfile();
    elements.profileDialog.close();
    showToast(
      persisted
        ? "新招牌已经亮起来了"
        : carryToHash
          ? "招牌已更新，并写进了当前页面地址"
          : "招牌已更新（当前环境不保存）"
    );
  });

  elements.parkTaglineInput.addEventListener("input", () => {
    elements.profileCharacterCount.textContent = `${elements.parkTaglineInput.value.length} / 80`;
  });

  elements.darknessSlider.addEventListener("input", (event) => {
    applyDarkness(event.target.value, false);
    window.clearTimeout(darknessSaveTimer);
    darknessSaveTimer = window.setTimeout(() => saveState(), 180);
  });

  window.addEventListener("resize", resizeWorlds);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && elements.focusView.classList.contains("is-active")) {
      closeFacility();
    }
  });
}

function applyDarkness(value, persist = false) {
  const darkness = Math.min(100, Math.max(0, Number(value) || 0));
  state.darkness = darkness;
  const baseExposure = 0.6 + Math.pow(1 - darkness / 100, 0.9) * 0.56;
  const exposure = baseExposure * (state.weather?.isDay ? 1.0 : 1);
  const photoExposure = exposure * 0.63;

  document.documentElement.style.setProperty("--scene-exposure", exposure.toFixed(3));
  document.documentElement.style.setProperty("--photo-exposure", photoExposure.toFixed(3));
  if (elements.darknessSlider) {
    elements.darknessSlider.value = String(Math.round(darkness));
    elements.darknessSlider.style.setProperty("--darkness", darkness);
    elements.darknessSlider.setAttribute("aria-valuetext", `暗度 ${Math.round(darkness)}%`);
  }
  if (elements.darknessValue) {
    elements.darknessValue.textContent = `${Math.round(darkness)}%`;
  }
  if (persist) saveState();
}

function renderWeatherMemory() {
  if (!elements.weatherMemory) return;
  const remembered = state.location || recallPlace();
  if (!remembered) {
    elements.weatherMemory.hidden = true;
    return;
  }
  const label = remembered.detail
    ? remembered.name + " · " + remembered.detail
    : remembered.name;
  elements.weatherMemoryPlace.textContent = label;
  elements.weatherMemory.hidden = false;
}

function openWeatherDialog() {
  elements.weatherDialog.showModal();
  elements.weatherMessage.textContent = "";
  renderWeatherMemory();
  if (state.location && state.weather) {
    renderWeatherDetails(state.location, state.weather);
  }
  window.setTimeout(() => {
    if (!state.location) elements.citySearchInput.focus();
  }, 80);
}

async function requestCurrentLocation() {
  if (!navigator.geolocation) {
    elements.weatherMessage.textContent = "这个浏览器不支持定位，请直接搜索城市。";
    elements.citySearchInput.focus();
    return;
  }

  elements.useLocationButton.disabled = true;
  elements.weatherMessage.textContent = "正在获取当前位置…";

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 300000
      });
    });

    let city = "当前位置";
    let detail = "";
    try {
      const reverse = await fetchJson(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=zh`
      );
      city = reverse.city || reverse.locality || reverse.principalSubdivision || city;
      detail = [reverse.principalSubdivision, reverse.countryName]
        .filter(Boolean)
        .filter((item, index, items) => items.indexOf(item) === index)
        .join(" · ");
    } catch {
      // Coordinates are still enough for a weather request.
    }

    await selectWeatherLocation({
      name: city,
      detail,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      timezone: "auto"
    });
  } catch (error) {
    const denied = error?.code === 1;
    elements.weatherMessage.textContent = denied
      ? "没有获得定位权限，可以在下方搜索城市。"
      : "暂时无法获取当前位置，请直接搜索城市。";
    elements.citySearchInput.focus();
  } finally {
    elements.useLocationButton.disabled = false;
  }
}

async function handleCitySearch(event) {
  event.preventDefault();
  const query = elements.citySearchInput.value.trim();
  if (!query) {
    elements.weatherMessage.textContent = "请输入一个城市名称。";
    return;
  }

  const submitButton = elements.citySearchForm.querySelector("button");
  submitButton.disabled = true;
  elements.weatherMessage.textContent = "正在查找城市…";
  elements.cityResults.innerHTML = "";

  try {
    const data = await fetchJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=zh&format=json`
    );
    citySearchResults = (data.results || []).map((result) => ({
      name: result.name,
      detail: [result.admin1, result.country].filter(Boolean).join(" · "),
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone || "auto"
    }));

    if (!citySearchResults.length) {
      elements.weatherMessage.textContent = "没有找到这个城市，换一个名称试试。";
      return;
    }

    elements.weatherMessage.textContent = "选择一个城市：";
    elements.cityResults.innerHTML = citySearchResults.map((location, index) => `
      <button type="button" role="option" data-city-index="${index}">
        <strong>${escapeHtml(location.name)}</strong>
        <span>${escapeHtml(location.detail)}</span>
      </button>
    `).join("");
  } catch {
    elements.weatherMessage.textContent = "城市搜索失败，请检查网络后再试。";
  } finally {
    submitButton.disabled = false;
  }
}

async function selectWeatherLocation(location) {
  const success = await refreshWeather(location);
  if (success) {
    elements.cityResults.innerHTML = "";
    elements.citySearchInput.value = "";
    elements.weatherDialog.close();
  }
}

async function refreshWeather(location = state.location, showFeedback = true) {
  if (!location) return false;
  weatherAbortController?.abort();
  weatherAbortController = new AbortController();
  const timeout = window.setTimeout(() => weatherAbortController.abort(), 14000);

  try {
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      current: "temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m,relative_humidity_2m",
      timezone: "auto"
    });
    const data = await fetchJson(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      weatherAbortController.signal
    );
    const current = data.current;
    const weather = {
      code: Number(current.weather_code),
      temperature: Number(current.temperature_2m),
      feelsLike: Number(current.apparent_temperature),
      humidity: Number(current.relative_humidity_2m),
      wind: Number(current.wind_speed_10m),
      isDay: Boolean(current.is_day),
      observedAt: Date.now(),
      timezone: data.timezone || location.timezone || "auto"
    };

    state.location = {
      ...location,
      timezone: weather.timezone
    };
    state.weather = weather;
    rememberPlace(state.location);
    saveState();
    renderWeatherStatus(weather);
    renderWeatherDetails(state.location, weather);
    renderWeatherMemory();
    updateLocalClock();
    if (showFeedback) showToast(`已同步 ${state.location.name} 的天气`);
    return true;
  } catch {
    elements.weatherMessage.textContent = "暂时无法获取天气。可以检查网络后重试。";
    if (state.weather) {
      renderWeatherStatus(state.weather);
      renderWeatherDetails(state.location, state.weather);
    }
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

function weatherMeta(code, isDay) {
  if (code === 0) return { key: "clear", label: isDay ? "晴朗" : "晴夜", icon: isDay ? "☀" : "☾" };
  if (code === 1) return { key: "clear", label: "大致晴朗", icon: isDay ? "☀" : "☾" };
  if (code === 2) return { key: "partly", label: "局部多云", icon: "◐" };
  if (code === 3) return { key: "cloudy", label: "阴", icon: "☁" };
  if (code === 45 || code === 48) return { key: "fog", label: "有雾", icon: "≋" };
  if ([51, 53, 55, 56, 57].includes(code)) return { key: "rain", label: "细雨", icon: "☂" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { key: "rain", label: "有雨", icon: "☂" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { key: "snow", label: "有雪", icon: "❄" };
  if ([95, 96, 99].includes(code)) return { key: "storm", label: "雷雨", icon: "ϟ" };
  return { key: "cloudy", label: "天气变化中", icon: "◌" };
}

function renderWeatherStatus(weather) {
  if (!weather) return;
  const meta = weatherMeta(weather.code, weather.isDay);
  elements.weatherSymbol.textContent = meta.icon;
  elements.weatherPlace.textContent = state.location?.name || "当前位置";
  elements.weatherReading.textContent = `${Math.round(weather.temperature)}°`;
  elements.weatherButton.setAttribute(
    "aria-label",
    `${state.location?.name || "当前位置"}，${meta.label}，${Math.round(weather.temperature)}摄氏度，打开天气设置`
  );
  elements.appShell.dataset.weather = meta.key;
  elements.appShell.dataset.period = weather.isDay ? "day" : "night";
  elements.periodLabel.textContent = weather.isDay
    ? "STAR ISLE · DAYLIGHT"
    : "STAR ISLE · AFTER HOURS";
  applySkyPeriod(Boolean(weather.isDay));
  applyDarkness(state.darkness, false);
}

function renderWeatherDetails(location, weather) {
  if (!location || !weather) {
    elements.weatherNow.hidden = true;
    elements.weatherDetails.hidden = true;
    return;
  }

  const meta = weatherMeta(weather.code, weather.isDay);
  elements.weatherNow.hidden = false;
  elements.weatherDetails.hidden = false;
  elements.weatherNowIcon.textContent = meta.icon;
  elements.weatherNowPlace.textContent = [location.name, location.detail].filter(Boolean).join(" · ");
  elements.weatherNowConditions.textContent = `${meta.label} · 数据来自 Open-Meteo`;
  elements.weatherNowTemp.textContent = `${Math.round(weather.temperature)}°`;
  elements.weatherFeels.textContent = `${Math.round(weather.feelsLike)}°C`;
  elements.weatherHumidity.textContent = `${Math.round(weather.humidity)}%`;
  elements.weatherWind.textContent = `${Math.round(weather.wind)} km/h`;
}

function isDaytimeNow() {
  if (state.weather && typeof state.weather.isDay === "boolean") return state.weather.isDay;
  try {
    const timeZone = state.location?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const hour = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hour12: false
    }).format(new Date()));
    return hour >= 6 && hour < 18;
  } catch (error) {
    return false;
  }
}

function updateLocalClock() {
  const timeZone = state.location?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    elements.localWeatherTime.textContent = new Intl.DateTimeFormat("zh-CN", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(new Date());
  } catch {
    elements.localWeatherTime.textContent = new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  if (!state.weather) {
    try {
      const hour = Number(new Intl.DateTimeFormat("en-GB", {
        timeZone,
        hour: "2-digit",
        hour12: false
      }).format(new Date()));
      const day = hour >= 6 && hour < 18;
      elements.appShell.dataset.period = day ? "day" : "night";
      elements.periodLabel.textContent = day
        ? "STAR ISLE · DAYLIGHT"
        : "STAR ISLE · AFTER HOURS";
      applySkyPeriod(day);
    } catch {
      // Keep the default period if the browser rejects the time zone.
    }
  }
}

const LEGACY_MUSIC_TRACKS = [
  {
    title: "月蚀圆舞曲",
    bpm: 64,
    chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [50, 53, 57, 60]],
    melody: [69, 72, 76, 74, 72, 69, 67, 71, 69, 64, 67, 72]
  },
  {
    title: "雾中的第八格",
    bpm: 57,
    chords: [[52, 55, 59, 62], [48, 52, 55, 59], [50, 53, 57, 60], [55, 59, 62, 65]],
    melody: [64, 67, 71, 69, 67, 64, 62, 66, 64, 59, 62, 67]
  },
  {
    title: "夜风经过",
    bpm: 70,
    chords: [[57, 60, 64, 69], [55, 59, 62, 67], [53, 57, 60, 65], [52, 55, 59, 64]],
    melody: [69, 76, 72, 79, 76, 72, 71, 74, 71, 67, 69, 64]
  },
  {
    title: "无人广场",
    bpm: 60,
    chords: [[50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 58], [45, 48, 52, 55]],
    melody: [62, 69, 65, 72, 69, 65, 64, 67, 64, 60, 62, 57]
  }
];

async function playLegacyRandomTrack(cabinIndex = null) {
  const context = ensureMusicEngine();
  if (!context) {
    showToast("当前浏览器无法播放音乐");
    return;
  }

  try {
    await context.resume();
  } catch {
    showToast("浏览器阻止了音乐播放，请再点一次");
    return;
  }

  let nextIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
  if (nextIndex === currentTrackIndex && MUSIC_TRACKS.length > 1) {
    nextIndex = (nextIndex + 1) % MUSIC_TRACKS.length;
  }
  currentTrackIndex = nextIndex;
  selectedCabinIndex = cabinIndex === null
    ? Math.floor(Math.random() * 12)
    : Number(cabinIndex);
  musicPaused = false;
  startMusicScheduler();

  elements.trackTitle.textContent = MUSIC_TRACKS[currentTrackIndex].title;
  elements.musicPlayer.hidden = false;
  elements.focusVisual.classList.add("music-playing");
  elements.musicToggle.textContent = "Ⅱ";
  elements.musicToggle.setAttribute("aria-label", "暂停音乐");
  document.querySelector(".equalizer")?.classList.remove("is-paused");
}

function ensureLegacyMusicEngine() {
  if (musicContext) return musicContext;
  const AudioConstructor = window.AudioContext || window.webkitAudioContext;
  if (!AudioConstructor) return null;

  musicContext = new AudioConstructor();
  musicMaster = musicContext.createGain();
  musicMaster.gain.value = 0;

  const compressor = musicContext.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.03;
  compressor.release.value = 0.4;

  musicDelay = musicContext.createDelay(1.2);
  musicDelay.delayTime.value = 0.27;
  const feedback = musicContext.createGain();
  feedback.gain.value = 0.2;
  const wet = musicContext.createGain();
  wet.gain.value = 0.16;

  musicMaster.connect(compressor);
  musicMaster.connect(musicDelay);
  musicDelay.connect(feedback);
  feedback.connect(musicDelay);
  musicDelay.connect(wet);
  wet.connect(compressor);
  compressor.connect(musicContext.destination);
  return musicContext;
}

function startLegacyMusicScheduler() {
  if (!musicContext || !musicMaster) return;
  window.clearInterval(musicScheduler);

  const track = MUSIC_TRACKS[currentTrackIndex];
  const beat = 60 / track.bpm;
  let nextChordTime = musicContext.currentTime + 0.08;
  let chordStep = 0;
  let melodyStep = 0;

  musicMaster.gain.cancelScheduledValues(musicContext.currentTime);
  musicMaster.gain.setValueAtTime(Math.max(0.0001, musicMaster.gain.value), musicContext.currentTime);
  musicMaster.gain.linearRampToValueAtTime(0.18, musicContext.currentTime + 0.7);

  const schedule = () => {
    while (nextChordTime < musicContext.currentTime + 0.55) {
      const chord = track.chords[chordStep % track.chords.length];
      chord.forEach((note, index) => {
        playSynthNote(note, nextChordTime + index * 0.015, beat * 3.7, 0.021, "triangle");
      });
      playSynthNote(chord[0] - 12, nextChordTime, beat * 3.9, 0.045, "sine");

      for (let index = 0; index < 4; index += 1) {
        const note = track.melody[(melodyStep + index) % track.melody.length];
        playSynthNote(note, nextChordTime + index * beat, beat * 0.62, 0.024, "sine");
      }

      chordStep += 1;
      melodyStep += 4;
      nextChordTime += beat * 4;
    }
  };

  schedule();
  musicScheduler = window.setInterval(schedule, 120);
}

function playLegacySynthNote(midi, start, duration, volume, type) {
  if (!musicContext || !musicMaster) return;
  const oscillator = musicContext.createOscillator();
  const envelope = musicContext.createGain();
  const filter = musicContext.createBiquadFilter();
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(type === "sine" ? 1800 : 1200, start);
  filter.Q.value = 0.7;

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.linearRampToValueAtTime(volume, start + 0.055);
  envelope.gain.setTargetAtTime(volume * 0.62, start + 0.08, duration * 0.32);
  envelope.gain.linearRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(musicMaster);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.08);
}

function toggleLegacyMusic() {
  if (!musicContext || currentTrackIndex < 0) return;
  if (musicContext.state === "running") {
    musicContext.suspend();
    musicPaused = true;
    elements.musicToggle.textContent = "▶";
    elements.musicToggle.setAttribute("aria-label", "继续播放");
    document.querySelector(".equalizer")?.classList.add("is-paused");
  } else {
    musicContext.resume();
    musicPaused = false;
    elements.musicToggle.textContent = "Ⅱ";
    elements.musicToggle.setAttribute("aria-label", "暂停音乐");
    document.querySelector(".equalizer")?.classList.remove("is-paused");
  }
}

function stopLegacyMusic(hidePlayer = false) {
  window.clearInterval(musicScheduler);
  musicScheduler = null;
  if (musicContext && musicMaster) {
    const now = musicContext.currentTime;
    musicMaster.gain.cancelScheduledValues(now);
    musicMaster.gain.setValueAtTime(Math.max(0.0001, musicMaster.gain.value), now);
    musicMaster.gain.linearRampToValueAtTime(0.0001, now + 0.16);
  }
  currentTrackIndex = -1;
  musicPaused = false;
  if (hidePlayer) {
    elements.musicPlayer.hidden = true;
    elements.focusVisual.classList.remove("music-playing");
    document.querySelector(".equalizer")?.classList.remove("is-paused");
  }
}

function openMusicDialog() {
  elements.musicDialog.showModal();
  renderMusicLibrary();
  if (!elements.musicLibraryMessage.textContent && userMusicTracks.length) {
    elements.musicLibraryMessage.textContent = `当前载入 ${userMusicTracks.length} 首音乐，点击摩天轮轿厢即可随机播放。`;
  }
}

async function chooseMusicFolder() {
  if (!("showDirectoryPicker" in window)) {
    elements.musicLibraryMessage.textContent = "当前浏览器不支持文件夹授权，请选择音乐文件。";
    elements.musicFilesInput.click();
    return;
  }

  try {
    const directory = await window.showDirectoryPicker({
      id: "star-isle-music",
      mode: "read",
      startIn: "desktop"
    });
    elements.musicLibraryMessage.textContent = "正在读取音乐文件…";
    const files = await collectAudioFiles(directory);
    await importMusicFiles(files);
  } catch (error) {
    if (error?.name !== "AbortError") {
      elements.musicLibraryMessage.textContent = "无法打开音乐文件夹，请改用“选择文件”。";
    }
  }
}

async function collectAudioFiles(directory, depth = 0) {
  const files = [];
  for await (const entry of directory.values()) {
    if (entry.kind === "file") {
      const file = await entry.getFile();
      if (isAudioFile(file)) files.push(file);
    } else if (entry.kind === "directory" && depth < 2) {
      files.push(...await collectAudioFiles(entry, depth + 1));
    }
  }
  return files;
}

function isAudioFile(file) {
  return file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(file.name);
}

async function importMusicFiles(files) {
  const audioFiles = files.filter(isAudioFile);
  if (!audioFiles.length) {
    elements.musicLibraryMessage.textContent = "这个文件夹里没有可播放的音频文件。";
    return;
  }

  stopMusic(true);
  revokeMusicUrls();
  userMusicTracks = audioFiles
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
    .map((file, index) => ({
      id: index,
      name: file.name.replace(/\.[^.]+$/, ""),
      extension: file.name.split(".").pop()?.toUpperCase() || "AUDIO",
      url: URL.createObjectURL(file),
      size: file.size
    }));
  userMusicUrls = userMusicTracks.map((track) => track.url);
  elements.musicLibraryMessage.textContent = `已读取 ${userMusicTracks.length} 首音乐，点击摩天轮轿厢即可随机播放。`;
  renderMusicLibrary();
  showToast(`歌单已载入 ${userMusicTracks.length} 首音乐`);
  persistMusicFiles(audioFiles).catch(() => {});
}

function renderMusicLibrary() {
  elements.musicLibraryCount.textContent = `${userMusicTracks.length} 首音乐`;
  elements.clearMusicLibrary.hidden = !userMusicTracks.some((track) => !track.bundled);
  if (!userMusicTracks.length) {
    elements.musicLibraryList.innerHTML = `
      <div class="music-library-empty">歌单还是空的。选择桌面上的“音乐”文件夹后，这里会列出你的歌曲。</div>
    `;
    return;
  }

  elements.musicLibraryList.innerHTML = userMusicTracks.map((track, index) => `
    <div class="music-library-item">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong title="${escapeHtml(track.name)}">${escapeHtml(track.name)}</strong>
      <small>${track.artist ? `${escapeHtml(track.artist)} · ` : ""}${escapeHtml(track.extension)} · ${formatFileSize(track.size)}</small>
    </div>
  `).join("");
}

function loadBundledMusic() {
  const playlist = Array.isArray(window.STAR_ISLE_BUNDLED_PLAYLIST)
    ? window.STAR_ISLE_BUNDLED_PLAYLIST
    : [];
  const musicDirectory = new URL("assets/music/", document.baseURI);

  userMusicTracks = playlist
    .map((track, index) => {
      const file = typeof track?.file === "string" ? track.file.trim() : "";
      if (!file) return null;
      return {
        id: index,
        name: track.title || file.replace(/\.[^.]+$/, ""),
        artist: track.artist || "",
        extension: file.split(".").pop()?.toUpperCase() || "AUDIO",
        url: new URL(file, musicDirectory).href,
        size: Number(track.size) || 0,
        bundled: true
      };
    })
    .filter(Boolean);

  userMusicUrls = userMusicTracks.map((track) => track.url);
  renderMusicLibrary();
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function playRandomTrack(cabinIndex = null) {
  if (!userMusicTracks.length) {
    openMusicDialog();
    elements.musicLibraryMessage.textContent = "请先选择桌面上的“音乐”文件夹，再点击轿厢。";
    return;
  }

  let nextIndex = Math.floor(Math.random() * userMusicTracks.length);
  if (nextIndex === activeMusicTrackIndex && userMusicTracks.length > 1) {
    nextIndex = (nextIndex + 1) % userMusicTracks.length;
  }
  playMusicTrack(nextIndex, cabinIndex);
}

async function playMusicTrack(index, cabinIndex = null) {
  const track = userMusicTracks[index];
  if (!track) return;

  if (!currentAudio) {
    currentAudio = new Audio();
    currentAudio.preload = "metadata";
  }

  musicPlayToken += 1;
  const token = musicPlayToken;
  currentAudio.pause();
  currentAudio.src = track.url;
  currentAudio.volume = 0.72;
  currentAudio.onended = () => {
    if (token === musicPlayToken) playRandomTrack();
  };

  activeMusicTrackIndex = index;
  selectedCabinIndex = cabinIndex === null
    ? Math.floor(Math.random() * 12)
    : Number(cabinIndex);
  musicPaused = false;
  elements.trackTitle.textContent = track.name;
  elements.musicPlayer.hidden = false;
  elements.focusVisual.classList.add("music-playing");
  elements.musicToggle.textContent = "Ⅱ";
  elements.musicToggle.setAttribute("aria-label", "暂停音乐");
  document.querySelector(".equalizer")?.classList.remove("is-paused");

  try {
    await currentAudio.play();
  } catch {
    showToast("浏览器阻止了播放，请再次点击轿厢");
  }
}

function toggleMusic() {
  if (!currentAudio || activeMusicTrackIndex < 0) return;
  if (currentAudio.paused) {
    currentAudio.play().catch(() => showToast("暂时无法继续播放"));
    musicPaused = false;
    elements.musicToggle.textContent = "Ⅱ";
    elements.musicToggle.setAttribute("aria-label", "暂停音乐");
    document.querySelector(".equalizer")?.classList.remove("is-paused");
  } else {
    currentAudio.pause();
    musicPaused = true;
    elements.musicToggle.textContent = "▶";
    elements.musicToggle.setAttribute("aria-label", "继续播放");
    document.querySelector(".equalizer")?.classList.add("is-paused");
  }
}

function stopMusic(hidePlayer = false) {
  musicPlayToken += 1;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute("src");
    currentAudio.load();
  }
  activeMusicTrackIndex = -1;
  musicPaused = false;
  if (hidePlayer) {
    elements.musicPlayer.hidden = true;
    elements.focusVisual.classList.remove("music-playing");
    document.querySelector(".equalizer")?.classList.remove("is-paused");
    selectedCabinIndex = null;
  }
}

function clearMusicLibrary() {
  if (!window.confirm("只清除你后来载入的个人歌单，并恢复网站内置歌单。要继续吗？")) return;
  stopMusic(true);
  revokeMusicUrls();
  activeMusicTrackIndex = -1;
  loadBundledMusic();
  elements.musicLibraryMessage.textContent = userMusicTracks.length
    ? `已恢复内置歌单，共 ${userMusicTracks.length} 首音乐。`
    : "歌单已清除，可以重新选择音乐文件夹。";
  deletePersistedMusicFiles().catch(() => {});
}

function revokeMusicUrls() {
  userMusicUrls.forEach((url) => {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  });
  userMusicUrls = [];
}

function openMusicDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("star-isle-music", 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("library")) database.createObjectStore("library");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function persistMusicFiles(files) {
  const database = await openMusicDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("library", "readwrite");
    transaction.objectStore("library").put(files, "files");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

async function restoreMusicFiles() {
  try {
    const database = await openMusicDatabase();
    const files = await new Promise((resolve, reject) => {
      const request = database.transaction("library", "readonly").objectStore("library").get("files");
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (Array.isArray(files) && files.length) {
      const current = userMusicTracks;
      if (!current.length) {
        await importMusicFiles(files);
      }
    }
  } catch {
    // File-picker playback still works when persistent storage is unavailable.
  }
}

async function deletePersistedMusicFiles() {
  const database = await openMusicDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction("library", "readwrite");
    transaction.objectStore("library").delete("files");
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
}

function findCabinAtPointer(event) {
  if (activeFacilityId !== "ferris" || !activeModel?.cabins || !focusWorld) return null;
  const rect = elements.focusCanvas.getBoundingClientRect();
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, focusWorld.camera);
  const hitTargets = activeModel.cabins.map(({ group }) => group);
  const intersections = raycaster.intersectObjects(hitTargets, true);
  for (const intersection of intersections) {
    let object = intersection.object;
    while (object && object !== activeModel.group) {
      if (Number.isInteger(object.userData?.cabinIndex)) {
        return object.userData.cabinIndex;
      }
      object = object.parent;
    }
  }
  return null;
}

function openFacility(id) {
  const facility = facilities.find((item) => item.id === id);
  if (!facility) return;

  if (id !== "ferris") stopMusic(true);
  selectedCabinIndex = null;
  activeFacilityId = id;
  activeModel = focusWorld?.rides[id] || null;
  const note = state.notes[id];

  if (focusWorld) {
    for (const ride of Object.values(focusWorld.rides)) ride.group.visible = false;
    if (activeModel) {
      activeModel.group.visible = true;
      focusWorld.orbit.targetX = facility.focusTargetX || 0;
      focusWorld.orbit.targetY = facility.focusTarget;
      focusWorld.orbit.targetZ = facility.focusTargetZ || 0;
      focusWorld.orbit.distance = facility.focusDistance;
      focusWorld.orbit.yaw = facility.focusYaw ?? -0.38;
      focusWorld.orbit.pitch = facility.focusPitch ?? 0.18;
      updateOrbitCamera(focusWorld);
    }
    resizeRenderer(focusWorld);
    if (activeModel) fitFocusToModel(activeModel, focusWorld);
  }

  elements.focusIndex.textContent = `${facility.number} / 06`;
  elements.focusCounter.textContent = `${facility.number} / 06`;
  elements.focusCategory.textContent = facility.category;
  elements.focusEyebrow.textContent = `快乐坐标 · ${facility.number}`;
  elements.focusTitle.textContent = facility.name;
  elements.focusSubtitle.textContent = facility.subtitle;
  elements.focusLore.textContent = facility.lore;
  elements.briefText.value = note?.text || "";
  elements.saveState.textContent = note ? "已保存，可以继续修改" : "";
  elements.clearBriefButton.hidden = !note;
  elements.cabinHint.hidden = id !== "ferris";
  const albumFacility = id === "carousel";
  elements.photoPanel.hidden = !albumFacility;
  if (albumFacility) {
    elements.photoSearchInput.value = "";
    updatePhotoStorageHint();
    hidePhotoResult();
    setAlbumMessage(elements.photoMessage, "", "");
  }
  elements.focusVisual.classList.remove("music-playing");
  elements.focusCopy.scrollTop = 0;
  updateBriefCount();

  elements.overviewView.classList.add("is-hidden");
  elements.overviewView.setAttribute("aria-hidden", "true");
  elements.focusView.classList.add("is-active");
  elements.focusView.setAttribute("aria-hidden", "false");
  elements.appShell.classList.add("focus-open");
  window.setTimeout(() => elements.backButton.focus({ preventScroll: true }), 420);
}

function closeFacility() {
  stopMusic(true);
  elements.focusView.classList.remove("is-active");
  elements.focusView.setAttribute("aria-hidden", "true");
  elements.overviewView.classList.remove("is-hidden");
  elements.overviewView.setAttribute("aria-hidden", "false");
  elements.appShell.classList.remove("focus-open");
  if (elements.photoPanel) elements.photoPanel.hidden = true;
  activeFacilityId = null;
  activeModel = null;
  selectedCabinIndex = null;
  window.setTimeout(() => {
    resizeRenderer(overviewWorld);
    lastFocusedSite?.focus({ preventScroll: true });
  }, 160);
}

function updateBriefCount() {
  elements.characterCount.textContent = `${elements.briefText.value.length} / 500`;
}

function openProfile() {
  elements.parkNameInput.value = state.profile.name;
  elements.parkTaglineInput.value = state.profile.tagline;
  elements.profileCharacterCount.textContent = `${state.profile.tagline.length} / 80`;
  syncStorageHint();
  elements.profileDialog.showModal();
  window.setTimeout(() => elements.parkNameInput.focus(), 80);
}

function openJournal() {
  renderJournal();
  elements.journalDialog.showModal();
}

function renderJournalMeta() {
  const count = Object.keys(state.notes).length;
  elements.journalCount.textContent = String(count);
  elements.journalCount.setAttribute("aria-label", `${count} 条简述`);
}

function renderJournal() {
  const entries = facilities
    .filter((facility) => state.notes[facility.id])
    .sort((a, b) => state.notes[b.id].updatedAt - state.notes[a.id].updatedAt);

  elements.journalTotal.textContent = `${entries.length} 条`;

  if (!entries.length) {
    elements.journalList.innerHTML = `
      <div class="empty-journal">
        <span>✦</span>
        <p>手记还是空白的。夜色里还有六处地方等你走进去。</p>
      </div>
    `;
    return;
  }

  elements.journalList.innerHTML = entries.map((facility) => {
    const note = state.notes[facility.id];
    return `
      <button
        type="button"
        class="journal-entry"
        style="--entry-accent:${facility.accent}"
        data-journal-facility="${facility.id}"
      >
        <span class="entry-place">
          <strong>${facility.name}</strong>
          <small>${formatDate(note.updatedAt)}</small>
        </span>
        <span class="entry-brief">${escapeHtml(note.text)}</span>
        <span class="entry-action">回到特写 ↗</span>
      </button>
    `;
  }).join("");

  elements.journalList.querySelectorAll("[data-journal-facility]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.journalFacility;
      elements.journalDialog.close();
      window.setTimeout(() => {
        lastFocusedSite = elements.mapSites.querySelector(`[data-facility="${id}"]`);
        openFacility(id);
      }, 120);
    });
  });
}

function formatDate(timestamp) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("show"), 2400);
}

/* ---------- Three.js scene ---------- */


// 昼夜切换：天空贴图、雾、太阳与环境反射一起换，白天不再挂着月亮和星星
var skyPeriod = "night";

var skyApplied = false;
var skyKind = "clear";
var skyCode = null;

// 每种天气对应的天空配方：云量、雾浓度、太阳与月亮是否露面
var SKY_PRESETS = {
  clear: { clouds: 6, cloudAlpha: 0.5, fogDay: 0.0038, fogNight: 0.0095, sun: 1, moon: true },
  partly: { clouds: 15, cloudAlpha: 0.55, fogDay: 0.0042, fogNight: 0.0102, sun: 0.82, moon: true },
  cloudy: { clouds: 24, cloudAlpha: 0.62, fogDay: 0.0052, fogNight: 0.0112, sun: 0, moon: false },
  fog: { clouds: 10, cloudAlpha: 0.32, fogDay: 0.0135, fogNight: 0.0155, sun: 0, moon: false },
  rain: { clouds: 26, cloudAlpha: 0.66, fogDay: 0.0065, fogNight: 0.0125, sun: 0, moon: false },
  snow: { clouds: 22, cloudAlpha: 0.6, fogDay: 0.0075, fogNight: 0.013, sun: 0, moon: false },
  storm: { clouds: 28, cloudAlpha: 0.72, fogDay: 0.0085, fogNight: 0.014, sun: 0, moon: false }
};

// 当前天气归类；没有天气数据时按晴朗处理
function currentSkyKind() {
  if (!state.weather) return "clear";
  return weatherMeta(state.weather.code, state.weather.isDay).key;
}

// 昼夜 + 天气一起决定天空：贴图、太阳、月亮、云量、雾、光照、调色
function applySkyPeriod(isDay) {
  const kind = currentSkyKind();
  const preset = SKY_PRESETS[kind] || SKY_PRESETS.clear;
  const period = isDay ? "day" : "night";
  const code = state.weather ? state.weather.code : 61;
  if (skyApplied && period === skyPeriod && kind === skyKind && code === skyCode) return;
  skyPeriod = period;
  skyKind = kind;
  skyCode = code;
  document.documentElement.dataset.skyPeriod = period;
  document.documentElement.dataset.skyKind = kind;

  const overcast = kind === "cloudy" || kind === "fog" || kind === "rain" || kind === "snow" || kind === "storm";

  [overviewWorld, focusWorld].forEach((world) => {
    if (!world) return;
    if (world.skyDome) {
      world.skyDome.material.map = isDay ? getDaySkyTexture(overcast) : getSkyDomeTexture();
      world.skyDome.material.color.setHex(isDay ? 0xffffff : overcast ? 0x828c9e : 0xffffff);
      world.skyDome.material.needsUpdate = true;
    }
    if (world.moonGroup) world.moonGroup.visible = !isDay && preset.moon;
    if (world.sunGroup) world.sunGroup.visible = Boolean(isDay) && preset.sun > 0;
    if (world.cloudLayer) {
      const visibleCount = Math.min(world.cloudLayer.children.length, preset.clouds);
      const tint = isDay ? (overcast ? 0xc7d0d6 : 0xffffff) : overcast ? 0x4a5464 : 0x5b6577;
      world.cloudLayer.children.forEach((cloud, index) => {
        cloud.visible = index < visibleCount;
        cloud.children.forEach((puff) => {
          puff.material.color.setHex(tint);
          puff.material.opacity = preset.cloudAlpha * (isDay ? 1 : 0.55);
        });
      });
      world.cloudLayer.visible = visibleCount > 0;
    }
    const wet = kind === "rain" || kind === "storm";
    (world.scene.userData.groundMaterials || []).forEach((material) => {
      material.roughness = wet ? 0.62 : 0.95;
      material.metalness = wet ? 0.12 : 0.02;
      material.color.setHex(wet ? 0xb9a68d : 0xffe0b8);
    });

    if (world.rain) {
      const rainy = kind === "rain" || kind === "storm";
      const count = rainy ? Math.min(world.rain.maxCount, rainCountForWeather(code)) : 0;
      world.rain.lines.visible = count > 0;
      world.rain.geometry.setDrawRange(0, count * 2);
      world.rain.lines.material.opacity = isDay ? 0.42 : 0.62;
    }
    applyEnvironment(world.scene, world.renderer, isDay);
  });

  if (!overviewWorld) return;

  const fogColor = isDay
    ? overcast ? 0xb6c1c8 : 0xb8cfe0
    : overcast ? 0x2b3444 : 0x243049;
  overviewWorld.scene.fog.color.setHex(fogColor);
  overviewWorld.scene.fog.density = isDay ? preset.fogDay : preset.fogNight;

  const lights = overviewWorld.lights;
  if (!lights) return;
  lights.sun.color.setHex(isDay ? (overcast ? 0xe8eef2 : 0xfff3e0) : 0xc2d3e6);
  lights.sun.intensity = isDay ? (preset.sun > 0 ? 1.15 * preset.sun : 0.36) : 0.8;
  lights.sun.position.set(isDay ? 16 : -12, isDay ? 30 : 24, isDay ? 24 : 15);
  lights.hemi.color.setHex(isDay ? (overcast ? 0x9fb0bf : 0xa9c9e2) : 0x3c4a66);
  lights.hemi.groundColor.setHex(isDay ? 0x6b5a42 : 0x5c3616);
  lights.hemi.intensity = isDay ? (overcast ? 0.6 : 0.72) : 0.42;
  lights.ambient.color.setHex(isDay ? (overcast ? 0x8c99a4 : 0x93a6b8) : 0x4a2e1a);
  lights.ambient.intensity = isDay ? 0.3 : 0.2;
  lights.fairGlow.intensity = isDay ? 0.1 : 0.72;
  lights.plazaGlow.intensity = isDay ? 1.1 : 4.2;

  // 白天的画布调色单独一档：更饱和、更高对比，避免一片奶白
  const root = document.documentElement.style;
  root.setProperty("--scene-saturation", isDay ? (overcast ? 1.16 : 1.34) : "1.18");
  root.setProperty("--scene-contrast", isDay ? 1.1 : "1.03");
  root.setProperty("--scene-hue", isDay ? "-2deg" : "-4deg");
  skyApplied = true;
}

function initThreeWorlds() {
  if (!window.THREE) {
    elements.overviewCanvas.hidden = true;
    return;
  }

  overviewWorld = createOverviewWorld();
  focusWorld = createFocusWorld();
  resizeWorlds();
  bindOrbit(elements.overviewCanvas, overviewWorld);
  bindOrbit(elements.focusCanvas, focusWorld);
  hydrateCarouselHorses().catch((error) => {
    console.warn("Carousel horse model could not be loaded.", error);
  });

  applySkyPeriod(isDaytimeNow());
}

var nightEnvTexture = null;

function getNightEnvironment() {
  if (nightEnvTexture) return nightEnvTexture;
  const width = 512;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  // 天顶深蓝 → 地平线暖橙 → 地面暗褐，给金属一件可反射的"夜空"
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#0a1226");
  sky.addColorStop(0.42, "#152741");
  sky.addColorStop(0.5, "#3d2c26");
  sky.addColorStop(0.55, "#8a4d22");
  sky.addColorStop(0.63, "#331f14");
  sky.addColorStop(1, "#0c0806");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  // 地平线上的几团灯，让反射里有暖色亮点
  for (let index = 0; index < 8; index += 1) {
    const cx = (index + 0.5) * (width / 8) + (Math.random() - 0.5) * 30;
    const radius = 16 + Math.random() * 26;
    const glow = context.createRadialGradient(cx, height * 0.53, 0, cx, height * 0.53, radius);
    glow.addColorStop(0, "rgba(255,190,120,0.85)");
    glow.addColorStop(0.4, "rgba(255,150,70,0.28)");
    glow.addColorStop(1, "rgba(255,140,60,0)");
    context.fillStyle = glow;
    context.fillRect(cx - radius, height * 0.53 - radius, radius * 2, radius * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.encoding = THREE.sRGBEncoding;
  nightEnvTexture = texture;
  return texture;
}

function applyEnvironment(scene, renderer, isDay) {
  scene.userData.envCache = scene.userData.envCache || {};
  const key = isDay ? "day" : "night";
  if (scene.userData.envCache[key]) {
    scene.environment = scene.userData.envCache[key];
    return;
  }
  const source = isDay ? getDayEnvironment() : getNightEnvironment();
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.userData.envCache[key] = pmrem.fromEquirectangular(source).texture;
    scene.environment = scene.userData.envCache[key];
    pmrem.dispose();
  } catch (error) {
    scene.environment = source;
  }
}

function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.setClearColor(0x081a2e, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  return renderer;
}

function createOverviewWorld() {
  const renderer = createRenderer(elements.overviewCanvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x243049, 0.0098);
  applyEnvironment(scene, renderer);
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 420);
  const orbit = { yaw: 0.55, pitch: 0.22, distance: 52, targetX: 0, targetY: 2.4, targetZ: 2 };
  const rides = {};
  const rideAnchors = {};
  const markers = [];

  const skyDome = addSkyDome(scene);
  const moonGroup = addMoon(scene, -42, 22.5, -156, 6.6);
  const sunGroup = addSun(scene, -88, 21, -80, 6.2);
  const cloudLayer = addCloudLayer(scene, 28);
  const rain = addRain(scene, 3200, 150);
  addGround(scene);
  addPaths(scene);
  addOuterRoad(scene);
  addScenery(scene);
  addGroundDressing(scene);

  const gate = buildEntranceGate();
  gate.group.position.set(0, 0, 16.5);
  gate.group.rotation.y = 0.22;
  gate.group.scale.setScalar(1.18);
  scene.add(gate.group);

  const sunLight = new THREE.DirectionalLight(0xc2d3e6, 0.8);
  sunLight.position.set(-12, 24, 15);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left = -35;
  sunLight.shadow.camera.right = 35;
  sunLight.shadow.camera.top = 35;
  sunLight.shadow.camera.bottom = -35;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x3c4a66, 0x5c3616, 0.42);
  scene.add(hemiLight);
  const ambientLight = new THREE.AmbientLight(0x4a2e1a, 0.2);
  scene.add(ambientLight);

  const fairGlow = new THREE.DirectionalLight(0xffa25a, 0.72);
  fairGlow.position.set(6, 11, 34);
  scene.add(fairGlow);

  const plazaGlow = new THREE.PointLight(0xffb066, 4.2, 30, 2);
  plazaGlow.position.set(0, 5.5, 0);
  scene.add(plazaGlow);
  addGlowHalo(scene, 0, 2.4, 0, 0xffb066, 12, 0.1);

  facilities.forEach((facility) => {
    const ride = buildRide(facility.id, 1.08);
    ride.group.position.set(facility.world[0], 0, facility.world[2]);
    ride.group.traverse((child) => {
      if (child.isMesh) child.receiveShadow = true;
    });
    scene.add(ride.group);
    const rideGlow = new THREE.PointLight(facility.accent, 5.2, 16, 2);
    rideGlow.position.set(facility.world[0], 2.9, facility.world[2]);
    scene.add(rideGlow);
    addGlowHalo(scene, facility.world[0], 2.6, facility.world[2], facility.accent, 7.2, 0.2);
    const ringRadius = { ferris: 4.5, coaster: 4.4, carousel: 4.05, slide: 3.9, garden: 4.0, pendulum: 3.9 }[facility.id] || 4.0;
    addLightRing(scene, facility.world[0], facility.world[2], ringRadius, 30, 0xffc074, facility.accent, 0.5);
    rides[facility.id] = ride;
    rideAnchors[facility.id] = new THREE.Vector3(
      facility.world[0],
      ride.anchorHeight,
      facility.world[2]
    );
  });

  updateOrbitCamera({ camera, orbit, aspect: 1 });

  return {
    renderer,
    scene,
    camera,
    orbit,
    gate,
    skyDome,
    moonGroup,
    sunGroup,
    cloudLayer,
    rain,
    lights: { sun: sunLight, hemi: hemiLight, ambient: ambientLight, fairGlow, plazaGlow },
    rides,
    rideAnchors,
    markers,
    width: 1,
    height: 1
  };
}

function createFocusWorld() {
  const renderer = createRenderer(elements.focusCanvas);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a1a2a, 0.0095);
  applyEnvironment(scene, renderer);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 420);
  const orbit = { yaw: -0.38, pitch: 0.18, distance: 16, targetX: 0, targetY: 3.5, targetZ: 0 };
  const rides = {};

  const skyDome = addSkyDome(scene);
  const moonGroup = addMoon(scene, 8, 11.5, -64, 3.4);
  const sunGroup = addSun(scene, 45, 9.5, -59, 3.8);
  const cloudLayer = addCloudLayer(scene, 20);
  const rain = addRain(scene, 1200, 80);
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.5, 0.22, 64),
    standardMaterial(0x241d19, 0.62, 0.6)
  );
  platform.position.y = -0.15;
  platform.receiveShadow = true;
  scene.add(platform);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6.75, 6.86, 80),
    new THREE.MeshBasicMaterial({ color: 0x9a7b4c, transparent: true, opacity: 0.52, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  const key = new THREE.SpotLight(0xdfcfad, 5.2, 46, 0.54, 0.72, 1.3);
  key.position.set(-2.5, 18, 10);
  key.target.position.set(0, 3, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key, key.target);

  const rim = new THREE.PointLight(0x7fb2dc, 1.8, 26);
  rim.position.set(8, 5, -8);
  scene.add(rim);
  const warmRim = new THREE.PointLight(0xffb066, 3.4, 26);
  warmRim.position.set(-7, 4, 4);
  scene.add(warmRim);
  scene.add(new THREE.HemisphereLight(0x3c4a66, 0x5a3414, 0.4));
  scene.add(new THREE.AmbientLight(0x4a2e1a, 0.19));

  facilities.forEach((facility) => {
    const ride = buildRide(facility.id, facility.id === "ferris" ? 1.03 : 1.05);
    ride.group.visible = false;
    ride.group.position.set(0, 0, 0);
    scene.add(ride.group);
    rides[facility.id] = ride;
  });

  updateOrbitCamera({ camera, orbit, aspect: 1 });
  return { renderer, scene, camera, orbit, skyDome, moonGroup, sunGroup, cloudLayer, rain, rides, width: 1, height: 1 };
}

function resizeWorlds() {
  if (!overviewWorld || !focusWorld) return;
  resizeRenderer(overviewWorld);
  resizeRenderer(focusWorld);
}

function resizeRenderer(world) {
  if (!world) return;
  const canvas = world === overviewWorld ? elements.overviewCanvas : elements.focusCanvas;
  const parent = canvas.parentElement;
  const width = Math.max(1, parent.clientWidth);
  const height = Math.max(1, parent.clientHeight);
  const aspect = width / height;
  world.width = width;
  world.height = height;
  world.renderer.setSize(width, height, false);
  world.camera.aspect = aspect;
  if (world === overviewWorld) {
    const portrait = aspect < 0.9;
    if (world.isPortraitMode !== portrait) {
      world.isPortraitMode = portrait;
      world.camera.fov = portrait ? 64 : 35;
      world.orbit.yaw = portrait ? 0 : 0.55;
      world.orbit.pitch = portrait ? 0.4 : 0.22;
      world.orbit.distance = portrait ? 56 : 52;
      updateOrbitCamera(world);
    }
  } else if (world === focusWorld) {
    world.camera.fov = aspect < 0.4 ? 94 : aspect < 0.85 ? 66 : 34;
    if (activeModel) {
      window.requestAnimationFrame(() => fitFocusToModel(activeModel, world));
    }
  }
  world.camera.updateProjectionMatrix();
}

function fitFocusToModel(ride, world) {
  if (!ride?.group || !world?.camera) return;
  ride.group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(ride.group);
  const sphere = ride.framingSphere
    ? ride.framingSphere.clone()
    : bounds.getBoundingSphere(new THREE.Sphere());
  const center = sphere.center;
  const fovY = THREE.MathUtils.degToRad(world.camera.fov);
  const fovX = 2 * Math.atan(Math.tan(fovY / 2) * world.camera.aspect);
  const limitingFov = Math.min(fovY, fovX);
  const distance = sphere.radius / Math.sin(limitingFov / 2) * 1.1;

  world.orbit.targetX = center.x;
  world.orbit.targetY = center.y;
  world.orbit.targetZ = center.z;
  world.orbit.distance = THREE.MathUtils.clamp(distance, 8, 48);
  updateOrbitCamera(world);
}

var moonTexture = null;

function getMoonTexture() {
  if (moonTexture) return moonTexture;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  // 月面底色：中心偏亮，边缘略暗，模拟球面受光
  const base = context.createRadialGradient(size * 0.42, size * 0.38, 0, size * 0.5, size * 0.5, size * 0.62);
  base.addColorStop(0, "#f8efd6");
  base.addColorStop(0.55, "#efe6cb");
  base.addColorStop(0.85, "#d6cdb4");
  base.addColorStop(1, "#b9b19c");
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  // 月海：大块低洼暗斑
  for (let index = 0; index < 16; index += 1) {
    const cx = size * (0.18 + Math.random() * 0.64);
    const cy = size * (0.18 + Math.random() * 0.64);
    const r = 26 + Math.random() * 62;
    const patch = context.createRadialGradient(cx, cy, 0, cx, cy, r);
    patch.addColorStop(0, "rgba(138, 134, 120, 0.62)");
    patch.addColorStop(0.6, "rgba(138, 134, 120, 0.3)");
    patch.addColorStop(1, "rgba(150, 146, 132, 0)");
    context.fillStyle = patch;
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
  }

  // 环形山：暗底 + 亮边
  for (let index = 0; index < 30; index += 1) {
    const cx = size * Math.random();
    const cy = size * Math.random();
    const r = 1.4 + Math.random() * 6.5;
    context.fillStyle = "rgba(112, 108, 96, 0.36)";
    context.beginPath();
    context.arc(cx, cy, r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 252, 235, 0.26)";
    context.lineWidth = 0.9;
    context.beginPath();
    context.arc(cx, cy, r * 1.12, Math.PI * 1.05, Math.PI * 1.95);
    context.stroke();
  }

  // 边缘压暗，避免看起来像一张平贴的圆片
  const limb = context.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.5);
  limb.addColorStop(0, "rgba(0, 0, 0, 0)");
  limb.addColorStop(0.82, "rgba(46, 42, 36, 0.18)");
  limb.addColorStop(1, "rgba(24, 22, 20, 0.5)");
  context.fillStyle = limb;
  context.fillRect(0, 0, size, size);

  moonTexture = new THREE.CanvasTexture(canvas);
  moonTexture.encoding = THREE.sRGBEncoding;
  return moonTexture;
}

// 把月亮做成真正的球体，挂在很远的空中：转动视角时它会跟着透视移动，也会被建筑遮挡
function addMoon(scene, x, y, z, radius) {
  const group = new THREE.Group();

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.MeshBasicMaterial({ map: getMoonTexture(), fog: false })
  );
  group.add(moon);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getHaloTexture(),
      color: 0xffe9c2,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.3,
      fog: false
    })
  );
  halo.scale.set(radius * 6.4, radius * 6.4, 1);
  group.add(halo);

  group.position.set(x, y, z);
  scene.add(group);
  return group;
}

var daySkyTextures = { clear: null, overcast: null };

// 白天的天空：晴版是浅蓝，阴版是灰白；都用压扁的柔光云，不画星星
function getDaySkyTexture(overcast) {
  const key = overcast ? "overcast" : "clear";
  if (daySkyTextures[key]) return daySkyTextures[key];
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  const sky = context.createLinearGradient(0, 0, 0, height);
  if (overcast) {
    sky.addColorStop(0, "#63757f");
    sky.addColorStop(0.2, "#7b8c96");
    sky.addColorStop(0.36, "#93a2ab");
    sky.addColorStop(0.46, "#a9b7be");
    sky.addColorStop(0.492, "#c2ccd2");
    sky.addColorStop(0.5, "#ccd4d8");
    sky.addColorStop(0.54, "#b3bab8");
    sky.addColorStop(0.62, "#8f968d");
    sky.addColorStop(1, "#6f746a");
  } else {
    sky.addColorStop(0, "#2e6fa8");
    sky.addColorStop(0.2, "#4b8bbd");
    sky.addColorStop(0.36, "#6ba2ca");
    sky.addColorStop(0.46, "#4f8cc4");
    sky.addColorStop(0.492, "#88b6d4");
    sky.addColorStop(0.5, "#b6cfdf");
    sky.addColorStop(0.54, "#b9c6c4");
    sky.addColorStop(0.62, "#98a396");
    sky.addColorStop(1, "#79806f");
  }
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  // 薄云：压扁的柔和椭圆，越靠地平线越淡
  // 云朵：先定簇心，再叠几团小 puff，成团才好认
  const clusterCount = overcast ? 26 : 15;
  for (let cluster = 0; cluster < clusterCount; cluster += 1) {
    const anchorX = Math.random() * width;
    const anchorY = height * (0.4 + Math.random() * 0.088);
    const puffs = 4 + Math.floor(Math.random() * 4);
    for (let puff = 0; puff < puffs; puff += 1) {
      const cx = anchorX + (Math.random() - 0.5) * 96;
      const cy = anchorY + (Math.random() - 0.5) * 13;
      const rx = 20 + Math.random() * 38;
      const ry = rx * (0.42 + Math.random() * 0.3);
      const alpha = (overcast ? 0.68 : 0.78) + Math.random() * 0.22;
      const cloud = context.createRadialGradient(cx, cy, 0, cx, cy, rx);
      cloud.addColorStop(0, "rgba(255, 255, 255, " + alpha + ")");
      cloud.addColorStop(0.5, "rgba(250, 252, 255, " + alpha * 0.55 + ")");
      cloud.addColorStop(1, "rgba(255, 255, 255, 0)");
      context.fillStyle = cloud;
      context.beginPath();
      context.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 8;
  daySkyTextures[key] = texture;
  return texture;
}

var dayEnvTexture = null;

// 白天的环境反射：上方亮蓝天，下方暖灰地面
function getDayEnvironment() {
  if (dayEnvTexture) return dayEnvTexture;
  const width = 512;
  const height = 256;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#6ba6d2");
  sky.addColorStop(0.42, "#a8c8e0");
  sky.addColorStop(0.5, "#dbe7ee");
  sky.addColorStop(0.56, "#8f8b7a");
  sky.addColorStop(1, "#4f4a3d");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  dayEnvTexture = new THREE.CanvasTexture(canvas);
  dayEnvTexture.mapping = THREE.EquirectangularReflectionMapping;
  dayEnvTexture.encoding = THREE.sRGBEncoding;
  return dayEnvTexture;
}

var cloudPuffTexture = null;

// 云团用的柔边圆点，几片叠在一起就是一朵云
function getCloudPuffTexture() {
  if (cloudPuffTexture) return cloudPuffTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.6)");
  gradient.addColorStop(0.72, "rgba(255,255,255,0.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  cloudPuffTexture = new THREE.CanvasTexture(canvas);
  cloudPuffTexture.encoding = THREE.sRGBEncoding;
  return cloudPuffTexture;
}

// 一片可开关的云层：按天气决定露出多少朵
function addCloudLayer(scene, count) {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const cloud = new THREE.Group();
    const angle = Math.PI + (Math.random() - 0.5) * 2.9;
    const radius = 100 + Math.random() * 55;
    cloud.position.set(
      Math.cos(angle) * radius,
      16 + Math.random() * 12,
      Math.sin(angle) * radius
    );
    const puffs = 4 + Math.floor(Math.random() * 3);
    for (let index2 = 0; index2 < puffs; index2 += 1) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getCloudPuffTexture(),
          color: 0xffffff,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
          fog: false
        })
      );
      const scale = 22 + Math.random() * 22;
      sprite.scale.set(scale, scale * 0.52, 1);
      sprite.position.set(
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 14
      );
      cloud.add(sprite);
    }
    group.add(cloud);
  }
  group.visible = false;
  scene.add(group);
  return group;
}

// 太阳：一团亮球 + 暖色光晕
function addSun(scene, x, y, z, radius) {
  const group = new THREE.Group();

  const disc = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xffc851, fog: false })
  );
  group.add(disc);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getHaloTexture(),
      color: 0xffbf5e,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
      fog: false
    })
  );
  halo.scale.set(radius * 9.5, radius * 8.5, 1);
  group.add(halo);

  group.position.set(x, y, z);
  group.visible = false;
  scene.add(group);
  return group;
}

// ---------- 三维雨 ----------

var rainStreakSeed = null;

// 一批会下落、循环利用的雨丝；drawRange 控制当前显示多少条
function addRain(scene, maxCount, spread) {
  const area = spread || 150;
  const positions = new Float32Array(maxCount * 6);
  const streaks = [];

  for (let index = 0; index < maxCount; index += 1) {
    const length = 0.9 + Math.random() * 0.9;
    const speed = 26 + Math.random() * 18;
    const x = (Math.random() - 0.5) * area;
    const z = (Math.random() - 0.5) * area * 0.86;
    const y = Math.random() * 36;
    const offset = index * 6;
    positions[offset] = x;
    positions[offset + 1] = y;
    positions[offset + 2] = z;
    positions[offset + 3] = x + length * 0.14;
    positions[offset + 4] = y - length;
    positions[offset + 5] = z;
    streaks.push({ length, speed, area });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);

  const material = new THREE.LineBasicMaterial({
    color: 0xdceaf6,
    transparent: true,
    opacity: 0.6,
    depthWrite: false
  });

  const lines = new THREE.LineSegments(geometry, material);
  lines.frustumCulled = false;
  lines.visible = false;
  scene.add(lines);

  return { lines, geometry, positions, streaks, maxCount, area };
}

function updateRain(world, delta) {
  const rain = world && world.rain;
  if (!rain || !rain.lines.visible) return;

  const visible = rain.geometry.drawRange.count / 2;
  const positions = rain.positions;
  const step = Math.min(delta, 0.05);

  for (let index = 0; index < visible; index += 1) {
    const streak = rain.streaks[index];
    const offset = index * 6;
    const fall = streak.speed * step;

    positions[offset] += fall * 0.1;
    positions[offset + 1] -= fall;
    positions[offset + 3] += fall * 0.1;
    positions[offset + 4] -= fall;

    if (positions[offset + 4] < -0.4) {
      const x = (Math.random() - 0.5) * streak.area;
      const z = (Math.random() - 0.5) * streak.area * 0.86;
      const y = 30 + Math.random() * 8;
      positions[offset] = x;
      positions[offset + 1] = y;
      positions[offset + 2] = z;
      positions[offset + 3] = x + streak.length * 0.14;
      positions[offset + 4] = y - streak.length;
      positions[offset + 5] = z;
    } else if (positions[offset] > streak.area * 0.5) {
      positions[offset] = (Math.random() - 0.5) * streak.area;
      positions[offset + 3] = positions[offset] + streak.length * 0.14;
    }
  }

  rain.geometry.attributes.position.needsUpdate = true;
}

// 雨量：细雨 500 条、中雨 900、大雨 1300、雷雨 1500
function rainCountForWeather(code) {
  if ([51, 53, 56].includes(code)) return 760;
  if ([55, 57].includes(code)) return 1300;
  if ([61, 66, 80].includes(code)) return 1500;
  if ([63, 81].includes(code)) return 2000;
  if ([65, 67, 82].includes(code)) return 2400;
  if ([95, 96, 99].includes(code)) return 2800;
  return 1500;
}

var skyDomeTexture = null;

function getSkyDomeTexture() {
  if (skyDomeTexture) return skyDomeTexture;
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  // 天顶深靛 → 接近地平线泛一点暖紫，下半球留黑（会被地面挡住）
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#04060e");
  sky.addColorStop(0.28, "#081020");
  sky.addColorStop(0.46, "#16263f");
  sky.addColorStop(0.5, "#243049");
  sky.addColorStop(0.54, "#26304a");
  sky.addColorStop(0.7, "#141a2a");
  sky.addColorStop(1, "#070709");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  // 银河：一条斜向的淡光带，用低透明度叠出来
  context.save();
  context.translate(width * 0.5, height * 0.3);
  context.rotate(-0.34);
  const band = context.createLinearGradient(0, -160, 0, 160);
  band.addColorStop(0, "rgba(150, 176, 214, 0)");
  band.addColorStop(0.42, "rgba(150, 176, 214, 0.1)");
  band.addColorStop(0.5, "rgba(196, 210, 236, 0.16)");
  band.addColorStop(0.58, "rgba(150, 176, 214, 0.1)");
  band.addColorStop(1, "rgba(150, 176, 214, 0)");
  context.fillStyle = band;
  context.fillRect(-width, -160, width * 2, 320);
  context.restore();

  // 星点：大小与亮度随机，少量带暖色
  const starCount = 1700;
  for (let index = 0; index < starCount; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.62;
    const radius = 0.32 + Math.random() * 0.75;
    const bright = 0.25 + Math.random() * 0.75;
    const warm = Math.random() > 0.82;
    context.fillStyle = warm
      ? `rgba(255, 226, 186, ${bright})`
      : `rgba(226, 236, 255, ${bright})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  // 几颗特别亮的星，带十字光
  for (let index = 0; index < 4; index += 1) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.52;
    const glow = context.createRadialGradient(x, y, 0, x, y, 3.2);
    glow.addColorStop(0, "rgba(255, 252, 240, 0.95)");
    glow.addColorStop(0.35, "rgba(210, 226, 255, 0.34)");
    glow.addColorStop(1, "rgba(180, 200, 240, 0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(x, y, 3.2, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(255, 250, 236, 0.3)";
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(x - 2.4, y);
    context.lineTo(x + 2.4, y);
    context.moveTo(x, y - 2.4);
    context.lineTo(x, y + 2.4);
    context.stroke();
  }

  skyDomeTexture = new THREE.CanvasTexture(canvas);
  skyDomeTexture.encoding = THREE.sRGBEncoding;
  skyDomeTexture.anisotropy = 8;
  return skyDomeTexture;
}

function addSkyDome(scene) {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(265, 64, 40),
    new THREE.MeshBasicMaterial({
      map: getSkyDomeTexture(),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    })
  );
  dome.renderOrder = -10;
  scene.add(dome);
  return dome;
}

function addSky(scene, count = 260) {
  const positions = [];
  for (let index = 0; index < count; index += 1) {
    const radius = 35 + Math.random() * 45;
    const angle = Math.random() * Math.PI * 2;
    positions.push(
      Math.cos(angle) * radius,
      9 + Math.random() * 24,
      Math.sin(angle) * radius
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xdcd6be,
      size: 0.11,
      transparent: true,
      opacity: 0.72,
      depthWrite: false
    })
  );
  scene.add(points);
}

function groundSmoothstep(edge0, edge1, value) {
  const span = edge1 - edge0 || 1;
  const t = Math.min(1, Math.max(0, (value - edge0) / span));
  return t * t * (3 - 2 * t);
}

function groundHash(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function groundNoise(x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const top = groundHash(xi, yi) * (1 - u) + groundHash(xi + 1, yi) * u;
  const bottom = groundHash(xi, yi + 1) * (1 - u) + groundHash(xi + 1, yi + 1) * u;
  return top * (1 - v) + bottom * v - 0.5;
}

// 地形高度：中心保持平整，外圈缓缓抬起成丘陵；设施与湖面处压平
function groundHeightAt(x, z) {
  const radius = Math.hypot(x, z);
  const rim = groundSmoothstep(23, 34, radius);
  if (rim <= 0) return GROUND_BASE_Y;

  let height =
    (groundNoise(x * 0.045, z * 0.045) + groundNoise(x * 0.11 + 4, z * 0.11 - 2) * 0.5) *
    1.5 *
    rim;

  const flatZones = facilities
    .map((facility) => ({ x: facility.world[0], z: facility.world[2], r: 5.6, soft: 3.6 }))
    .concat([{ x: LAKE.x, z: LAKE.z, r: LAKE.rx + 1.4, soft: 4.2 }]);

  for (const zone of flatZones) {
    const distance = Math.hypot(x - zone.x, z - zone.z);
    if (distance > zone.r + zone.soft) continue;
    height *= groundSmoothstep(zone.r, zone.r + zone.soft, distance);
  }

  return GROUND_BASE_Y + height;
}

// 程序化草地贴图：大块色斑 + 细颗粒，四向平铺无缝
function makeGroundTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  context.fillStyle = "#141f18";
  context.fillRect(0, 0, size, size);

  // 只留很淡的低频起伏，避免大块色斑在平铺后像霉斑
  for (let index = 0; index < 90; index += 1) {
    const bx = Math.random() * size;
    const by = Math.random() * size;
    const br = 40 + Math.random() * 110;
    const light = Math.random() > 0.42;
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oy = -1; oy <= 1; oy += 1) {
        const cx = bx + ox * size;
        const cy = by + oy * size;
        if (cx < -br || cx > size + br || cy < -br || cy > size + br) continue;
        const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, br);
        gradient.addColorStop(0, light ? "rgba(52,72,46,0.12)" : "rgba(2,6,4,0.14)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(cx, cy, br, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  // 细草纹：短笔触，比色斑更耐看
  for (let index = 0; index < 5200; index += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 1.2 + Math.random() * 2.6;
    const tone = Math.random() > 0.5 ? "rgba(70,92,56,0.3)" : "rgba(6,12,7,0.32)";
    context.strokeStyle = tone;
    context.lineWidth = 0.8;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (Math.random() - 0.5) * 1.6, y - len);
    context.stroke();
  }

  const image = context.getImageData(0, 0, size, size);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const grain = (Math.random() - 0.5) * 10;
    data[index] = Math.max(0, Math.min(255, data[index] + grain));
    data[index + 1] = Math.max(0, Math.min(255, data[index + 1] + grain));
    data[index + 2] = Math.max(0, Math.min(255, data[index + 2] + grain));
  }
  context.putImageData(image, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.anisotropy = 4;
  return texture;
}

var groundTextureBase = null;

// 内圈与旷野共用一张草地贴图，但按各自覆盖的直径换算平铺次数，接缝处纹理密度才一致
function groundTextureFor(outerRadius) {
  if (!groundTextureBase) groundTextureBase = makeGroundTexture();
  const texture = groundTextureBase.clone();
  texture.needsUpdate = true;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set((outerRadius * 2) / 8, (outerRadius * 2) / 8);
  return texture;
}

function buildGroundMesh(innerRadius, outerRadius, radialSegments, heightBias) {
  const geometry = new THREE.RingGeometry(innerRadius, outerRadius, 168, radialSegments);
  geometry.rotateX(-Math.PI / 2);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index += 1) {
    position.setY(index, groundHeightAt(position.getX(index), position.getZ(index)) + heightBias);
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: groundTextureFor(outerRadius),
      color: 0xffe0b8,
      metalness: 0.02,
      roughness: 0.95
    })
  );
}

function addGround(scene) {
  const ground = buildGroundMesh(0.001, GROUND_RADIUS, 76, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // 旷野：接在圆盘外沿，一直延伸到雾里，让地面不再有可见的圆边
  const field = buildGroundMesh(GROUND_RADIUS - 1.6, GROUND_FAR_RADIUS, 96, -0.02);
  field.receiveShadow = true;
  scene.add(field);

  scene.userData.groundMaterials = [ground.material, field.material];

  addPlaza(scene);
  addLake(scene);
  addDistantTrees(scene);
}

var stoneTexture = null;

function getStoneTexture() {
  if (stoneTexture) return stoneTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = "#3a362e";
  context.fillRect(0, 0, size, size);

  for (let index = 0; index < 260; index += 1) {
    const bx = Math.random() * size;
    const by = Math.random() * size;
    const br = 6 + Math.random() * 26;
    const light = Math.random() > 0.5;
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oy = -1; oy <= 1; oy += 1) {
        const cx = bx + ox * size;
        const cy = by + oy * size;
        if (cx < -br || cx > size + br || cy < -br || cy > size + br) continue;
        const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, br);
        gradient.addColorStop(0, light ? "rgba(96,90,76,0.22)" : "rgba(16,14,10,0.22)");
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(cx, cy, br, 0, Math.PI * 2);
        context.fill();
      }
    }
  }

  const image = context.getImageData(0, 0, size, size);
  const data = image.data;
  for (let index = 0; index < data.length; index += 4) {
    const grain = (Math.random() - 0.5) * 12;
    data[index] = Math.max(0, Math.min(255, data[index] + grain));
    data[index + 1] = Math.max(0, Math.min(255, data[index + 1] + grain));
    data[index + 2] = Math.max(0, Math.min(255, data[index + 2] + grain));
  }
  context.putImageData(image, 0, 0);

  stoneTexture = new THREE.CanvasTexture(canvas);
  stoneTexture.wrapS = THREE.RepeatWrapping;
  stoneTexture.wrapT = THREE.RepeatWrapping;
  stoneTexture.repeat.set(3, 3);
  return stoneTexture;
}

function addPlaza(scene) {
  const stone = new THREE.MeshStandardMaterial({
    map: getStoneTexture(),
    color: 0xffd0a0,
    metalness: 0.14,
    roughness: 0.86
  });
  const stoneLight = standardMaterial(0x35332a, 0.16, 0.82);
  const seamMat = standardMaterial(0x15140f, 0.08, 0.92);

  const plaza = new THREE.Mesh(new THREE.CylinderGeometry(7.3, 7.62, 0.18, 72), stone);
  plaza.position.y = -0.02;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // 铺装分带：两道同心石带，把大圆盘切成可读的层次
  const band = (inner, outer, material, y) => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 96), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = y;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };
  band(5.52, 5.94, stoneLight, 0.071);
  band(6.86, 7.24, stoneLight, 0.071);
  band(5.94, 6.02, seamMat, 0.072);
  band(6.78, 6.86, seamMat, 0.072);

  // 放射状铺缝
  for (let index = 0; index < 24; index += 1) {
    const angle = (index / 24) * Math.PI * 2 + Math.PI / 48;
    const seam = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.004, 0.032), seamMat);
    seam.position.set(Math.cos(angle) * 6.4, 0.072, Math.sin(angle) * 6.4);
    seam.rotation.y = -angle;
    scene.add(seam);
  }

  // 外沿包边
  const curb = new THREE.Mesh(new THREE.TorusGeometry(7.42, 0.085, 8, 96), stoneLight);
  curb.rotation.x = Math.PI / 2;
  curb.position.y = 0.062;
  curb.castShadow = true;
  scene.add(curb);

  // 广场外的接地阴影，避免像一块浮在地面的圆板
  [
    [7.6, 8.9, 0.2],
    [8.9, 10.4, 0.11],
    [10.4, 12.2, 0.05]
  ].forEach(([inner, outer, opacity]) => {
    const shadow = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 80),
      new THREE.MeshBasicMaterial({
        color: 0x030c0b,
        transparent: true,
        opacity,
        depthWrite: false
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.1;
    scene.add(shadow);
  });

  // 入口前庭
  const forecourt = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.52, 0.16, 48), stone);
  forecourt.position.set(0, -0.03, 20.6);
  forecourt.receiveShadow = true;
  scene.add(forecourt);
  const forecourtCurb = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.07, 8, 64), stoneLight);
  forecourtCurb.rotation.x = Math.PI / 2;
  forecourtCurb.position.set(0, 0.045, 20.6);
  scene.add(forecourtCurb);
}

function addLake(scene) {
  const group = new THREE.Group();
  group.position.set(LAKE.x, 0, LAKE.z);
  group.rotation.y = LAKE.tilt;
  scene.add(group);

  // 岸坡：比水面宽一圈的湿土带
  const bank = new THREE.Mesh(
    new THREE.RingGeometry(0.97, 1.09, 80),
    standardMaterial(0x1b241a, 0.06, 0.95)
  );
  bank.rotation.x = -Math.PI / 2;
  bank.scale.set(LAKE.rx, LAKE.rz, 1);
  bank.position.y = -0.15;
  bank.receiveShadow = true;
  group.add(bank);

  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1, 90),
    new THREE.MeshPhysicalMaterial({
      color: 0x081a1e,
      metalness: 0.62,
      roughness: 0.1,
      clearcoat: 0.85,
      clearcoatRoughness: 0.1
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.set(LAKE.rx * 0.97, LAKE.rz * 0.97, 1);
  water.position.y = -0.125;
  group.add(water);

  // 近岸加深：水与草之间留一道暗边，避免像一只塑料盆
  [
    [0.88, 0.975, 0.36],
    [0.74, 0.88, 0.16]
  ].forEach(([inner, outer, opacity]) => {
    const shade = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 80),
      new THREE.MeshBasicMaterial({ color: 0x02090b, transparent: true, opacity, depthWrite: false })
    );
    shade.rotation.x = -Math.PI / 2;
    shade.scale.set(LAKE.rx * 0.97, LAKE.rz * 0.97, 1);
    shade.position.y = -0.122;
    group.add(shade);
  });

  // 岸边石块：半埋，大小不一
  const rockMat = standardMaterial(0x212319, 0.12, 0.9);
  const rockMatDark = standardMaterial(0x15170f, 0.1, 0.93);
  for (let index = 0; index < 30; index += 1) {
    const angle = (index / 30) * Math.PI * 2 + groundHash(index, 3) * 0.16;
    const scale = 0.26 + groundHash(index, 9) * 0.34;
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(scale, 0),
      index % 3 ? rockMat : rockMatDark
    );
    rock.position.set(
      Math.cos(angle) * LAKE.rx * (1.0 + groundHash(index, 7) * 0.07),
      -0.14 + scale * 0.3,
      Math.sin(angle) * LAKE.rz * (1.0 + groundHash(index, 7) * 0.07)
    );
    rock.rotation.set(groundHash(index, 11) * 3, angle, groundHash(index, 13) * 3);
    rock.scale.y = 0.7;
    rock.castShadow = true;
    rock.receiveShadow = true;
    group.add(rock);
  }

  // 芦苇：靠水的几丛细杆
  const reedMat = standardMaterial(0x24382a, 0.04, 0.92);
  for (let cluster = 0; cluster < 4; cluster += 1) {
    const base = 2.1 + cluster * 0.9;
    for (let index = 0; index < 7; index += 1) {
      const height = 0.5 + groundHash(cluster * 13 + index, 17) * 0.55;
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, height, 4), reedMat);
      reed.position.set(
        Math.cos(base) * LAKE.rx * 1.05 + (groundHash(index, 19) - 0.5) * 0.7,
        height / 2 - 0.08,
        Math.sin(base) * LAKE.rz * 1.05 + (groundHash(index, 23) - 0.5) * 0.7
      );
      reed.rotation.z = (groundHash(index, 29) - 0.5) * 0.24;
      group.add(reed);
    }
  }
}

// 边界灌木带：把地皮的圆形边缘藏进树丛里
function addBoundaryHedge(scene) {
  const count = 168;
  const geometry = new THREE.IcosahedronGeometry(1, 1);
  const material = new THREE.MeshStandardMaterial({
    color: 0x0e1c16,
    metalness: 0.02,
    roughness: 0.94,
    flatShading: true
  });
  const hedge = new THREE.InstancedMesh(geometry, material, count);
  const dummy = new THREE.Object3D();

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const radius = 32.2 + groundHash(index, 31) * 2.2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const scale = 0.62 + groundHash(index, 37) * 0.52;
    dummy.position.set(x, groundHeightAt(x, z) + scale * 0.42, z);
    dummy.scale.set(scale * 1.7, scale * 1.05, scale * 1.7);
    dummy.rotation.set(0, groundHash(index, 41) * Math.PI, 0);
    dummy.updateMatrix();
    hedge.setMatrixAt(index, dummy.matrix);
  }
  hedge.castShadow = true;
  hedge.receiveShadow = true;
  scene.add(hedge);
}

function addPaths(scene) {
  const mainMaterial = standardMaterial(0x6a5a42, 0.08, 0.9);
  const shoulderMaterial = standardMaterial(0x1e261f, 0.06, 0.94);
  const center = new THREE.Vector3(0, 0, 2);
  const entrance = new THREE.Vector3(0, 0, 20.6);

  const drawPath = (points, width) => {
    addRibbon(scene, points, width + 0.52, shoulderMaterial, 0.028);
    addRibbon(scene, points, width, mainMaterial, 0.038);
  };

  drawPath(
    [entrance, new THREE.Vector3(0, 0, 13), new THREE.Vector3(0, 0, 6.4), center],
    1.3
  );

  facilities.forEach((facility) => {
    const point = new THREE.Vector3(facility.world[0], 0, facility.world[2]);
    // 中心那台（旋转木马）就站在路口上，不需要再画一条放射小路
    if (point.lengthSq() < 0.01) return;
    const direction = point.clone().sub(center).normalize();
    const from = center.clone().add(direction.multiplyScalar(5.85));
    const bend = center.clone().lerp(point, 0.55);
    bend.x += (facility.world[2] - 2) * 0.06;
    drawPath([from, bend, point], 0.74);

    // 路口圆盘：让道路与广场、设施的接驳不再像生硬的断口
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.98, 0.05, 24),
      shoulderMaterial
    );
    pad.position.set(point.x, 0.026, point.z);
    pad.receiveShadow = true;
    scene.add(pad);
  });
}

function addRibbon(scene, points, width, material, height) {
  const curve = new THREE.CatmullRomCurve3(points);
  const segments = 64;
  const vertices = [];
  const indices = [];

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const y = height === undefined ? point.y : height;
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(width * 0.5);
    vertices.push(point.x + side.x, y, point.z + side.z);
    vertices.push(point.x - side.x, y, point.z - side.z);
    if (index < segments) {
      const offset = index * 2;
      indices.push(offset, offset + 2, offset + 1, offset + 2, offset + 3, offset + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

var gateSignTexture = null;

// 匾额贴图：把乐园名称与欢迎语画进 canvas，再贴到牌坊上
function makeGateSignTexture(name, tagline) {
  const width = 720;
  const height = 300;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  const family = '"Songti SC", "SimSun", "Noto Serif SC", "STSong", serif';

  context.fillStyle = "#030a0a";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(198, 166, 110, 0.8)";
  context.lineWidth = 7;
  context.strokeRect(9, 9, width - 18, height - 18);
  context.strokeStyle = "rgba(198, 166, 110, 0.22)";
  context.lineWidth = 2;
  context.strokeRect(24, 24, width - 48, height - 48);

  context.textAlign = "center";
  context.textBaseline = "middle";

  const fit = (text, maxWidth, startSize, weight, color, y) => {
    let size = startSize;
    do {
      context.font = `${weight} ${size}px ${family}`;
      if (context.measureText(text).width <= maxWidth) break;
      size -= 4;
    } while (size > 16);
    context.fillStyle = color;
    context.fillText(text, width / 2, y);
  };

  fit(name, width - 130, 168, 500, "#ffeccb", 128);

  context.strokeStyle = "rgba(198, 166, 110, 0.26)";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(width / 2 - 92, 214);
  context.lineTo(width / 2 + 92, 214);
  context.stroke();

  if (tagline) {
    fit(tagline, width - 170, 42, 400, "rgba(255, 226, 176, 0.94)", 256);
  }

  if (!gateSignTexture) {
    gateSignTexture = new THREE.CanvasTexture(canvas);
    gateSignTexture.anisotropy = 4;
  } else {
    gateSignTexture.image = canvas;
    gateSignTexture.needsUpdate = true;
  }
  return gateSignTexture;
}

// 园区入口牌坊：两柱、额枋、匾额、瓦顶、灯笼
var roofTexture = null;

function getRoofTexture() {
  if (roofTexture) return roofTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.fillStyle = "#101917";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "rgba(150, 150, 132, 0.3)";
  context.lineWidth = 2;
  for (let x = 0; x <= size; x += 16) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, size);
    context.stroke();
  }
  context.strokeStyle = "rgba(0, 0, 0, 0.36)";
  for (let y = 0; y <= size; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(size, y);
    context.stroke();
  }
  roofTexture = new THREE.CanvasTexture(canvas);
  roofTexture.wrapS = THREE.RepeatWrapping;
  roofTexture.wrapT = THREE.RepeatWrapping;
  roofTexture.repeat.set(7, 2);
  return roofTexture;
}

function buildEntranceGate() {
  const group = new THREE.Group();

  const stone = standardMaterial(0x2c2b22, 0.12, 0.86);
  const stoneDark = standardMaterial(0x1b1a12, 0.1, 0.9);
  const timber = standardMaterial(0x19120b, 0.08, 0.86);
  const tileMat = new THREE.MeshStandardMaterial({
    map: getRoofTexture(),
    color: 0x8b8b83,
    metalness: 0.14,
    roughness: 0.62
  });
  const brass = standardMaterial(0x6b5734, 0.35, 0.5);
  const glow = bulbMaterial(0xe6c583);

  const add = (geometry, material, parent, x = 0, y = 0, z = 0) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  };

  // 两柱
  for (const side of [-1, 1]) {
    const x = side * 2.05;
    add(new THREE.BoxGeometry(0.72, 0.36, 0.72), stoneDark, group, x, 0.18, 0);
    add(new THREE.BoxGeometry(0.56, 0.16, 0.56), stone, group, x, 0.42, 0);
    add(new THREE.CylinderGeometry(0.185, 0.225, 3.8, 14), stone, group, x, 1.9, 0);
    add(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 14), stoneDark, group, x, 3.86, 0);
    add(new THREE.BoxGeometry(0.24, 0.5, 0.9), stoneDark, group, x, 0.25, 0.58);
  }

  // 下额枋
  add(new THREE.BoxGeometry(4.3, 0.24, 0.3), timber, group, 0, 2.02, 0);

  // 匾额：铜框 + 木衬 + 文字面板
  add(new THREE.BoxGeometry(3.7, 1.74, 0.12), brass, group, 0, 2.95, -0.03);
  add(new THREE.BoxGeometry(3.54, 1.58, 0.1), timber, group, 0, 2.95, 0.03);

  const signMaterial = new THREE.MeshBasicMaterial({
    map: makeGateSignTexture(state.profile.name, state.profile.tagline),
    color: 0xd9d2c4
  });
  const signFaces = [timber, timber, timber, timber, signMaterial, timber];
  add(new THREE.BoxGeometry(3.36, 1.4, 0.08), signFaces, group, 0, 2.95, 0.09);

  // 匾额托木
  for (const side of [-1, 1]) {
    const bracket = add(new THREE.BoxGeometry(0.5, 0.14, 0.2), timber, group, side * 1.42, 2.08, 0.02);
    bracket.rotation.z = side * 0.18;
  }

  // 上额枋
  add(new THREE.BoxGeometry(4.5, 0.2, 0.32), timber, group, 0, 4.02, 0);

  // 屋面：两坡瓦顶 + 正脊
  for (const side of [-1, 1]) {
    const slope = add(new THREE.BoxGeometry(5.3, 0.13, 1.06), tileMat, group, 0, 4.28, side * 0.3);
    slope.rotation.x = side * 0.58;
    const eave = add(new THREE.BoxGeometry(5.42, 0.1, 0.16), brass, group, 0, 3.98, side * 0.78);
    eave.rotation.x = side * 0.58;
  }
  add(new THREE.BoxGeometry(5.44, 0.16, 0.22), tileMat, group, 0, 4.56, 0);
  // 脊头
  for (const side of [-1, 1]) {
    const tip = add(new THREE.BoxGeometry(0.2, 0.16, 0.24), brass, group, side * 2.66, 4.58, 0);
    tip.rotation.z = side * -0.16;
  }

  // 檐下灯笼（吊杆连接，不悬空）
  for (const side of [-1, 1]) {
    const x = side * 1.5;
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), brass, group, x, 3.76, 0.24);
    add(new THREE.CylinderGeometry(0.08, 0.09, 0.22, 8), glow, group, x, 3.5, 0.24);
    add(new THREE.CylinderGeometry(0.095, 0.065, 0.045, 8), brass, group, x, 3.63, 0.24);
  }

  // 两侧矮墙，把牌坊接进草地
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(1.7, 0.6, 0.32), stone, group, side * 2.92, 0.3, 0);
    add(new THREE.BoxGeometry(1.76, 0.1, 0.38), stoneDark, group, side * 2.92, 0.65, 0);
  }

  const setSign = (name, tagline) => {
    signMaterial.map = makeGateSignTexture(name, tagline);
    signMaterial.needsUpdate = true;
  };

  return { group, setSign };
}


function addDistantTrees(scene) {
  // 成丛分布：每丛 2–5 棵，比均匀撒点更像自然林带
  const clusters = 34;
  for (let cluster = 0; cluster < clusters; cluster += 1) {
    const angle = (cluster / clusters) * Math.PI * 2 + groundHash(cluster, 53) * 1.4;
    const radius = 42 + groundHash(cluster, 59) * 106;
    const anchorX = Math.cos(angle) * radius;
    const anchorZ = Math.sin(angle) * radius;
    const groupSize = 2 + Math.floor(groundHash(cluster, 67) * 4);
    for (let index = 0; index < groupSize; index += 1) {
      const x = anchorX + (groundHash(cluster * 13 + index, 71) - 0.5) * 6.4;
      const z = anchorZ + (groundHash(cluster * 17 + index, 73) - 0.5) * 6.4;
      const scale = 0.7 + groundHash(cluster * 19 + index, 61) * 0.95;
      const tree = addTree(scene, x, z, scale);
      tree.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
      });
    }
  }
}

// ---------- 旷野陈设：草簇、石头、灌木、外延小路 ----------

var roadSamples = null;

// 从入口前庭向外延伸的路，采样点缓存下来，供避让判断使用
function getRoadSamples() {
  if (roadSamples) return roadSamples;
  const points = [];
  for (let index = 0; index <= 48; index += 1) {
    const t = index / 48;
    const z = 21.4 + t * 118;
    const x = -3.5 * t + Math.sin(t * 2.1) * 8 * t;
    points.push({ x, z });
  }
  roadSamples = points;
  return points;
}

function distanceToRoad(x, z) {
  const points = getRoadSamples();
  let best = Infinity;
  for (let index = 0; index < points.length; index += 1) {
    const dx = x - points[index].x;
    const dz = z - points[index].z;
    const distance = dx * dx + dz * dz;
    if (distance < best) best = distance;
  }
  return Math.sqrt(best);
}

function dressingBlocked(x, z) {
  const radius = Math.hypot(x, z);
  if (radius < 9.4) return true;
  if (Math.hypot(x, z - 20.6) < 6.4) return true;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.rx + 2.4) return true;
  for (const facility of facilities) {
    if (Math.hypot(x - facility.world[0], z - facility.world[2]) < 6.4) return true;
  }
  if (radius < 40 && distanceToRoad(x, z) < 2.6) return true;
  return false;
}

function addOuterRoad(scene) {
  const mainMaterial = standardMaterial(0x584a37, 0.08, 0.92);
  const shoulderMaterial = standardMaterial(0x191f19, 0.06, 0.95);
  const points = getRoadSamples().map((point) => {
    return new THREE.Vector3(point.x, groundHeightAt(point.x, point.z) + 0.03, point.z);
  });

  addRibbon(scene, points, 2.1, shoulderMaterial, undefined);
  addRibbon(scene, points, 1.5, mainMaterial, undefined);

  // 沿路的路灯，越远越稀，把视线带进雾里
  [
    [-3.4, 30],
    [3.8, 47],
    [-4.6, 68],
    [5.2, 92],
    [-5.4, 118]
  ].forEach(([x, z]) => addLamp(scene, x, z));
}

function addGroundDressing(scene) {
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // 草丛：三棱锥小簇，铺满园子外围
  const grassGeometry = new THREE.ConeGeometry(0.085, 0.44, 3, 1, true);
  grassGeometry.translate(0, 0.22, 0);
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.94,
    flatShading: true
  });
  const grassCount = 2400;
  const grass = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount);
  let placed = 0;
  let guard = 0;
  while (placed < grassCount && guard < grassCount * 10) {
    guard += 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = 9.6 + Math.pow(Math.random(), 0.72) * 88;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (dressingBlocked(x, z)) continue;
    const scale = 0.7 + Math.random() * 1.05;
    dummy.position.set(x, groundHeightAt(x, z), z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
    dummy.scale.set(scale * (0.7 + Math.random() * 0.7), scale, scale * (0.7 + Math.random() * 0.7));
    dummy.updateMatrix();
    grass.setMatrixAt(placed, dummy.matrix);
    color.setHSL(0.29 + Math.random() * 0.05, 0.3 + Math.random() * 0.14, 0.08 + Math.random() * 0.06);
    grass.setColorAt(placed, color);
    placed += 1;
  }
  grass.count = placed;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  scene.add(grass);

  // 石头：散落的碎石与几块大一点的景石
  const rockGeometry = new THREE.DodecahedronGeometry(0.42, 0);
  const rockMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.04,
    roughness: 0.88,
    flatShading: true
  });
  const rockCount = 120;
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  for (let index = 0; index < rockCount; index += 1) {
    let x = 0;
    let z = 0;
    let tries = 0;
    do {
      const angle = Math.random() * Math.PI * 2;
      const radius = 10 + Math.pow(Math.random(), 0.8) * 104;
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      tries += 1;
    } while (dressingBlocked(x, z) && tries < 30);

    const scale = 0.4 + Math.pow(Math.random(), 2.2) * 2.1;
    dummy.position.set(x, groundHeightAt(x, z) + scale * 0.18, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(scale * (0.9 + Math.random() * 0.5), scale * (0.6 + Math.random() * 0.4), scale);
    dummy.updateMatrix();
    rocks.setMatrixAt(index, dummy.matrix);
    color.setHSL(0.08, 0.04 + Math.random() * 0.05, 0.1 + Math.random() * 0.07);
    rocks.setColorAt(index, color);
  }
  rocks.instanceMatrix.needsUpdate = true;
  if (rocks.instanceColor) rocks.instanceColor.needsUpdate = true;
  scene.add(rocks);

  // 灌木：比树矮一截，把空草地切碎
  const bushGeometry = new THREE.IcosahedronGeometry(0.62, 1);
  const bushMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0.02,
    roughness: 0.9,
    flatShading: true
  });
  const bushCount = 150;
  const bushes = new THREE.InstancedMesh(bushGeometry, bushMaterial, bushCount);
  bushes.castShadow = true;
  bushes.receiveShadow = true;
  let bushPlaced = 0;
  let bushGuard = 0;
  while (bushPlaced < bushCount && bushGuard < bushCount * 10) {
    bushGuard += 1;
    const angle = Math.random() * Math.PI * 2;
    const radius = 11 + Math.pow(Math.random(), 0.75) * 96;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (dressingBlocked(x, z)) continue;
    const scale = 0.7 + Math.random() * 1.15;
    dummy.position.set(x, groundHeightAt(x, z) + scale * 0.32, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(scale * 1.3, scale * 0.85, scale * 1.15);
    dummy.updateMatrix();
    bushes.setMatrixAt(bushPlaced, dummy.matrix);
    color.setHSL(0.32 + Math.random() * 0.05, 0.28 + Math.random() * 0.14, 0.07 + Math.random() * 0.05);
    bushes.setColorAt(bushPlaced, color);
    bushPlaced += 1;
  }
  bushes.count = bushPlaced;
  bushes.instanceMatrix.needsUpdate = true;
  if (bushes.instanceColor) bushes.instanceColor.needsUpdate = true;
  scene.add(bushes);

  // 花丛：成簇分布，带微弱自发光，夜里才看得见
  const flowerGeometry = new THREE.IcosahedronGeometry(0.075, 0);
  const flowerMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: 0.7,
    emissive: 0xffffff,
    emissiveIntensity: 0.12,
    flatShading: true
  });
  const flowerCount = 260;
  const flowers = new THREE.InstancedMesh(flowerGeometry, flowerMaterial, flowerCount);
  let flowerPlaced = 0;
  let flowerGuard = 0;
  const flowerPalette = [0xd8b478, 0xc98a94, 0xa89ac4, 0xd9c6a0];
  while (flowerPlaced < flowerCount && flowerGuard < flowerCount * 12) {
    flowerGuard += 1;
    const clusterAngle = Math.random() * Math.PI * 2;
    const clusterRadius = 11 + Math.pow(Math.random(), 0.9) * 48;
    const centreX = Math.cos(clusterAngle) * clusterRadius;
    const centreZ = Math.sin(clusterAngle) * clusterRadius;
    const spread = 0.45 + Math.random() * 0.75;
    const perCluster = 5 + Math.floor(Math.random() * 6);
    for (let index = 0; index < perCluster && flowerPlaced < flowerCount; index += 1) {
      const x = centreX + (Math.random() - 0.5) * spread * 2;
      const z = centreZ + (Math.random() - 0.5) * spread * 2;
      if (dressingBlocked(x, z)) continue;
      const scale = 0.55 + Math.random() * 0.6;
      dummy.position.set(x, groundHeightAt(x, z) + 0.1 * scale, z);
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      flowers.setMatrixAt(flowerPlaced, dummy.matrix);
      color.setHex(flowerPalette[Math.floor(Math.random() * flowerPalette.length)]);
      flowers.setColorAt(flowerPlaced, color);
      flowerPlaced += 1;
    }
  }
  flowers.count = flowerPlaced;
  flowers.instanceMatrix.needsUpdate = true;
  if (flowers.instanceColor) flowers.instanceColor.needsUpdate = true;
  scene.add(flowers);
}

function addScenery(scene) {
  const treePositions = [
    [-25, -16], [-20, -22], [-8, -24], [8, -24], [18, -20], [25, -13],
    [28, -2], [27, 10], [23, 19], [12, 22], [-2, 24], [-14, 23],
    [-24, 18], [-28, 7], [-27, -4], [-18, -13], [17, 6], [18, 16],
    [-15, 1], [7, 14], [-10.5, -11.5], [23, -21]
  ];
  treePositions.forEach(([x, z], index) => addTree(scene, x, z, 0.65 + (index % 4) * 0.1));

  [
    [-5, 7], [5, 8], [-7, 13], [8, 13], [-18, -7], [18, 1]
  ].forEach(([x, z]) => addLamp(scene, x, z));

  const fireflyPositions = [];
  for (let index = 0; index < 90; index += 1) {
    fireflyPositions.push(
      (Math.random() - 0.5) * 46,
      0.4 + Math.random() * 3.5,
      (Math.random() - 0.5) * 38
    );
  }
  const fireflyGeometry = new THREE.BufferGeometry();
  fireflyGeometry.setAttribute("position", new THREE.Float32BufferAttribute(fireflyPositions, 3));
  const fireflies = new THREE.Points(
    fireflyGeometry,
    new THREE.PointsMaterial({
      color: 0xffc98a,
      size: 0.065,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    })
  );
  scene.add(fireflies);
}

function addTree(scene, x, z, scale) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.18, 1.9, 7),
    standardMaterial(0x493f31, 0.08, 0.95)
  );
  trunk.position.y = 0.95;
  trunk.castShadow = true;
  group.add(trunk);

  for (let layer = 0; layer < 3; layer += 1) {
    const crown = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.85 - layer * 0.13, 1),
      standardMaterial(layer % 2 ? 0x1b382f : 0x24473a, 0.02, 0.9)
    );
    crown.position.set((layer - 1) * 0.16, 1.65 + layer * 0.5, (layer % 2) * 0.12);
    crown.scale.y = 1.25;
    crown.castShadow = true;
    group.add(crown);
  }

  group.position.set(x, groundHeightAt(x, z), z);
  group.scale.setScalar(scale);
  scene.add(group);
  return group;
}

var lampGlowTexture = null;

function getLampGlowTexture() {
  if (lampGlowTexture) return lampGlowTexture;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,176,92,0.95)");
  gradient.addColorStop(0.32, "rgba(255,150,60,0.34)");
  gradient.addColorStop(0.6, "rgba(206,132,64,0.12)");
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  lampGlowTexture = new THREE.CanvasTexture(canvas);
  return lampGlowTexture;
}

var haloTexture = null;

function getHaloTexture() {
  if (haloTexture) return haloTexture;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.28, "rgba(255,255,255,0.34)");
  gradient.addColorStop(0.62, "rgba(255,255,255,0.09)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  haloTexture = new THREE.CanvasTexture(canvas);
  return haloTexture;
}

function addGlowHalo(scene, x, y, z, color, scale, opacity) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getHaloTexture(),
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity
    })
  );
  sprite.position.set(x, y, z);
  sprite.scale.set(scale, scale, 1);
  scene.add(sprite);
  return sprite;
}

function addLightRing(scene, x, z, radius, count, colorA, colorB, y) {
  const positions = [];
  const colors = [];
  const warm = new THREE.Color(colorA);
  const accent = new THREE.Color(colorB);
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    positions.push(
      x + Math.cos(angle) * radius,
      y + Math.sin(index * 1.7) * 0.05,
      z + Math.sin(angle) * radius
    );
    const color = index % 2 === 0 ? warm : accent;
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.62,
      map: getHaloTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.92,
      sizeAttenuation: true
    })
  );
  scene.add(points);
  return points;
}

function addLamp(scene, x, z) {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.07, 2.4, 8),
    standardMaterial(0x4c5148, 0.75, 0.42)
  );
  pole.position.y = 1.2;
  group.add(pole);

  const light = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd79a })
  );
  light.position.y = 2.45;
  group.add(light);
  group.position.set(x, groundHeightAt(x, z), z);
  scene.add(group);

  const lampLight = new THREE.PointLight(0xffb877, 1.7, 7.5, 2);
  lampLight.position.set(x, groundHeightAt(x, z) + 2.35, z);
  scene.add(lampLight);

  // 灯下的地面光斑：让地皮看起来被灯照过
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 5.2),
    new THREE.MeshBasicMaterial({
      map: getLampGlowTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.55
    })
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(x, groundHeightAt(x, z) + 0.015, z);
  scene.add(pool);

  // 灯泡本体的光晕，让它在远处也像一颗亮点
  addGlowHalo(scene, x, groundHeightAt(x, z) + 2.45, z, 0xffcf94, 1.6, 0.38);
}

function standardMaterial(color, metalness = 0.4, roughness = 0.6, emissive = 0x000000) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity: emissive ? 0.42 : 0
  });
}

function bulbMaterial(color = 0xd8b979) {
  return new THREE.MeshBasicMaterial({ color });
}

function cylinderBetween(start, end, radius, material, segments = 8) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, segments),
    material
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize()
  );
  mesh.castShadow = true;
  return mesh;
}

function rodBetween(parent, start, end, radius, material) {
  const mesh = cylinderBetween(start, end, radius, material);
  parent.add(mesh);
  return mesh;
}

function buildRide(id, scale = 1) {
  const factories = {
    ferris: buildFerris,
    coaster: buildCoasterRefined,
    carousel: buildCarouselDetailed,
    slide: buildSlide,
    garden: buildGarden,
    pendulum: buildPendulum
  };
  const ride = factories[id]();
  ride.group.scale.setScalar(scale);
  if (ride.framingSphere) ride.framingSphere.radius *= scale;
  return ride;
}

function buildFerris() {
  const group = new THREE.Group();

  const hubY = 5.5;
  const wheelR = 3.55;
  const rimZ = 0.36;
  const legZ = 0.82;

  const steel = standardMaterial(0x8d9184, 0.3, 0.54);
  const steelDeep = standardMaterial(0x2c423a, 0.16, 0.64);
  const brass = standardMaterial(0x7d6539, 0.35, 0.5);
  const brassPale = standardMaterial(0x9c824c, 0.3, 0.52);
  const cabinMat = standardMaterial(0x3c5a53, 0.14, 0.62);
  const cabinDeep = standardMaterial(0x22362f, 0.12, 0.68);
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x9db0a6,
    metalness: 0.08,
    roughness: 0.12,
    transparent: true,
    opacity: 0.4
  });
  const glowWarm = bulbMaterial(0xe6c583);
  const glowPale = bulbMaterial(0xd9d4bb);

  const add = (geometry, material, parent, x = 0, y = 0, z = 0, shadow = true) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.castShadow = shadow;
    part.receiveShadow = shadow;
    parent.add(part);
    return part;
  };

  const strut = (parent, start, end, rStart, rEnd, material, segments = 10) => {
    const direction = end.clone().sub(start);
    const part = new THREE.Mesh(
      new THREE.CylinderGeometry(rEnd, rStart, direction.length(), segments),
      material
    );
    part.position.copy(start).addScaledVector(direction, 0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  };

  const flatRing = (radius, tube, material, parent, y, shadow = false) => {
    const ring = add(new THREE.TorusGeometry(radius, tube, 8, 72), material, parent, 0, y, 0, shadow);
    ring.rotation.x = Math.PI / 2;
    return ring;
  };

  // ── 站台：圆形步道 + 放射镶线 + 四盏立灯 ──
  add(new THREE.CylinderGeometry(4.3, 4.5, 0.18, 64), steelDeep, group, 0, 0.09, 0);
  add(new THREE.CylinderGeometry(4.05, 4.2, 0.12, 64), standardMaterial(0x24271f, 0.16, 0.86), group, 0, 0.24, 0);
  flatRing(4.16, 0.035, brass, group, 0.3);
  flatRing(2.1, 0.02, brassPale, group, 0.305);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const inlay = add(
      new THREE.BoxGeometry(1.9, 0.01, 0.02),
      brassPale, group,
      Math.cos(angle) * 3.1, 0.302, Math.sin(angle) * 3.1,
      false
    );
    inlay.rotation.y = -angle;
  }
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    const lx = Math.cos(angle) * 4.05;
    const lz = Math.sin(angle) * 4.05;
    strut(group, new THREE.Vector3(lx, 0.28, lz), new THREE.Vector3(lx, 1.1, lz), 0.045, 0.035, brass, 8);
    add(new THREE.SphereGeometry(0.075, 10, 8), glowWarm, group, lx, 1.17, lz, false);
  }

  // ── A 型支架：两片，位于 z = ±0.82，避开轮盘与吊舱 ──
  for (const z of [-legZ, legZ]) {
    strut(group, new THREE.Vector3(-3.6, 0.24, z), new THREE.Vector3(0, hubY, z), 0.16, 0.1, steel, 14);
    strut(group, new THREE.Vector3(3.6, 0.24, z), new THREE.Vector3(0, hubY, z), 0.16, 0.1, steel, 14);

    for (const x of [-3.6, 3.6]) {
      add(new THREE.CylinderGeometry(0.2, 0.26, 0.12, 16), steelDeep, group, x, 0.3, z);
    }

    strut(group, new THREE.Vector3(-2.05, 3.0, z), new THREE.Vector3(2.05, 3.0, z), 0.045, 0.045, steelDeep, 8);
    strut(group, new THREE.Vector3(-3.6, 0.24, z), new THREE.Vector3(2.05, 3.0, z), 0.026, 0.026, steelDeep, 6);
    strut(group, new THREE.Vector3(3.6, 0.24, z), new THREE.Vector3(-2.05, 3.0, z), 0.026, 0.026, steelDeep, 6);
    strut(group, new THREE.Vector3(-2.05, 3.0, z), new THREE.Vector3(0, hubY, z), 0.05, 0.05, steel, 8);
    strut(group, new THREE.Vector3(2.05, 3.0, z), new THREE.Vector3(0, hubY, z), 0.05, 0.05, steel, 8);

    add(new THREE.SphereGeometry(0.19, 14, 10), steel, group, 0, hubY, z);
  }

  // 两片支架之间的横向联系（只在基础与顶部，避开吊舱轨迹）
  strut(group, new THREE.Vector3(-3.6, 0.3, -legZ), new THREE.Vector3(-3.6, 0.3, legZ), 0.06, 0.06, steelDeep, 10);
  strut(group, new THREE.Vector3(3.6, 0.3, -legZ), new THREE.Vector3(3.6, 0.3, legZ), 0.06, 0.06, steelDeep, 10);
  strut(group, new THREE.Vector3(0, hubY - 0.75, -legZ), new THREE.Vector3(0, hubY - 0.75, legZ), 0.05, 0.05, steelDeep, 10);

  // ── 主轴与轮盘 ──
  add(new THREE.CylinderGeometry(0.11, 0.11, 2.0, 20), brass, group, 0, hubY, 0).rotation.x = Math.PI / 2;

  const spinner = new THREE.Group();
  spinner.position.y = hubY;
  group.add(spinner);

  for (const z of [-rimZ, rimZ]) {
    const rim = add(new THREE.TorusGeometry(wheelR, 0.055, 8, 96), steel, spinner, 0, 0, z, false);
    rim.castShadow = true;
    flatRingAt(spinner, wheelR - 0.34, 0.028, steelDeep, z, false);
  }

  function flatRingAt(parent, radius, tube, material, z, shadow) {
    const ring = add(new THREE.TorusGeometry(radius, tube, 8, 96), material, parent, 0, 0, z, shadow);
    return ring;
  }

  const spokeCount = 24;
  for (let index = 0; index < spokeCount; index += 1) {
    const angle = (index / spokeCount) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(angle), Math.sin(angle), 0);
    strut(spinner, dir.clone().multiplyScalar(0.34), dir.clone().multiplyScalar(wheelR - 0.02), 0.026, 0.02, steel, 7);

    const next = angle + (Math.PI / spokeCount);
    strut(
      spinner,
      new THREE.Vector3(Math.cos(angle) * (wheelR - 0.34), Math.sin(angle) * (wheelR - 0.34), -rimZ),
      new THREE.Vector3(Math.cos(next) * (wheelR - 0.05), Math.sin(next) * (wheelR - 0.05), rimZ),
      0.017, 0.017, steelDeep, 5
    );
  }

  for (let index = 0; index < 40; index += 1) {
    const angle = (index / 40) * Math.PI * 2;
    add(
      new THREE.SphereGeometry(0.036, 8, 6),
      index % 3 ? glowWarm : glowPale,
      spinner,
      Math.cos(angle) * (wheelR + 0.05), Math.sin(angle) * (wheelR + 0.05), rimZ + 0.05,
      false
    );
  }

  add(new THREE.CylinderGeometry(0.46, 0.46, rimZ * 2 + 0.12, 28), steelDeep, spinner, 0, 0, 0).rotation.x = Math.PI / 2;
  for (const z of [-rimZ - 0.07, rimZ + 0.07]) {
    add(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 24), brassPale, spinner, 0, 0, z).rotation.x = Math.PI / 2;
  }

  // ── 吊舱 ×12 ──
  const cabins = [];
  for (let index = 0; index < 12; index += 1) {
    const cabin = new THREE.Group();
    cabin.userData.cabinIndex = index;
    strut(cabin, new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0, -0.26, 0), 0.022, 0.022, steel, 6);

    const roof = add(new THREE.CylinderGeometry(0.13, 0.29, 0.13, 16), cabinMat, cabin, 0, -0.29, 0);
    roof.castShadow = true;
    const band = add(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16), glass, cabin, 0, -0.41, 0, false);
    band.castShadow = false;
    add(new THREE.SphereGeometry(0.1, 10, 8), glowWarm, cabin, 0, -0.41, 0, false);
    add(new THREE.CylinderGeometry(0.28, 0.18, 0.15, 16), cabinDeep, cabin, 0, -0.585, 0);
    const foot = add(new THREE.TorusGeometry(0.26, 0.018, 6, 20), brassPale, cabin, 0, -0.66, 0, false);
    foot.rotation.x = Math.PI / 2;
    const marker = add(new THREE.SphereGeometry(0.03, 8, 6), index % 2 ? glowWarm : glowPale, cabin, 0, -0.68, 0, false);

    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.position.y = -0.42;
    hit.userData.cabinIndex = index;
    cabin.add(hit);

    group.add(cabin);
    cabins.push({ group: cabin, marker, angle: (index / 12) * Math.PI * 2 });
  }

  return {
    group,
    anchorHeight: 9.3,
    cabins,
    update(time) {
      const spin = time * 0.2;
      spinner.rotation.z = spin;
      cabins.forEach(({ group: cabin, angle }, index) => {
        const current = angle + spin;
        cabin.position.set(
          Math.cos(current) * (wheelR - 0.02),
          hubY + Math.sin(current) * (wheelR - 0.02),
          0
        );
        const active = index === selectedCabinIndex;
        cabin.scale.setScalar(active ? 1.14 : 1);
      });
    }
  };
}

function buildCoaster() {
  const group = new THREE.Group();
  const steel = standardMaterial(0x465e55, 0.82, 0.37);
  const rail = standardMaterial(0xc09a73, 0.76, 0.3);
  const dark = standardMaterial(0x243a34, 0.7, 0.48);

  const points = [
    new THREE.Vector3(-5.2, 0.65, -1.8),
    new THREE.Vector3(-3.7, 0.78, 1.8),
    new THREE.Vector3(-1.7, 1.4, 2.2),
    new THREE.Vector3(0.2, 2.8, 1.1),
    new THREE.Vector3(1.5, 4.4, -0.7),
    new THREE.Vector3(3.6, 2.7, -2.1),
    new THREE.Vector3(4.8, 0.8, -0.2),
    new THREE.Vector3(2.7, 0.54, 1.9),
    new THREE.Vector3(0.1, 0.92, 2.6),
    new THREE.Vector3(-3.4, 0.62, -0.8)
  ];
  const curve = new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.16);
  for (const offset of [-0.16, 0.16]) {
    const railPoints = points.map((point, index) => {
      const t = index / points.length;
      const tangent = curve.getTangentAt(t);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(offset);
      return point.clone().add(side);
    });
    const railCurve = new THREE.CatmullRomCurve3(railPoints, true, "catmullrom", 0.16);
    const railMesh = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 180, 0.055, 7, true), rail);
    railMesh.castShadow = true;
    group.add(railMesh);
  }
  const underTrack = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.07, 7, true), dark);
  underTrack.position.y = -0.1;
  group.add(underTrack);

  for (let index = 0; index < 54; index += 1) {
    const t = index / 54;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.035, 0.055), dark);
    tie.position.copy(point);
    tie.position.y -= 0.03;
    tie.rotation.y = Math.atan2(-tangent.z, tangent.x);
    group.add(tie);
  }

  for (let index = 0; index < 16; index += 1) {
    const point = curve.getPointAt(index / 16);
    if (point.y < 0.75) continue;
    // 站台范围内不立杆，避免柱子从站台板里穿出来
    if (point.x > -6.9 && point.x < -2.6 && point.z > -0.6 && point.z < 1.6) continue;
    rodBetween(group, new THREE.Vector3(point.x, 0, point.z), point, 0.045, steel);
  }

  const station = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.28, 1.5), dark);
  station.position.set(-4.7, 0.14, 0.5);
  group.add(station);

  const cars = [makeCoasterCar(0x71524d), makeCoasterCar(0x8d7959)];
  group.add(cars[0].group, cars[1].group);
  const tangent = new THREE.Vector3();

  return {
    group,
    anchorHeight: 4.9,
    update(time) {
      cars.forEach((car, index) => {
        const progress = (time * 0.043 - index * 0.026 + 1) % 1;
        const nextProgress = (progress + 0.003) % 1;
        car.group.position.copy(curve.getPointAt(progress));
        const next = curve.getPointAt(nextProgress);
        car.group.lookAt(next);
        tangent.copy(next).sub(car.group.position);
        car.wheels.forEach((wheel, wheelIndex) => {
          wheel.rotation.x += 0.1 + wheelIndex * 0.001;
        });
      });
    }
  };
}

function makeCoasterCar(color) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.32, 1.12),
    standardMaterial(color, 0.6, 0.42)
  );
  body.position.y = 0.24;
  body.castShadow = true;
  group.add(body);

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.3, 0.76),
    standardMaterial(0x182a29, 0.25, 0.7)
  );
  seat.position.y = 0.48;
  group.add(seat);

  const wheels = [];
  for (const x of [-0.38, 0.38]) {
    for (const z of [-0.38, 0.38]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.1, 12),
        standardMaterial(0x1b2424, 0.7, 0.5)
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.08, z);
      group.add(wheel);
      wheels.push(wheel);
    }
  }
  return { group, wheels };
}

function buildCoasterRefined() {
  const group = new THREE.Group();
  const railMaterial = standardMaterial(0xb69a70, 0.86, 0.28);
  const spineMaterial = standardMaterial(0x2e4540, 0.8, 0.38);
  const supportMaterial = standardMaterial(0x50655c, 0.82, 0.36);
  const stationMaterial = standardMaterial(0x1e302d, 0.55, 0.56);

  const controlPoints = [
    new THREE.Vector3(-5.05, 1.12, -2.35),
    new THREE.Vector3(-5.0, 1.16, -0.1),
    new THREE.Vector3(-4.85, 1.18, 1.25),
    new THREE.Vector3(-4.85, 1.22, 3.0),
    new THREE.Vector3(-4.1, 2.95, 3.95),
    new THREE.Vector3(-3.25, 4.85, 2.6),
    new THREE.Vector3(-2.45, 6.3, 0.72),
    new THREE.Vector3(-1.3, 6.55, -0.42),
    new THREE.Vector3(-0.55, 4.95, -1.75),
    new THREE.Vector3(0.35, 2.15, -2.2),
    new THREE.Vector3(1.45, 0.85, -1.15),
    new THREE.Vector3(2.55, 1.1, 0.55),
    new THREE.Vector3(3.55, 3.05, 1.35),
    new THREE.Vector3(4.65, 3.75, 0.3),
    new THREE.Vector3(4.75, 2.05, -1.3),
    new THREE.Vector3(3.6, 0.85, -1.75),
    new THREE.Vector3(2.25, 0.78, -1.25),
    new THREE.Vector3(1.15, 2.25, -0.25),
    new THREE.Vector3(-0.05, 2.9, 0.9),
    new THREE.Vector3(-2.0, 1.4, -1.9),
    new THREE.Vector3(-4.1, 0.95, -3.0),
    new THREE.Vector3(-5.1, 1.0, -3.25)
  ];
  const curve = new THREE.CatmullRomCurve3(controlPoints, true, "catmullrom", 0.2);

  const railCurves = [-0.19, 0.19].map((offset) => {
    const points = [];
    const samples = 180;
    for (let index = 0; index <= samples; index += 1) {
      const t = index / samples;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const side = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize().multiplyScalar(offset);
      points.push(point.clone().add(side));
    }
    return new THREE.CatmullRomCurve3(points, true, "catmullrom", 0.2);
  });

  railCurves.forEach((railCurve) => {
    const railMesh = new THREE.Mesh(
      new THREE.TubeGeometry(railCurve, 220, 0.055, 7, true),
      railMaterial
    );
    railMesh.castShadow = true;
    group.add(railMesh);
  });

  const spineCurve = controlPoints.map((point) => point.clone().add(new THREE.Vector3(0, -0.22, 0)));
  const spine = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(spineCurve, true, "catmullrom", 0.2),
      220,
      0.085,
      7,
      true
    ),
    spineMaterial
  );
  spine.castShadow = true;
  group.add(spine);

  for (let index = 0; index < 84; index += 1) {
    const t = index / 84;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.032, 0.052), spineMaterial);
    tie.position.copy(point);
    tie.position.y -= 0.015;
    tie.rotation.y = Math.atan2(-tangent.z, tangent.x);
    group.add(tie);
  }

  const supportPoints = [];
  const stationLeft = -6.9;
  const stationRight = -3.4;
  const stationNear = -2.1;
  const stationFar = 2.0;
  for (let index = 0; index < 28; index += 1) {
    const point = curve.getPointAt(index / 28);
    if (point.y < 1.05) continue;
    // 站台体内不立杆：否则柱子会从月台中间穿出来
    if (point.x > stationLeft && point.x < stationRight && point.z > stationNear && point.z < stationFar) continue;
    supportPoints.push(point);
    rodBetween(group, new THREE.Vector3(point.x, 0, point.z), new THREE.Vector3(point.x, point.y, point.z), 0.045, supportMaterial);
    if (point.y > 3.8) {
      rodBetween(
        group,
        new THREE.Vector3(point.x - 0.48, 0, point.z),
        new THREE.Vector3(point.x, point.y * 0.78, point.z),
        0.032,
        supportMaterial
      );
      rodBetween(
        group,
        new THREE.Vector3(point.x + 0.48, 0, point.z),
        new THREE.Vector3(point.x, point.y * 0.78, point.z),
        0.032,
        supportMaterial
      );
    }
  }

  // 站台：轨道沿 z 轴单线直穿，两侧月台，中间留出净空
  const station = new THREE.Group();
  station.position.set(-5.1, 0, -0.2);

  const deckMaterial = standardMaterial(0x243735, 0.5, 0.6);
  const trimMaterial = standardMaterial(0x9a8259, 0.72, 0.36);
  const railMaterialStation = standardMaterial(0x3d4d47, 0.7, 0.4);

  const platformZ = 2.9;
  const platforms = [
    { x: -0.99, width: 0.95, inner: 0.48 },
    { x: 0.91, width: 0.9, inner: -0.42 }
  ];

  platforms.forEach((platform) => {
    // 台身：从地面砌到甲板底，月台不再是悬空的一块板
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(platform.width - 0.06, 0.82, platformZ - 0.06), deckMaterial);
    plinth.position.set(platform.x, 0.41, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    station.add(plinth);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(platform.width, 0.2, platformZ), deckMaterial);
    deck.position.set(platform.x, 0.92, 0);
    deck.castShadow = true;
    deck.receiveShadow = true;
    station.add(deck);

    // 月台边缘的亮色压条，把轮廓提出来
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, platformZ - 0.1), trimMaterial);
    edge.position.set(platform.x + platform.inner, 1.04, 0);
    edge.castShadow = true;
    station.add(edge);

    // 靠轨道一侧的栏杆：立柱 + 扶手
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, platformZ - 0.12), railMaterialStation);
    railTop.position.set(platform.x + platform.inner, 1.62, 0);
    station.add(railTop);
    for (let index = 0; index < 6; index += 1) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 0.04), railMaterialStation);
      post.position.set(platform.x + platform.inner, 1.28, -platformZ / 2 + 0.18 + index * ((platformZ - 0.36) / 5));
      station.add(post);
    }
  });

  // 外侧矮墙 + 嵌进去的玻璃窗
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.5, platformZ), deckMaterial);
  wall.position.set(-1.42, 1.78, 0);
  wall.castShadow = true;
  station.add(wall);
  for (let index = 0; index < 3; index += 1) {
    const window = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.62, 0.62),
      new THREE.MeshBasicMaterial({ color: 0x14262a })
    );
    window.position.set(-1.44, 2.02, -0.92 + index * 0.92);
    station.add(window);
  }

  // 四根落地柱，落在月台上、避开轨道净空
  [[-1.36, -1.34], [-1.36, 1.34], [1.24, -1.34], [1.24, 1.34]].forEach(([x, z]) => {
    rodBetween(station, new THREE.Vector3(x, 0, z), new THREE.Vector3(x, 3.02, z), 0.05, supportMaterial);
  });

  // 双坡屋面：两片斜板在脊线相接，坡向朝两侧下落
  const roofDepth = platformZ + 0.28;
  const roofSlope = 0.2;
  [-1, 1].forEach((side) => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.09, roofDepth), stationMaterial);
    panel.position.set(side * 0.81 - 0.05, 3.16, 0);
    panel.rotation.z = side * -roofSlope;
    panel.castShadow = true;
    station.add(panel);
  });

  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, roofDepth + 0.02), trimMaterial);
  ridge.position.set(-0.05, 3.34, 0);
  ridge.castShadow = true;
  station.add(ridge);

  // 檐口板：压住两片屋面的外沿
  [-1.69, 1.59].forEach((x) => {
    const eave = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, roofDepth), trimMaterial);
    eave.position.set(x, 3.0, 0);
    eave.castShadow = true;
    station.add(eave);
  });

  // 端头横梁，把两片屋面在前后两端连起来
  [-1, 1].forEach((side) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.08, 0.07), trimMaterial);
    beam.position.set(-0.05, 3.02, side * (roofDepth / 2 - 0.02));
    station.add(beam);
  });

  // 东侧台阶：实心踏步，从地面直接砌到月台面，避开南侧进站的轨道
  const stepCount = 4;
  for (let index = 0; index < stepCount; index += 1) {
    const top = 0.82 - index * 0.205;
    if (top <= 0.02) continue;
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.27, top, 0.95), deckMaterial);
    step.position.set(1.375 + 0.135 + index * 0.27, top / 2, 0);
    step.castShadow = true;
    step.receiveShadow = true;
    station.add(step);
  }
  // 台阶两侧的矮边石，收一下轮廓
  [-0.5, 0.5].forEach((z) => {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.12, 0.06), trimMaterial);
    kerb.position.set(1.92, 0.06, z);
    kerb.castShadow = true;
    station.add(kerb);
  });

  // 月台上两盏小灯，立在靠墙一侧
  [-1.0, 1.0].forEach((z) => {
    const lampPost = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), railMaterialStation);
    lampPost.position.set(-1.24, 1.28, z);
    station.add(lampPost);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
    );
    bulb.position.set(-1.24, 1.58, z);
    station.add(bulb);
  });

  group.add(station);

  const train = [0, 1, 2].map((index) => {
    const car = makeDetailedCoasterCar(index === 0);
    group.add(car);
    return car;
  });
  const trainSpine = new THREE.Mesh(
    new THREE.BufferGeometry(),
    standardMaterial(0xa58b65, 0.76, 0.34)
  );
  trainSpine.castShadow = true;
  group.add(trainSpine);
  const couplers = [makeCoasterCoupler(), makeCoasterCoupler()];
  couplers.forEach((coupler) => group.add(coupler));

  const curveLength = curve.getLength();
  const speed = 0.042;
  const worldUp = new THREE.Vector3(0, 1, 0);
  const orientationMatrix = new THREE.Matrix4();
  return {
    group,
    anchorHeight: 7,
    update(time) {
      train.forEach((car, index) => {
        const spacing = (index * 1.15) / curveLength;
        const progress = (time * speed - spacing + 1) % 1;
        const point = curve.getPointAt(progress);
        const forward = curve.getTangentAt(progress).normalize();
        const right = new THREE.Vector3().crossVectors(worldUp, forward).normalize();
        const up = new THREE.Vector3().crossVectors(forward, right).normalize();
        car.position.copy(point);
        car.position.y += 0.23;
        orientationMatrix.makeBasis(right, up, forward);
        car.quaternion.setFromRotationMatrix(orientationMatrix);
      });

      const headProgress = (time * speed + 1) % 1;
      const bodySpan = 2.3 / curveLength;
      const backbonePoints = [];
      for (let index = 0; index <= 12; index += 1) {
        const progress = (headProgress - bodySpan * (index / 12) + 1) % 1;
        const point = curve.getPointAt(progress);
        point.y += 0.22;
        backbonePoints.push(point);
      }
      trainSpine.geometry.dispose();
      trainSpine.geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(backbonePoints),
        12,
        0.045,
        5,
        false
      );

      couplers.forEach((coupler, index) => {
        const front = train[index].position;
        const rear = train[index + 1].position;
        const direction = rear.clone().sub(front);
        coupler.position.copy(front).add(rear).multiplyScalar(0.5);
        coupler.scale.set(1, 1, Math.max(0.1, direction.length()));
        coupler.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.normalize());
      });
    }
  };
}

function makeCoasterCoupler() {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.1, 1),
    standardMaterial(0x283a37, 0.82, 0.32)
  );
  group.add(beam);
  for (const z of [-0.42, 0.42]) {
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.09, 10),
      standardMaterial(0x937653, 0.74, 0.3)
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.z = z;
    group.add(collar);
  }
  return group;
}

function makeDetailedCoasterCar(isLead) {
  const group = new THREE.Group();
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.15, 1.38),
    standardMaterial(0x202c2a, 0.72, 0.42)
  );
  chassis.position.y = 0.08;
  chassis.castShadow = true;
  group.add(chassis);

  for (const z of [-0.7, 0.7]) {
    const hitch = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.09, 0.14),
      standardMaterial(0x9b805b, 0.8, 0.3)
    );
    hitch.position.set(0, 0.1, z);
    group.add(hitch);
  }

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.15, 1.28),
    standardMaterial(isLead ? 0x772e32 : 0x5e292d, 0.58, 0.4)
  );
  body.position.y = 0.22;
  body.castShadow = true;
  group.add(body);

  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.24, isLead ? 0.42 : 0.18),
    standardMaterial(isLead ? 0x9d724e : 0x4f272a, 0.68, 0.32)
  );
  nose.position.set(0, 0.23, isLead ? 0.78 : 0.7);
  group.add(nose);

  for (const x of [-0.2, 0.2]) {
    const headlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd7a0 })
    );
    headlight.position.set(x, 0.2, 0.85);
    group.add(headlight);
  }

  for (const row of [-0.34, 0.25]) {
    for (const x of [-0.23, 0.23]) {
      const seatBack = new THREE.Mesh(
        new THREE.BoxGeometry(0.31, 0.46, 0.17),
        standardMaterial(0x172523, 0.2, 0.66)
      );
      seatBack.position.set(x, 0.55, row - 0.08);
      seatBack.rotation.x = -0.12;
      group.add(seatBack);

      const headrest = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.16, 0.12),
        standardMaterial(0x222b29, 0.1, 0.8)
      );
      headrest.position.set(x, 0.81, row - 0.1);
      group.add(headrest);

      const lapBar = new THREE.Mesh(
        new THREE.TorusGeometry(0.17, 0.018, 5, 12, Math.PI),
        standardMaterial(0xb09262, 0.82, 0.28)
      );
      lapBar.position.set(x, 0.55, row + 0.13);
      lapBar.rotation.set(Math.PI / 2, 0, 0);
      group.add(lapBar);
    }
  }

  for (const side of [-0.37, 0.37]) {
    const sideRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.045, 0.23, 1.15),
      standardMaterial(0x9c825f, 0.74, 0.34)
    );
    sideRail.position.set(side, 0.33, 0);
    group.add(sideRail);

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.014, 0.045, 0.76),
      new THREE.MeshBasicMaterial({ color: 0xc6aa72 })
    );
    stripe.position.set(side * 1.01, 0.23, 0);
    group.add(stripe);
  }

  const wheels = [];
  for (const x of [-0.2, 0.2]) {
    for (const z of [-0.45, 0.42]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.115, 0.075, 14),
        standardMaterial(0x171f20, 0.76, 0.4)
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0, z);
      group.add(wheel);
      wheels.push(wheel);
    }
  }
  return group;
}

function buildCarousel() {
  const group = new THREE.Group();
  const timber = standardMaterial(0x756146, 0.12, 0.8);
  const brass = standardMaterial(0xb49a6d, 0.7, 0.32);
  const dark = standardMaterial(0x314b43, 0.55, 0.48);
  const cream = standardMaterial(0xd0c29e, 0.2, 0.67);

  group.userData.lightRadius = 3.9;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.35, 3.6, 0.28, 48), dark);
  base.position.y = 0.14;
  base.receiveShadow = true;
  group.add(base);

  const spinner = new THREE.Group();
  spinner.position.y = 0.32;
  group.add(spinner);

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.05, 0.18, 48), timber);
  deck.position.y = 0.09;
  deck.receiveShadow = true;
  spinner.add(deck);

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 3.35, 8), brass);
    post.position.set(Math.cos(angle) * 2.75, 1.85, Math.sin(angle) * 2.75);
    spinner.add(post);

    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), bulbMaterial());
    bulb.position.set(Math.cos(angle) * 2.82, 3.58, Math.sin(angle) * 2.82);
    spinner.add(bulb);
  }

  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 3.35, 1.18, 16), standardMaterial(0x3b5a51, 0.48, 0.58));
  roof.position.y = 4.04;
  roof.castShadow = true;
  spinner.add(roof);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10), brass);
  top.position.y = 4.7;
  spinner.add(top);

  const trim = new THREE.Mesh(new THREE.TorusGeometry(3.34, 0.035, 6, 64), brass);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 3.46;
  spinner.add(trim);

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.38, 0.055), dark);
    panel.position.set(Math.cos(angle) * 3.12, 3.26, Math.sin(angle) * 3.12);
    panel.rotation.y = -angle + Math.PI / 2;
    spinner.add(panel);
  }

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const horse = makeHorse(index % 3 === 0 ? cream : standardMaterial(0xbab091, 0.2, 0.7));
    horse.position.set(Math.cos(angle) * 2.05, 0.6, Math.sin(angle) * 2.05);
    horse.rotation.y = Math.PI - angle;
    spinner.add(horse);
  }

  const crown = new THREE.Group();
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), bulbMaterial(0xe0bd7c));
    bulb.position.set(Math.cos(angle) * 3.23, 3.48, Math.sin(angle) * 3.23);
    crown.add(bulb);
  }
  spinner.add(crown);

  return {
    group,
    anchorHeight: 4.8,
    update(time) {
      spinner.rotation.y = -time * 0.24;
    }
  };
}

function makeHorse(material) {
  const horse = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.38, 12, 8), material);
  body.scale.set(0.78, 0.64, 1.45);
  body.position.y = 1.1;
  body.castShadow = true;
  horse.add(body);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.62, 8), material);
  neck.position.set(0, 1.42, -0.42);
  neck.rotation.x = -0.62;
  horse.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 7), material);
  head.scale.set(0.62, 0.7, 1.18);
  head.position.set(0, 1.73, -0.7);
  horse.add(head);
  for (const x of [-0.07, 0.07]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.15, 6), material);
    ear.position.set(x, 1.92, -0.67);
    horse.add(ear);
  }
  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.5), standardMaterial(0x564238, 0.2, 0.8));
  mane.position.set(0, 1.61, -0.42);
  mane.rotation.x = -0.42;
  horse.add(mane);
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.55), standardMaterial(0x664b43, 0.2, 0.7));
  saddle.position.y = 1.37;
  saddle.position.z = 0.02;
  horse.add(saddle);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.08, 0.58, 7), standardMaterial(0x564238, 0.15, 0.82));
  tail.position.set(0, 1.18, 0.61);
  tail.rotation.x = -0.5;
  horse.add(tail);
  for (const x of [-0.2, 0.2]) {
    for (const z of [-0.3, 0.3]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.8, 7), material);
      leg.position.set(x, 0.58, z);
      leg.rotation.z = x > 0 ? 0.08 : -0.08;
      horse.add(leg);
    }
  }
  return horse;
}

function buildCarouselDetailed() {
  const group = new THREE.Group();
  const deepGreen = standardMaterial(0x233c36, 0.52, 0.53);
  const teal = standardMaterial(0x3d5d53, 0.38, 0.58);
  const brass = standardMaterial(0xa88b5e, 0.84, 0.28);
  const paleGold = standardMaterial(0xc6ad7a, 0.78, 0.32);
  const timber = standardMaterial(0x66523c, 0.15, 0.79);
  const dark = standardMaterial(0x182c29, 0.66, 0.46);
  const ivory = standardMaterial(0xc7bca1, 0.2, 0.66);
  const rose = standardMaterial(0x9a7771, 0.2, 0.67);

  const foundation = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.72, 0.28, 64), dark);
  foundation.position.y = 0.14;
  foundation.receiveShadow = true;
  group.add(foundation);

  const lowerStep = new THREE.Mesh(new THREE.CylinderGeometry(3.28, 3.45, 0.16, 64), timber);
  lowerStep.position.y = 0.32;
  group.add(lowerStep);

  const rotor = new THREE.Group();
  rotor.position.y = 0.4;
  group.add(rotor);

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.05, 3.12, 0.2, 64), timber);
  deck.position.y = 0.1;
  deck.receiveShadow = true;
  rotor.add(deck);

  const deckRim = new THREE.Mesh(new THREE.TorusGeometry(3.02, 0.055, 8, 72), brass);
  deckRim.rotation.x = Math.PI / 2;
  deckRim.position.y = 0.23;
  rotor.add(deckRim);

  const centerPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.43, 3.7, 20), brass);
  centerPillar.position.y = 2.05;
  centerPillar.castShadow = true;
  rotor.add(centerPillar);

  const mirror = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.55, 1.32, 24),
    new THREE.MeshPhysicalMaterial({
      color: 0x799088,
      metalness: 0.78,
      roughness: 0.14,
      clearcoat: 0.8
    })
  );
  mirror.position.y = 2.1;
  rotor.add(mirror);

  for (const y of [1.38, 1.5, 2.7, 2.82]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.035, 7, 32), paleGold);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    rotor.add(band);
  }

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 3.55, 8), brass);
    post.position.set(Math.cos(angle) * 2.88, 1.92, Math.sin(angle) * 2.88);
    rotor.add(post);
  }

  const canopyLip = new THREE.Mesh(new THREE.CylinderGeometry(3.43, 3.43, 0.16, 64), deepGreen);
  canopyLip.position.y = 3.63;
  rotor.add(canopyLip);

  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 3.38, 1.34, 28, 1, false), teal);
  roof.position.y = 4.34;
  roof.castShadow = true;
  rotor.add(roof);

  const trimRing = new THREE.Mesh(new THREE.TorusGeometry(3.43, 0.045, 7, 72), brass);
  trimRing.rotation.x = Math.PI / 2;
  trimRing.position.y = 3.69;
  rotor.add(trimRing);

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 14) * Math.PI * 2;
    rodBetween(
      rotor,
      new THREE.Vector3(0, 5.0, 0),
      new THREE.Vector3(Math.cos(angle) * 3.25, 3.72, Math.sin(angle) * 3.25),
      0.022,
      paleGold
    );

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(1.04, 0.34, 0.065),
      index % 2 ? deepGreen : timber
    );
    panel.position.set(Math.cos(angle) * 3.23, 3.43, Math.sin(angle) * 3.23);
    panel.rotation.y = -angle + Math.PI / 2;
    rotor.add(panel);

    const light = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), bulbMaterial(index % 2 ? 0xe1be78 : 0xd7d0b4));
    light.position.set(Math.cos(angle) * 3.29, 3.35, Math.sin(angle) * 3.29);
    rotor.add(light);
  }

  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.62, 0.48, 12), deepGreen);
  crown.position.y = 5.18;
  rotor.add(crown);
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), brass);
  finial.position.y = 5.51;
  rotor.add(finial);

  const horseSlots = [];
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const slot = new THREE.Group();
    slot.position.set(Math.cos(angle) * 2.1, 0.78, Math.sin(angle) * 2.1);
    slot.userData.baseSlotY = slot.position.y;
    slot.rotation.y = -angle;
    slot.userData.phase = (index / 6) * Math.PI * 2;
    rotor.add(slot);
    horseSlots.push(slot);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 3.1, 8), brass);
    pole.position.set(Math.cos(angle) * 2.1, 1.84, Math.sin(angle) * 2.1);
    rotor.add(pole);
  }

  const entry = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.7), timber);
  entry.position.set(0, 0.25, 3.05);
  group.add(entry);

  return {
    group,
    anchorHeight: 5.9,
    horseSlots,
    update(time) {
      rotor.rotation.y = -time * 0.22;
      horseSlots.forEach((slot) => {
        if (slot.userData.horse) {
          slot.position.y =
            slot.userData.baseSlotY + Math.sin(time * 2.2 + slot.userData.phase) * 0.045;
          slot.userData.mixer?.update(0.016);
        }
      });
    }
  };
}

async function hydrateCarouselHorses() {
  if (!THREE.GLTFLoader) return;

  const loader = new THREE.GLTFLoader();
  const load = () => new Promise((resolve, reject) => {
    loader.load("assets/models/horse.glb", resolve, undefined, reject);
  });

  const carousels = [
    overviewWorld?.rides?.carousel,
    focusWorld?.rides?.carousel
  ].filter(Boolean);
  if (!carousels.length) return;

  const models = await Promise.all(carousels.map((ride) =>
    Promise.all(ride.horseSlots.map((_, index) => loadHorseModel(load, index)))
  ));

  carousels.forEach((ride, carouselIndex) => {
    ride.horseSlots.forEach((slot, index) => {
      const horse = models[carouselIndex][index];
      if (!horse) return;
      slot.userData.horse = horse;
      slot.userData.mixer = horse.userData.mixer || null;
      slot.add(horse);
    });
  });
}

async function loadHorseModel(load, index) {
  try {
    const gltf = await load();
    const model = gltf.scene;
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.color?.offsetHSL(0, -0.16, index % 2 ? -0.02 : 0.03);
        child.material.roughness = 0.62;
        child.material.metalness = 0.08;
      }
    });

    const original = new THREE.Box3().setFromObject(model);
    const size = original.getSize(new THREE.Vector3());
    const targetHeight = 1.48;
    const scale = size.y > 0 ? targetHeight / size.y : 1;
    model.scale.setScalar(scale);
    model.updateMatrixWorld(true);

    const scaled = new THREE.Box3().setFromObject(model);
    const center = scaled.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= scaled.min.y;
    model.rotation.y = 0;

    if (gltf.animations?.length) {
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      action.timeScale = 0.62;
      action.play();
      model.userData.mixer = mixer;
    }
    return model;
  } catch (error) {
    console.warn("Horse model failed to load.", error);
    return null;
  }
}

function makeOrnateHorse(material) {
  const shape = new THREE.Shape();
  shape.moveTo(0.95, 1.64);
  shape.lineTo(1.08, 1.56);
  shape.quadraticCurveTo(1.12, 1.43, 0.96, 1.36);
  shape.lineTo(0.7, 1.29);
  shape.quadraticCurveTo(0.56, 1.16, 0.47, 0.9);
  shape.lineTo(0.34, 0.77);
  shape.quadraticCurveTo(0.5, 0.62, 0.35, 0.49);
  shape.lineTo(0.18, 0.52);
  shape.lineTo(0.12, 0.12);
  shape.lineTo(-0.06, 0.12);
  shape.lineTo(-0.12, 0.5);
  shape.lineTo(-0.42, 0.52);
  shape.lineTo(-0.49, 0.16);
  shape.lineTo(-0.68, 0.18);
  shape.lineTo(-0.67, 0.58);
  shape.quadraticCurveTo(-0.87, 0.72, -0.85, 0.91);
  shape.quadraticCurveTo(-0.82, 1.1, -0.58, 1.15);
  shape.quadraticCurveTo(-0.28, 1.25, -0.05, 1.19);
  shape.lineTo(0.24, 1.18);
  shape.lineTo(0.42, 1.36);
  shape.lineTo(0.68, 1.45);
  shape.quadraticCurveTo(0.83, 1.49, 0.95, 1.64);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelSize: 0.035,
    bevelThickness: 0.04,
    bevelSegments: 2,
    steps: 1
  });
  geometry.center();

  const horse = new THREE.Group();
  const body = new THREE.Mesh(geometry, material);
  body.castShadow = true;
  body.scale.setScalar(0.82);
  horse.add(body);

  const saddle = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.09, 0.48),
    standardMaterial(0x654b40, 0.18, 0.72)
  );
  saddle.position.set(-0.03, 0.58, 0.02);
  saddle.rotation.z = -0.04;
  horse.add(saddle);

  const saddleTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.43, 0.035, 0.51),
    standardMaterial(0xb29562, 0.72, 0.32)
  );
  saddleTrim.position.set(-0.03, 0.63, 0.02);
  horse.add(saddleTrim);

  const rein = new THREE.Mesh(
    new THREE.TorusGeometry(0.33, 0.012, 5, 20, Math.PI * 0.82),
    standardMaterial(0x6d4a3f, 0.2, 0.7)
  );
  rein.position.set(0.66, 1.25, 0.15);
  rein.rotation.z = -0.52;
  horse.add(rein);

  return horse;
}

function buildFlumeGeometry(curve, halfWidth, segments = 110) {
  const profile = [
    [-1.0, 0.36], [-1.0, 0.12], [-0.88, 0.01], [-0.64, -0.1],
    [-0.32, -0.16], [0, -0.18], [0.32, -0.16], [0.64, -0.1],
    [0.88, 0.01], [1.0, 0.12], [1.0, 0.36]
  ];
  const positions = [];
  const indices = [];
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3();
  const localUp = new THREE.Vector3();

  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    right.crossVectors(tangent, up).normalize();
    localUp.crossVectors(right, tangent).normalize();
    const taper = Math.min(1, t / 0.09);
    for (const [u, v] of profile) {
      const lift = v > 0 ? v * taper : v;
      positions.push(
        point.x + right.x * u * halfWidth + localUp.x * lift,
        point.y + right.y * u * halfWidth + localUp.y * lift,
        point.z + right.z * u * halfWidth + localUp.z * lift
      );
    }
  }

  const stride = profile.length;
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < stride - 1; j += 1) {
      const a = i * stride + j;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildSlide() {
  const group = new THREE.Group();

  const steel = standardMaterial(0x556a61, 0.18, 0.62);
  const steelDeep = standardMaterial(0x283b34, 0.14, 0.68);
  const brass = standardMaterial(0x6f5a35, 0.35, 0.5);
  const brassPale = standardMaterial(0x8e7643, 0.32, 0.52);
  const flumeMat = new THREE.MeshPhysicalMaterial({
    color: 0x40656a,
    metalness: 0.08,
    roughness: 0.5,
    clearcoat: 0.7,
    clearcoatRoughness: 0.28,
    side: THREE.DoubleSide
  });
  const raftMat = standardMaterial(0xb08a5e, 0.2, 0.5);
  const raftDeep = standardMaterial(0x453a2c, 0.18, 0.66);
  const glowWarm = bulbMaterial(0xe6c583);
  const glowPale = bulbMaterial(0xd9d4bb);

  const add = (geometry, material, parent, x = 0, y = 0, z = 0, shadow = true) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.castShadow = shadow;
    part.receiveShadow = shadow;
    parent.add(part);
    return part;
  };

  const strut = (parent, start, end, rStart, rEnd, material, segments = 10) => {
    const direction = end.clone().sub(start);
    const part = new THREE.Mesh(
      new THREE.CylinderGeometry(rEnd, rStart, direction.length(), segments),
      material
    );
    part.position.copy(start).addScaledVector(direction, 0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  };

  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3();
  const localUp = new THREE.Vector3();

  const points = [
    new THREE.Vector3(-3.05, 6.4, 0.5),
    new THREE.Vector3(-2.25, 5.88, -0.85),
    new THREE.Vector3(-0.6, 5.15, -1.95),
    new THREE.Vector3(1.7, 4.05, -1.75),
    new THREE.Vector3(3.15, 2.85, -0.15),
    new THREE.Vector3(2.95, 1.75, 1.85),
    new THREE.Vector3(1.15, 0.95, 2.6),
    new THREE.Vector3(-0.6, 0.5, 2.05),
    new THREE.Vector3(-1.86, 0.34, 1.45)
  ];
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.22);

  const frameAt = (t) => {
    const point = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();
    right.crossVectors(tangent, up).normalize();
    localUp.crossVectors(right, tangent).normalize();
    return { point, tangent };
  };


  const halfWidth = 0.42;
  const flume = new THREE.Mesh(buildFlumeGeometry(curve, halfWidth), flumeMat);
  flume.castShadow = true;
  flume.receiveShadow = true;
  group.add(flume);

  // 两侧铜边条
  for (const side of [-1, 1]) {
    const edgePoints = [];
    for (let i = 0; i <= 48; i += 1) {
      const t = i / 48;
      const { point } = frameAt(t);
      const taper = Math.min(1, t / 0.09);
      edgePoints.push(
        point.clone()
          .addScaledVector(right, side * halfWidth)
          .addScaledVector(localUp, 0.36 * taper)
      );
    }
    const edgeCurve = new THREE.CatmullRomCurve3(edgePoints, false, "catmullrom", 0.2);
    const edge = new THREE.Mesh(new THREE.TubeGeometry(edgeCurve, 120, 0.022, 6, false), brassPale);
    edge.castShadow = true;
    group.add(edge);
  }

  // 起点塔
  const tower = new THREE.Group();
  tower.position.set(-3.55, 0, 0.9);
  group.add(tower);

  const half = 0.5;
  const top = 6.32;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      strut(
        tower,
        new THREE.Vector3(sx * half, 0.22, sz * half),
        new THREE.Vector3(sx * (half - 0.06), top, sz * (half - 0.06)),
        0.075, 0.055, steel, 8
      );
      add(new THREE.CylinderGeometry(0.11, 0.14, 0.1, 12), steelDeep, tower, sx * half, 0.26, sz * half);
    }
  }
  for (const level of [0.3, 2.4, 4.4, 6.2]) {
    const shrink = 0.06 * (level / top);
    const w = half - shrink;
    strut(tower, new THREE.Vector3(-w, level, -w), new THREE.Vector3(w, level, w), 0.022, 0.022, steelDeep, 6);
    strut(tower, new THREE.Vector3(w, level, -w), new THREE.Vector3(-w, level, w), 0.022, 0.022, steelDeep, 6);
  }

  add(new THREE.BoxGeometry(1.16, 0.12, 1.16), steelDeep, tower, 0, top + 0.06, 0);
  add(new THREE.BoxGeometry(1.04, 0.1, 1.04), standardMaterial(0x3d362c, 0.14, 0.78), tower, 0, top + 0.14, 0);
  for (const [rx, rz] of [[-0.54, -0.54], [0.54, -0.54], [-0.54, 0.54]]) {
    strut(tower, new THREE.Vector3(rx, top + 0.16, rz), new THREE.Vector3(rx, top + 0.9, rz), 0.024, 0.024, brass, 6);
  }
  strut(tower, new THREE.Vector3(-0.54, top + 0.9, -0.54), new THREE.Vector3(0.54, top + 0.9, -0.54), 0.024, 0.024, brass, 6);
  strut(tower, new THREE.Vector3(0.54, top + 0.9, -0.54), new THREE.Vector3(0.54, top + 0.9, 0.54), 0.024, 0.024, brass, 6);
  strut(tower, new THREE.Vector3(-0.54, top + 0.9, -0.54), new THREE.Vector3(-0.54, top + 0.9, 0.54), 0.024, 0.024, brass, 6);

  for (const rx of [-0.16, 0.16]) {
    strut(tower, new THREE.Vector3(rx, 0.3, -0.56), new THREE.Vector3(rx, top, -0.56), 0.02, 0.02, steelDeep, 6);
  }
  for (let index = 0; index < 4; index += 1) {
    const y = 0.6 + index * 0.42;
    strut(tower, new THREE.Vector3(-0.16, y, -0.56), new THREE.Vector3(0.16, y, -0.56), 0.013, 0.013, steelDeep, 5);
  }
  add(new THREE.SphereGeometry(0.07, 10, 8), glowWarm, tower, 0, top + 1.0, 0, false);

  // 预采样槽面，用于给立柱找"正上方的最低槽面"，避免斜段扎穿
  const surfaceSamples = [];
  {
    const sampleRight = new THREE.Vector3();
    const sampleUp = new THREE.Vector3();
    const lateral = [-1, -0.66, -0.32, 0, 0.32, 0.66, 1];
    for (let i = 0; i <= 150; i += 1) {
      const t = i / 150;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      sampleRight.crossVectors(tan, up).normalize();
      sampleUp.crossVectors(sampleRight, tan).normalize();
      const taper = Math.min(1, t / 0.09);
      for (const u of lateral) {
        const rawV = u === 0 ? -0.18 : (u === 1 || u === -1 ? 0.36 : -0.11);
        const v = rawV > 0 ? rawV * taper : rawV;
        surfaceSamples.push(p.clone().addScaledVector(sampleRight, u * halfWidth).addScaledVector(sampleUp, v));
      }
    }
  }

  const postList = [];

  // 支撑立柱
  for (let index = 0; index < 5; index += 1) {
    const t = 0.16 + index * 0.18;
    const { point } = frameAt(t);
    const underside = point.clone().addScaledVector(localUp, -0.18);
    if (underside.y < 0.7) continue;

    // 立柱正上方所有槽面点里的最低点
    let lowest = underside.y;
    for (const sample of surfaceSamples) {
      if (Math.hypot(sample.x - underside.x, sample.z - underside.z) > 0.1) continue;
      if (sample.y < lowest) lowest = sample.y;
    }

    const postTop = lowest - 0.04;
    strut(
      group,
      new THREE.Vector3(underside.x, 0.02, underside.z),
      new THREE.Vector3(underside.x, postTop, underside.z),
      0.072, 0.055, steel, 8
    );
    add(new THREE.CylinderGeometry(0.14, 0.18, 0.1, 12), steelDeep, group, underside.x, 0.05, underside.z);
    add(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12), brass, group, underside.x, postTop - 0.015, underside.z);
    postList.push({ x: underside.x, z: underside.z, top: postTop });
  }

  // 终点水池
  add(new THREE.CylinderGeometry(0.94, 1.02, 0.14, 40), steelDeep, group, -1.86, 0.07, 1.45);
  const water = add(
    new THREE.CircleGeometry(0.88, 40),
    new THREE.MeshPhysicalMaterial({
      color: 0x22454a,
      metalness: 0.25,
      roughness: 0.18,
      clearcoat: 0.8
    }),
    group, -1.86, 0.16, 1.45
  );
  water.rotation.x = -Math.PI / 2;
  const poolRim = add(new THREE.TorusGeometry(0.98, 0.035, 8, 48), brass, group, -1.86, 0.15, 1.45, false);
  poolRim.rotation.x = Math.PI / 2;

  // 滑行垫：薄型，按曲线逐点计算所需高度，始终悬在槽底之上
  const raft = new THREE.Group();
  const hull = add(new THREE.SphereGeometry(0.3, 22, 14), raftMat, raft, 0, 0, 0);
  hull.scale.set(0.433, 0.13, 0.567);
  const handle = add(new THREE.TorusGeometry(0.08, 0.011, 6, 14, Math.PI), brassPale, raft, 0, 0.008, -0.11, false);
  handle.castShadow = false;
  add(new THREE.SphereGeometry(0.024, 8, 6), glowPale, raft, 0, 0.028, 0.088, false);
  group.add(raft);

  const basis = new THREE.Matrix4();
  const padHalfLength = 0.16;
  const padHalfThick = 0.039;
  const curveLength = curve.getLength();
  const clearance = 0.05;

  const placeOnCurve = (t) => {
    const { point, tangent } = frameAt(t);
    basis.makeBasis(right, localUp, tangent);
    raft.quaternion.setFromRotationMatrix(basis);

    // 沿垫长采样槽面高度，取所有站位里最苛刻的那一个
    let height = -0.18 + clearance + padHalfThick;
    for (const s of [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1]) {
      const probeT = Math.min(0.998, Math.max(0.002, t + (s * padHalfLength) / curveLength));
      const probe = curve.getPointAt(probeT);
      const normalOffset = probe.clone().sub(point).dot(localUp);
      const bottomAt = padHalfThick * Math.sqrt(Math.max(0, 1 - s * s));
      const need = normalOffset - 0.18 + clearance + bottomAt;
      if (need > height) height = need;
    }

    // 侧向：垫子赤道边缘处槽底已经抬起，取那个更高位置
    const edgeNeed = -0.16 + clearance;
    if (edgeNeed > height) height = edgeNeed;

    raft.position.copy(point).addScaledVector(localUp, height);
  };
  placeOnCurve(0.1);

  return {
    group,
    anchorHeight: 7.2,
    update(time) {
      const progress = 0.04 + ((time * 0.055) % 0.9);
      placeOnCurve(progress);
    }
  };
}

function buildGarden() {
  const group = new THREE.Group();

  const moss = standardMaterial(0x060b08, 0.04, 0.95);
  const mossDark = standardMaterial(0x040706, 0.03, 0.96);
  const stone = standardMaterial(0x0d0f0b, 0.16, 0.84);
  const stoneDark = standardMaterial(0x050603, 0.14, 0.88);
  const timber = standardMaterial(0x16100a, 0.1, 0.82);
  const timberDark = standardMaterial(0x120c07, 0.08, 0.86);
  const brass = standardMaterial(0x453420, 0.38, 0.5);
  const brassPale = standardMaterial(0x5a4626, 0.32, 0.54);
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x0a1210, metalness: 0.12, roughness: 0.66, flatShading: true });
  const floorMat = standardMaterial(0x0b0906, 0.1, 0.9);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x040e14,
    metalness: 0.16,
    roughness: 0.11,
    clearcoat: 1,
    clearcoatRoughness: 0.08
  });
  waterMat.onBeforeCompile = (shader) => {
    shader.uniforms.waveTime = { value: 0 };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float waveTime;')
      .replace('#include <beginnormal_vertex>', `
        #include <beginnormal_vertex>
        float shore = 1.0 - smoothstep(1.82, 2.0, length(position.xy));
        float nX = cos(position.x * 2.6 + waveTime * 1.15) * cos(position.y * 2.1 + waveTime * 0.85);
        float nY = sin(position.y * 3.1 - waveTime * 1.05) * cos(position.x * 1.9 - waveTime * 0.72);
        objectNormal = normalize(objectNormal + vec3(-nX * 0.26 * shore, -nY * 0.26 * shore, 0.0));
      `)
      .replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float shoreFade = 1.0 - smoothstep(1.82, 2.0, length(position.xy));
        transformed.z +=
          (sin(position.x * 2.4 + waveTime * 1.1) * cos(position.y * 2.0 + waveTime * 0.78) * 0.017 +
           sin((position.x + position.y) * 3.7 - waveTime * 1.55) * 0.008 +
           sin((position.x - position.y) * 5.3 + waveTime * 2.1) * 0.004) * shoreFade;
      `);
    waterMat.userData.shader = shader;
  };
  const glowWarm = bulbMaterial(0xe6c583);
  const glowPale = bulbMaterial(0xd9d4bb);

  const add = (geometry, material, parent, x = 0, y = 0, z = 0, shadow = true) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.castShadow = shadow;
    part.receiveShadow = shadow;
    parent.add(part);
    return part;
  };

  const strut = (parent, start, end, rStart, rEnd, material, segments = 8) => {
    const direction = end.clone().sub(start);
    const part = new THREE.Mesh(
      new THREE.CylinderGeometry(rEnd, rStart, direction.length(), segments),
      material
    );
    part.position.copy(start).addScaledVector(direction, 0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  };

  const flatRing = (radius, tube, material, parent, y, shadow = false) => {
    const ring = add(new THREE.TorusGeometry(radius, tube, 8, 80), material, parent, 0, y, 0, shadow);
    ring.rotation.x = Math.PI / 2;
    return ring;
  };

  const entryAngle = 1.95;

  // ── 园地：石砌基座 + 环形草坡（中间留出湖面）──
  add(new THREE.CylinderGeometry(3.44, 3.58, 0.2, 64), stoneDark, group, 0, 0.1, 0);
  add(new THREE.CylinderGeometry(3.36, 3.44, 0.14, 64, 1, true), stone, group, 0, 0.27, 0);
  const terrace = add(new THREE.RingGeometry(2.02, 3.36, 72), stone, group, 0, 0.34, 0);
  terrace.rotation.x = -Math.PI / 2;
  terrace.receiveShadow = true;
  const lawn = add(new THREE.RingGeometry(2.1, 3.3, 72), moss, group, 0, 0.345, 0);
  lawn.rotation.x = -Math.PI / 2;
  lawn.receiveShadow = true;
  flatRing(3.3, 0.028, brass, group, 0.35);

  // ── 湖水：低于台面 0.04，形成下沉水面 ──
  const water = add(new THREE.RingGeometry(0.012, 2.02, 72, 26), waterMat, group, 0, 0.3, 0);
  water.rotation.x = -Math.PI / 2;
  water.receiveShadow = false;
  flatRing(2.02, 0.03, stoneDark, group, 0.335, false);
  for (let index = 0; index < 26; index += 1) {
    const a = (index / 26) * Math.PI * 2;
    const r = 2.02 + ((index * 13) % 5) * 0.005;
    const block = add(
      new THREE.BoxGeometry(0.22, 0.1, 0.15),
      index % 3 ? stone : stoneDark,
      group,
      Math.cos(a) * r, 0.35, Math.sin(a) * r
    );
    block.rotation.y = Math.PI / 2 - a + ((index % 4) - 1.5) * 0.02;
    block.rotation.z = ((index % 3) - 1) * 0.018;
  }
  const ripples = [];
  for (let index = 0; index < 4; index += 1) {
    const ripple = add(
      new THREE.TorusGeometry(1, 0.008, 4, 72),
      new THREE.MeshBasicMaterial({ color: 0x9dc0b6, transparent: true, opacity: 0, depthWrite: false }),
      group, 0, 0.335, 0, false
    );
    ripple.rotation.x = Math.PI / 2;
    ripple.userData.phase = index / 4;
    ripples.push(ripple);
  }

  const reflection = add(
    new THREE.CircleGeometry(0.66, 40),
    new THREE.MeshBasicMaterial({ color: 0xffcf94, transparent: true, opacity: 0.12, depthWrite: false }),
    group, 0, 0.305, 0
  );
  reflection.rotation.x = -Math.PI / 2;
  reflection.scale.set(1, 0.62, 1);

  const mist = add(
    new THREE.CircleGeometry(1.92, 48),
    new THREE.MeshBasicMaterial({ color: 0xb9d2c6, transparent: true, opacity: 0.08, depthWrite: false }),
    group, 0, 0.352, 0
  );
  mist.rotation.x = -Math.PI / 2;

  // ── 湖心亭 ──
  add(new THREE.CylinderGeometry(0.72, 0.8, 0.14, 6), stoneDark, group, 0, 0.42, 0);
  add(new THREE.CylinderGeometry(0.56, 0.74, 0.16, 6), stone, group, 0, 0.55, 0);
  add(new THREE.CylinderGeometry(0.92, 0.92, 0.1, 6), floorMat, group, 0, 0.66, 0);
  add(new THREE.CylinderGeometry(0.96, 0.96, 0.035, 6), brass, group, 0, 0.72, 0);

  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const cx = Math.cos(angle) * 0.72;
    const cz = Math.sin(angle) * 0.72;
    add(new THREE.CylinderGeometry(0.085, 0.095, 0.07, 8), stone, group, cx, 0.75, cz);
    strut(
      group,
      new THREE.Vector3(cx, 0.76, cz),
      new THREE.Vector3(cx, 2.14, cz),
      0.05, 0.043, timber, 8
    );
  }

  // 美人靠长凳（五面，入口一面留空）
  const slab = (x0, z0, x1, z1, y, depth, thickness, material) => {
    const dx = x1 - x0;
    const dz = z1 - z0;
    const part = new THREE.Mesh(
      new THREE.BoxGeometry(Math.hypot(dx, dz), thickness, depth),
      material
    );
    part.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    part.rotation.y = -Math.atan2(dz, dx);
    part.castShadow = true;
    part.receiveShadow = true;
    group.add(part);
    return part;
  };

  for (let index = 0; index < 6; index += 1) {
    const a0 = (index / 6) * Math.PI * 2;
    const a1 = ((index + 1) / 6) * Math.PI * 2;
    if (Math.abs(((a0 + a1) / 2) - entryAngle) < 0.7) continue;

    const seatR = 0.6;
    slab(
      Math.cos(a0) * seatR, Math.sin(a0) * seatR,
      Math.cos(a1) * seatR, Math.sin(a1) * seatR,
      0.93, 0.17, 0.05, timber
    );
    slab(
      Math.cos(a0) * seatR, Math.sin(a0) * seatR,
      Math.cos(a1) * seatR, Math.sin(a1) * seatR,
      0.9, 0.15, 0.02, timberDark
    );

    const backR = 0.735;
    slab(
      Math.cos(a0) * backR, Math.sin(a0) * backR,
      Math.cos(a1) * backR, Math.sin(a1) * backR,
      1.14, 0.035, 0.16, timberDark
    );
    slab(
      Math.cos(a0) * backR, Math.sin(a0) * backR,
      Math.cos(a1) * backR, Math.sin(a1) * backR,
      1.3, 0.07, 0.045, timber
    );
  }

  // 中央石桌与茶具
  add(new THREE.CylinderGeometry(0.13, 0.17, 0.07, 6), stone, group, 0, 0.745, 0);
  add(new THREE.CylinderGeometry(0.052, 0.075, 0.3, 8), stone, group, 0, 0.9, 0);
  add(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 6), stone, group, 0, 1.075, 0);
  add(new THREE.CylinderGeometry(0.268, 0.268, 0.014, 6), brassPale, group, 0, 1.035, 0);
  for (const [cx, cz] of [[0.1, 0.05], [-0.09, -0.08], [0.02, 0.12]]) {
    add(new THREE.CylinderGeometry(0.022, 0.017, 0.035, 8), brassPale, group, cx, 1.118, cz);
  }

  // 檐口与曲面攒尖顶（凹曲线，六棱）
  add(new THREE.CylinderGeometry(0.8, 0.8, 0.07, 6), timberDark, group, 0, 2.17, 0);
  add(new THREE.CylinderGeometry(1.07, 1.07, 0.03, 6), brass, group, 0, 2.23, 0);

  const roofProfile = [
    new THREE.Vector2(1.05, 0),
    new THREE.Vector2(0.98, 0.09),
    new THREE.Vector2(0.83, 0.18),
    new THREE.Vector2(0.61, 0.27),
    new THREE.Vector2(0.36, 0.35),
    new THREE.Vector2(0.14, 0.42),
    new THREE.Vector2(0.03, 0.46)
  ];
  const roof = add(new THREE.LatheGeometry(roofProfile, 6), roofMat, group, 0, 2.24, 0);
  roof.castShadow = true;

  add(new THREE.CylinderGeometry(0.5, 0.5, 0.025, 6), brassPale, group, 0, 2.7, 0);
  const upperProfile = [
    new THREE.Vector2(0.52, 0),
    new THREE.Vector2(0.4, 0.08),
    new THREE.Vector2(0.22, 0.15),
    new THREE.Vector2(0.04, 0.2)
  ];
  add(new THREE.LatheGeometry(upperProfile, 6), roofMat, group, 0, 2.7, 0);
  add(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 8), brass, group, 0, 2.98, 0);
  add(new THREE.SphereGeometry(0.055, 12, 10), brassPale, group, 0, 3.07, 0);
  add(new THREE.SphereGeometry(0.028, 8, 6), glowWarm, group, 0, 3.11, 0, false);

  // ── 亭内吊灯：从梁底垂下的锁链 + 六角铜灯笼 ──
  const ceilingY = 2.132;
  const lanternTop = 1.885;

  // 链芯与交替朝向的链环（保证视觉上连贯、真正吊住灯具）
  strut(group, new THREE.Vector3(0, ceilingY, 0), new THREE.Vector3(0, lanternTop, 0), 0.007, 0.007, timberDark, 6);
  for (let index = 0; index < 5; index += 1) {
    const link = add(
      new THREE.TorusGeometry(0.019, 0.0045, 5, 10),
      brass,
      group,
      0,
      ceilingY - 0.028 - index * 0.052,
      0,
      false
    );
    link.rotation.y = index % 2 ? Math.PI / 2 : 0;
  }

  // 吊环、灯帽、帽檐
  const hangLoop = add(new THREE.TorusGeometry(0.026, 0.0065, 6, 12), brassPale, group, 0, lanternTop + 0.008, 0, false);
  add(new THREE.CylinderGeometry(0.034, 0.146, 0.072, 6), brass, group, 0, lanternTop - 0.034, 0);
  add(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 6), brassPale, group, 0, lanternTop - 0.074, 0);

  // 六角灯身：暖色灯罩 + 铜棱 + 中箍
  const lampGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffd9a4,
    emissive: 0xffb46a,
    emissiveIntensity: 0.5,
    metalness: 0,
    roughness: 0.32,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  add(new THREE.CylinderGeometry(0.112, 0.112, 0.2, 6, 1, true), lampGlass, group, 0, 1.72, 0, false);
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2;
    const rib = add(
      new THREE.BoxGeometry(0.013, 0.204, 0.013),
      brass,
      group,
      Math.sin(angle) * 0.108, 1.72, Math.cos(angle) * 0.108,
      false
    );
    rib.rotation.y = Math.atan2(Math.sin(angle), Math.cos(angle));
  }
  add(new THREE.CylinderGeometry(0.118, 0.118, 0.015, 6), brass, group, 0, 1.72, 0, false);

  // 灯底托、垂珠
  add(new THREE.CylinderGeometry(0.112, 0.146, 0.03, 6), brass, group, 0, 1.604, 0);
  add(new THREE.ConeGeometry(0.042, 0.055, 6), brassPale, group, 0, 1.568, 0).rotation.x = Math.PI;
  add(new THREE.SphereGeometry(0.017, 8, 6), brass, group, 0, 1.535, 0, false);

  // 灯芯光源
  add(new THREE.SphereGeometry(0.072, 14, 12), glowWarm, group, 0, 1.72, 0, false);
  const lantern = new THREE.PointLight(0xffcf94, 2.4, 6.5, 2);
  lantern.position.set(0, 1.72, 0);
  group.add(lantern);
  hangLoop.rotation.x = Math.PI / 2;

  // ── 环湖栏杆（留进出口）──
  const railR = 2.28;
  const gap = 0.62;
  const postCount = 20;
  const openArc = Math.PI * 2 - gap;
  const postAngles = [];
  for (let index = 0; index < postCount; index += 1) {
    postAngles.push(entryAngle + gap / 2 + (openArc * index) / (postCount - 1));
  }

  postAngles.forEach((angle, index) => {
    const x = Math.cos(angle) * railR;
    const z = Math.sin(angle) * railR;
    strut(group, new THREE.Vector3(x, 0.34, z), new THREE.Vector3(x, 0.86, z), 0.032, 0.026, brass, 6);
    add(new THREE.SphereGeometry(0.04, 8, 6), brassPale, group, x, 0.88, z, false);
    if (index % 3 === 1) {
      add(new THREE.SphereGeometry(0.075, 12, 10), glowWarm, group, x, 0.95, z, false);
      add(new THREE.ConeGeometry(0.085, 0.06, 8), brass, group, x, 1.03, z, false);
    }
    if (index < postAngles.length - 1) {
      const next = postAngles[index + 1];
      strut(
        group,
        new THREE.Vector3(x, 0.83, z),
        new THREE.Vector3(Math.cos(next) * railR, 0.83, Math.sin(next) * railR),
        0.022, 0.022, timberDark, 6
      );
      strut(
        group,
        new THREE.Vector3(x, 0.58, z),
        new THREE.Vector3(Math.cos(next) * railR, 0.58, Math.sin(next) * railR),
        0.014, 0.014, timberDark, 5
      );
    }
  });

  // ── 入口木桥 ──
  const bridgeDir = new THREE.Vector2(Math.cos(entryAngle), Math.sin(entryAngle));
  const bridgeSide = new THREE.Vector2(-bridgeDir.y, bridgeDir.x);
  const plankCount = 8;
  const bridgeOuter = 2.24;
  const bridgeInner = 0.92;
  for (let index = 0; index < plankCount; index += 1) {
    const t = index / (plankCount - 1);
    const r = bridgeOuter + (bridgeInner - bridgeOuter) * t;
    const plank = add(
      new THREE.BoxGeometry(0.56, 0.05, 0.2),
      index % 2 ? timber : timberDark,
      group,
      bridgeDir.x * r, 0.35 + 0.27 * t, bridgeDir.y * r
    );
    plank.rotation.y = Math.PI / 2 - entryAngle;
    plank.castShadow = true;
  }
  for (const side of [-1, 1]) {
    const sx = bridgeSide.x * 0.27 * side;
    const sz = bridgeSide.y * 0.27 * side;
    strut(
      group,
      new THREE.Vector3(bridgeDir.x * bridgeOuter + sx, 0.62, bridgeDir.y * bridgeOuter + sz),
      new THREE.Vector3(bridgeDir.x * bridgeInner + sx, 0.9, bridgeDir.y * bridgeInner + sz),
      0.018, 0.018, brass, 6
    );
    strut(
      group,
      new THREE.Vector3(bridgeDir.x * bridgeOuter + sx, 0.34, bridgeDir.y * bridgeOuter + sz),
      new THREE.Vector3(bridgeDir.x * bridgeOuter + sx, 0.62, bridgeDir.y * bridgeOuter + sz),
      0.024, 0.024, brass, 6
    );
    strut(
      group,
      new THREE.Vector3(bridgeDir.x * bridgeInner + sx, 0.62, bridgeDir.y * bridgeInner + sz),
      new THREE.Vector3(bridgeDir.x * bridgeInner + sx, 0.9, bridgeDir.y * bridgeInner + sz),
      0.024, 0.024, brass, 6
    );
  }

  // ── 花圃：低矮叶丛 + 实例化花朵 + 池边石块 ──
  const beds = [];
  for (let index = 0; index < 18; index += 1) {
    const angle = 0.14 + index * 0.348;
    const delta = Math.abs(Math.atan2(Math.sin(angle - entryAngle), Math.cos(angle - entryAngle)));
    if (delta < 0.34) continue;
    beds.push({ angle, radius: 2.48 + (index % 3) * 0.24 });
  }

  for (const bed of beds) {
    const bx = Math.cos(bed.angle) * bed.radius;
    const bz = Math.sin(bed.angle) * bed.radius;
    for (let k = 0; k < 2; k += 1) {
      const clump = add(
        new THREE.IcosahedronGeometry(0.16, 1),
        k % 2 ? mossDark : moss,
        group,
        bx + Math.cos(bed.angle + k * 3.1) * 0.1,
        0.37,
        bz + Math.sin(bed.angle + k * 3.1) * 0.1
      );
      clump.scale.set(1.15, 0.55, 1.15);
      clump.rotation.y = bed.angle * 2 + k;
    }
  }

  const blossomPalette = [0xd23a5c, 0xb03a86, 0x7a4ad0, 0xd06a20, 0xc09618, 0xe8e0d0, 0xe0708c];
  const perBed = 16;
  const blossomGeo = new THREE.IcosahedronGeometry(0.072, 1);
  const stemGeo = new THREE.CylinderGeometry(0.005, 0.007, 1, 4);
  const byColor = blossomPalette.map(() => []);
  const stemMatrices = [];
  const dummy = new THREE.Object3D();

  for (const bed of beds) {
    const cx = Math.cos(bed.angle) * bed.radius;
    const cz = Math.sin(bed.angle) * bed.radius;
    for (let k = 0; k < perBed; k += 1) {
      const a = bed.angle + (k - (perBed - 1) / 2) * 0.19;
      const rr = 0.06 + ((k * 7) % 7) * 0.019;
      const bx = cx + Math.cos(a) * rr;
      const bz = cz + Math.sin(a) * rr;
      const h = 0.52 + ((k * 5) % 7) / 7 * 0.15;

      dummy.position.set(bx, h, bz);
      dummy.rotation.set(0, a * 1.9 + k, 0);
      dummy.scale.set(1, 0.6, 1);
      dummy.updateMatrix();
      const colorIndex = (k * 3 + Math.round(bed.radius * 10)) % blossomPalette.length;
      byColor[colorIndex].push(dummy.matrix.clone());

      dummy.position.set(bx, 0.34 + (h - 0.34) / 2, bz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, h - 0.34, 1);
      dummy.updateMatrix();
      stemMatrices.push(dummy.matrix.clone());
    }
  }

  byColor.forEach((matrices, colorIndex) => {
    if (!matrices.length) return;
    const mesh = new THREE.InstancedMesh(
      blossomGeo,
      new THREE.MeshStandardMaterial({
        color: blossomPalette[colorIndex],
        roughness: 0.58,
        metalness: 0.05
      }),
      matrices.length
    );
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.castShadow = true;
    group.add(mesh);
  });

  const stems = new THREE.InstancedMesh(stemGeo, standardMaterial(0x1b2a1f, 0.03, 0.92), stemMatrices.length);
  stemMatrices.forEach((matrix, index) => stems.setMatrixAt(index, matrix));
  group.add(stems);


  // 池边石块
  for (let index = 0; index < 10; index += 1) {
    const a = 0.42 + index * 0.63;
    const r = 2.12 + (index % 3) * 0.05;
    const rock = add(
      new THREE.IcosahedronGeometry(0.09 + (index % 4) * 0.022, 0),
      stone, group,
      Math.cos(a) * r, 0.34, Math.sin(a) * r
    );
    rock.scale.set(1.25, 0.6, 0.95);
    rock.rotation.set(index * 0.8, index * 1.4, index * 0.5);
  }

  // 石灯笼
  const lampA = entryAngle + 0.46;
  const lx = Math.cos(lampA) * 2.52;
  const lz = Math.sin(lampA) * 2.52;
  add(new THREE.CylinderGeometry(0.075, 0.095, 0.09, 8), stone, group, lx, 0.385, lz);
  add(new THREE.CylinderGeometry(0.042, 0.052, 0.28, 8), stone, group, lx, 0.57, lz);
  add(new THREE.CylinderGeometry(0.115, 0.115, 0.028, 6), stone, group, lx, 0.72, lz);
  add(new THREE.BoxGeometry(0.13, 0.13, 0.13), glowWarm, group, lx, 0.8, lz, false);
  add(new THREE.ConeGeometry(0.155, 0.095, 6), stone, group, lx, 0.9, lz);
  add(new THREE.SphereGeometry(0.032, 8, 6), stone, group, lx, 0.96, lz);

  // ── 点缀树 ──
  for (const [angle, scale] of [[2.7, 0.95], [4.15, 0.8], [5.45, 1.05]]) {
    const tree = new THREE.Group();
    const trunk = add(new THREE.CylinderGeometry(0.045, 0.075, 0.72, 7), timberDark, tree, 0, 0.36, 0);
    trunk.castShadow = true;
    for (let layer = 0; layer < 3; layer += 1) {
      const crown = add(
        new THREE.IcosahedronGeometry(0.3 - layer * 0.05, 1),
        layer % 2 ? mossDark : moss,
        tree,
        (layer - 1) * 0.07, 0.72 + layer * 0.19, (layer % 2) * 0.05
      );
      crown.scale.y = 1.15;
      crown.castShadow = true;
    }
    tree.position.set(Math.cos(angle) * 3.02, 0.33, Math.sin(angle) * 3.02);
    tree.scale.setScalar(scale);
    group.add(tree);
  }

  // ── 萤火虫：从花丛里一阵阵飞起 ──
  const fireflies = [];
  for (let index = 0; index < 24; index += 1) {
    const angle = 0.3 + index * 0.263;
    const radius = 2.5 + ((index * 11) % 9) / 9 * 0.72;
    const material = new THREE.MeshBasicMaterial({
      color: index % 4 === 0 ? 0xd8e0c0 : 0xe8d29a,
      transparent: true,
      opacity: 0
    });
    const bug = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), material);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xe8d29a, transparent: true, opacity: 0, depthWrite: false })
    );
    bug.add(halo);
    const base = new THREE.Vector3(Math.cos(angle) * radius, 0.5 + ((index * 5) % 7) / 7 * 0.26, Math.sin(angle) * radius);
    bug.position.copy(base);
    bug.userData = {
      base,
      phase: ((index * 0.37) % 1),
      speed: 0.11 + (index % 5) * 0.018,
      rise: 0.34 + (index % 3) * 0.14
    };
    group.add(bug);
    fireflies.push(bug);
  }

  return {
    group,
    anchorHeight: 3.5,
    update(time) {
      if (waterMat.userData.shader) {
        waterMat.userData.shader.uniforms.waveTime.value = time;
      }
      reflection.material.opacity = 0.1 + Math.sin(time * 0.62) * 0.03;
      reflection.scale.set(1 + Math.sin(time * 0.48) * 0.05, 0.62 + Math.cos(time * 0.39) * 0.04, 1);
      mist.rotation.z = time * 0.05;
      mist.material.opacity = 0.07 + Math.sin(time * 0.31) * 0.018;
      lantern.intensity = 2.4 + Math.sin(time * 5.3) * 0.12 + Math.sin(time * 9.1) * 0.06;
      lampGlass.emissiveIntensity = 0.5 + Math.sin(time * 5.3) * 0.03;
      ripples.forEach((ripple) => {
        const cyc = (time * 0.11 + ripple.userData.phase) % 1;
        const scale = 0.18 + cyc * 1.78;
        ripple.scale.set(scale, scale, 1);
        ripple.material.opacity = Math.min(1, cyc * 5) * (1 - cyc) * 0.24;
      });

      fireflies.forEach((bug) => {
        const data = bug.userData;
        const cycle = (data.phase + time * data.speed) % 1;
        let alpha = 0;
        if (cycle < 0.16) alpha = cycle / 0.16;
        else if (cycle < 0.6) alpha = 1;
        else if (cycle < 0.94) alpha = 1 - (cycle - 0.6) / 0.34;
        bug.material.opacity = alpha * 0.95;
        bug.children[0].material.opacity = alpha * 0.08;
        const rise = Math.min(1, cycle / 0.85) * data.rise;
        bug.position.set(
          data.base.x + Math.sin(time * 0.7 + data.phase * 11) * 0.17,
          data.base.y + rise,
          data.base.z + Math.cos(time * 0.55 + data.phase * 8) * 0.17
        );
        bug.scale.setScalar(0.55 + alpha * 0.7);
      });
    }
  };
}

function makeFlower(color) {
  const group = new THREE.Group();
  const petal = standardMaterial(color, 0.05, 0.88);
  const center = standardMaterial(0xa48d5d, 0.08, 0.72);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.65, 6), standardMaterial(0x3f5c47, 0.02, 0.95));
  stem.position.y = 0.32;
  group.add(stem);
  for (let index = 0; index < 5; index += 1) {
    const angle = (index / 5) * Math.PI * 2;
    const petalMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 5), petal);
    petalMesh.scale.set(0.7, 0.28, 1.2);
    petalMesh.position.set(Math.cos(angle) * 0.11, 0.66, Math.sin(angle) * 0.11);
    petalMesh.rotation.y = -angle;
    group.add(petalMesh);
  }
  const middle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 5), center);
  middle.position.y = 0.67;
  group.add(middle);
  return group;
}

function buildPendulum() {
  const group = new THREE.Group();

  const steel = standardMaterial(0x274a3e, 0.06, 0.78);
  const steelDeep = standardMaterial(0x22453a, 0.06, 0.8);
  const brass = standardMaterial(0x8a7042, 0.35, 0.5);
  const brassPale = standardMaterial(0xa08453, 0.32, 0.52);
  const bridal = standardMaterial(0x6f5c37, 0.3, 0.62);
  const plum = standardMaterial(0x6f464e, 0.12, 0.62);
  const plumDeep = standardMaterial(0x452b30, 0.12, 0.66);
  const dark = standardMaterial(0x122322, 0.68, 0.44);
  const stone = standardMaterial(0x14160f, 0.14, 0.9);
  const deckMat = standardMaterial(0x0f120c, 0.2, 0.86);
  const fabric = standardMaterial(0x1d302d, 0.12, 0.78);
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0x182b28,
    metalness: 0.32,
    roughness: 0.6,
    side: THREE.DoubleSide
  });
  const plumBackMat = new THREE.MeshStandardMaterial({
    color: 0x53343b,
    metalness: 0.36,
    roughness: 0.5,
    side: THREE.DoubleSide
  });
  const glowWarm = bulbMaterial(0xe4c17d);
  const glowPale = bulbMaterial(0xd9d4bb);
  const ringGlow = bulbMaterial(0xdcc188);

  const add = (geometry, material, parent, x = 0, y = 0, z = 0, shadow = true) => {
    const part = new THREE.Mesh(geometry, material);
    part.position.set(x, y, z);
    part.castShadow = shadow;
    part.receiveShadow = shadow;
    parent.add(part);
    return part;
  };

  const strut = (parent, start, end, rStart, rEnd, material, segments = 10) => {
    const direction = end.clone().sub(start);
    const part = new THREE.Mesh(
      new THREE.CylinderGeometry(rEnd, rStart, direction.length(), segments),
      material
    );
    part.position.copy(start).addScaledVector(direction, 0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    part.castShadow = true;
    part.receiveShadow = true;
    parent.add(part);
    return part;
  };

  const strip = (parent, start, end, width, depth, material) => {
    const direction = end.clone().sub(start);
    const part = new THREE.Mesh(new THREE.BoxGeometry(width, direction.length(), depth), material);
    part.position.copy(start).addScaledVector(direction, 0.5);
    part.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    parent.add(part);
    return part;
  };

  const flatRing = (radius, tube, material, parent, y, shadow = false) => {
    const ring = add(new THREE.TorusGeometry(radius, tube, 8, 72), material, parent, 0, y, 0, shadow);
    ring.rotation.x = Math.PI / 2;
    return ring;
  };

  // ── 底座：三段暗石台 + 细黄铜镶线 + 地脚灯 ──
  add(new THREE.CylinderGeometry(2.95, 3.1, 0.22, 64), dark, group, 0, 0.11, 0);
  add(new THREE.CylinderGeometry(2.74, 2.86, 0.2, 64), stone, group, 0, 0.32, 0);
  add(new THREE.CylinderGeometry(2.5, 2.62, 0.14, 64), deckMat, group, 0, 0.49, 0);
  flatRing(2.54, 0.045, bridal, group, 0.53);
  flatRing(0.55, 0.016, bridal, group, 0.575);
  flatRing(1.72, 0.014, bridal, group, 0.572);

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const inlay = add(
      new THREE.BoxGeometry(1.22, 0.01, 0.016),
      bridal,
      group,
      Math.cos(angle) * 1.13, 0.567, Math.sin(angle) * 1.13,
      false
    );
    inlay.rotation.y = -angle;
  }

  for (let index = 0; index < 28; index += 1) {
    const angle = (index / 28) * Math.PI * 2;
    add(
      new THREE.SphereGeometry(0.034, 8, 6),
      index % 3 ? glowWarm : glowPale,
      group,
      Math.cos(angle) * 2.58, 0.6, Math.sin(angle) * 2.58,
      false
    );
  }

  for (let index = 0; index < 3; index += 1) {
    add(new THREE.BoxGeometry(1.3, 0.14, 0.36), stone, group, 0, 0.09 + index * 0.15, 3.4 - index * 0.3);
  }
  for (const x of [-0.76, 0.76]) {
    strut(group, new THREE.Vector3(x, 0.5, 2.5), new THREE.Vector3(x, 1.22, 2.5), 0.036, 0.026, brass, 8);
    add(new THREE.SphereGeometry(0.062, 10, 8), glowWarm, group, x, 1.29, 2.5, false);
  }

  // ── A 型塔架：细长主腿 + 横撑 + X 斜撑 + 腿侧灯带 ──
  const apexY = 8.1;
  const footY = 0.56;
  const frameZ = 1.9;
  const footX = 1.72;

  for (const z of [-frameZ, frameZ]) {
    const top = new THREE.Vector3(0, apexY, z);
    strut(group, new THREE.Vector3(-footX, footY, z), top, 0.15, 0.085, steel, 14);
    strut(group, new THREE.Vector3(footX, footY, z), top, 0.15, 0.085, steel, 14);

    for (const x of [-footX, footX]) {
      add(new THREE.CylinderGeometry(0.19, 0.245, 0.12, 16), steelDeep, group, x, footY + 0.05, z);
      add(new THREE.SphereGeometry(0.135, 12, 8), steelDeep, group, x, footY + 0.19, z);
    }

    for (let level = 1; level <= 3; level += 1) {
      const t = level / 4;
      const y = footY + (apexY - footY) * t;
      const x = footX * (1 - t);
      strut(group, new THREE.Vector3(-x, y, z), new THREE.Vector3(x, y, z), 0.036, 0.036, steelDeep, 8);
    }
    for (let level = 0; level < 4; level += 1) {
      const t0 = level / 4;
      const t1 = (level + 1) / 4;
      const y0 = footY + (apexY - footY) * t0;
      const y1 = footY + (apexY - footY) * t1;
      const x0 = footX * (1 - t0);
      const x1 = footX * (1 - t1);
      strut(group, new THREE.Vector3(-x0, y0, z), new THREE.Vector3(x1, y1, z), 0.02, 0.02, steelDeep, 6);
      strut(group, new THREE.Vector3(x0, y0, z), new THREE.Vector3(-x1, y1, z), 0.02, 0.02, steelDeep, 6);
    }

    add(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 18), steel, group, 0, apexY, z).rotation.x = Math.PI / 2;
  }

  for (const x of [-footX, footX]) {
    strut(
      group,
      new THREE.Vector3(x, footY + 0.02, -frameZ),
      new THREE.Vector3(x, footY + 0.02, frameZ),
      0.062, 0.062, steelDeep, 10
    );
  }

  for (const sign of [-1, 1]) {
    strip(
      group,
      new THREE.Vector3(sign * (footX + 0.09), footY + 0.34, frameZ + 0.06),
      new THREE.Vector3(sign * 0.09, apexY - 0.5, frameZ + 0.06),
      0.05, 0.022,
      glowPale
    );
  }

  // ── 主轴与轴承 ──
  add(new THREE.CylinderGeometry(0.1, 0.1, 4.3, 20), brass, group, 0, apexY, 0).rotation.x = Math.PI / 2;
  for (const z of [-2.06, 2.06]) {
    add(new THREE.CylinderGeometry(0.16, 0.16, 0.09, 18), brassPale, group, 0, apexY, z).rotation.x = Math.PI / 2;
  }

  // ── 摆臂：窄身实体箱梁 + 正面灯带 + 黄铜箍 ──
  const pivot = new THREE.Group();
  pivot.position.y = apexY;
  group.add(pivot);

  add(new THREE.CylinderGeometry(0.34, 0.34, 0.8, 32), steelDeep, pivot, 0, 0, 0).rotation.x = Math.PI / 2;
  for (const z of [-0.42, 0.42]) {
    add(new THREE.CylinderGeometry(0.25, 0.25, 0.06, 26), brass, pivot, 0, 0, z).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.27, 0.018, 8, 32), brassPale, pivot, 0, 0, z + Math.sign(z) * 0.04, false);
  }

  const swing = new THREE.Group();
  pivot.add(swing);

  const armTop = -0.18;
  const armBottom = -5.5;
  const armLength = Math.abs(armBottom - armTop);

  const girder = add(
    new THREE.CylinderGeometry(0.36, 0.24, armLength, 4, 1),
    new THREE.MeshStandardMaterial({ color: 0x35604f, metalness: 0.08, roughness: 0.74, flatShading: true }),
    swing, 0, (armTop + armBottom) / 2, 0
  );
  girder.rotation.y = Math.PI / 4;
  girder.scale.z = 0.66;

  for (const t of [0.04, 0.52, 0.97]) {
    const y = armTop + (armBottom - armTop) * t;
    add(new THREE.BoxGeometry(0.54 - t * 0.18, 0.07, 0.36 - t * 0.12), brass, swing, 0, y, 0);
  }

  strip(swing, new THREE.Vector3(0, armTop - 0.2, 0.17), new THREE.Vector3(0, armBottom + 0.15, 0.125), 0.11, 0.026, glowPale);
  strip(swing, new THREE.Vector3(0, armTop - 0.2, -0.17), new THREE.Vector3(0, armBottom + 0.15, -0.125), 0.11, 0.026, glowWarm);

  for (const sign of [-1, 1]) {
    strip(swing, new THREE.Vector3(sign * 0.2, armTop - 0.05, 0), new THREE.Vector3(sign * 0.13, armBottom + 0.1, 0), 0.022, 0.05, brass);
  }
  add(new THREE.BoxGeometry(0.62, 0.13, 0.56), brass, swing, 0, armBottom - 0.03, 0);

  // ── 吊舱：敞口座舱 + 黄铜环箍 + 内圈座椅 ──
  const gondola = new THREE.Group();
  gondola.position.y = armBottom - 0.08;
  swing.add(gondola);

  const rotor = new THREE.Group();
  gondola.add(rotor);

  const wall = add(
    new THREE.CylinderGeometry(1.62, 1.46, 0.82, 56, 1, true),
    plumBackMat,
    rotor, 0, 0.04, 0
  );
  wall.castShadow = true;
  wall.receiveShadow = true;

  add(
    new THREE.CylinderGeometry(1.59, 1.43, 0.8, 56, 1, true),
    shellMat,
    rotor, 0, 0.04, 0,
    false
  );

  flatRing(1.63, 0.055, brass, rotor, 0.45, true);
  flatRing(1.46, 0.05, brass, rotor, -0.37, true);
  flatRing(1.44, 0.032, ringGlow, rotor, -0.44);
  flatRing(1.56, 0.022, brassPale, rotor, 0.06);

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    strip(
      rotor,
      new THREE.Vector3(Math.cos(angle) * 1.615, 0.44, Math.sin(angle) * 1.615),
      new THREE.Vector3(Math.cos(angle) * 1.455, -0.36, Math.sin(angle) * 1.455),
      0.032, 0.026, brass
    );
    add(
      new THREE.SphereGeometry(0.03, 8, 6),
      index % 2 ? glowWarm : glowPale,
      rotor,
      Math.cos(angle) * 1.6, 0.55, Math.sin(angle) * 1.6,
      false
    );
  }

  add(new THREE.CylinderGeometry(0.46, 0.62, 1.34, 36), dark, rotor, 0, 0.06, 0);
  flatRing(0.54, 0.028, brass, rotor, 0.36);
  flatRing(0.63, 0.03, brass, rotor, -0.36);
  const cap = add(new THREE.SphereGeometry(0.46, 24, 14), brass, rotor, 0, 0.53, 0);
  cap.scale.y = 0.56;
  add(new THREE.SphereGeometry(0.08, 12, 10), glowWarm, rotor, 0, 0.78, 0, false);

  const floor = add(new THREE.RingGeometry(0.62, 1.44, 64, 1), shellMat, rotor, 0, -0.32, 0);
  floor.rotation.x = -Math.PI / 2;

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2 + Math.PI / 10;
    strut(
      rotor,
      new THREE.Vector3(Math.cos(angle) * 0.62, -0.4, Math.sin(angle) * 0.62),
      new THREE.Vector3(Math.cos(angle) * 1.4, -0.4, Math.sin(angle) * 1.4),
      0.04, 0.03, steelDeep, 6
    );
  }

  const skirt = add(new THREE.CylinderGeometry(1.46, 0.68, 0.54, 48, 1, true), shellMat, rotor, 0, -0.63, 0);
  skirt.castShadow = false;
  add(new THREE.CylinderGeometry(0.24, 0.32, 0.07, 20), brass, rotor, 0, -0.91, 0);
  add(new THREE.SphereGeometry(0.085, 12, 8), ringGlow, rotor, 0, -0.97, 0, false);

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    const seat = new THREE.Group();
    seat.position.set(Math.cos(angle) * 1.14, -0.28, Math.sin(angle) * 1.14);
    seat.rotation.y = Math.PI / 2 - angle;
    rotor.add(seat);

    add(new THREE.BoxGeometry(0.5, 0.1, 0.44), plumDeep, seat, 0, 0.05, 0);
    add(new THREE.BoxGeometry(0.44, 0.06, 0.4), fabric, seat, 0, 0.11, 0.02);

    const shell = add(
      new THREE.CylinderGeometry(0.36, 0.38, 0.56, 12, 1, true, Math.PI - 0.55, 1.1),
      plumDeep,
      seat, 0, 0.4, -0.06
    );
    shell.castShadow = true;

    const bar = add(new THREE.TorusGeometry(0.2, 0.014, 6, 16, Math.PI), brassPale, seat, 0, 0.22, 0.02, false);
    bar.rotation.x = Math.PI / 2;
  }

  return {
    group,
    anchorHeight: 8.8,
    framingSphere: new THREE.Sphere(new THREE.Vector3(0, 4.25, 0), 5.7),
    update(time) {
      swing.rotation.z = Math.sin(time * 0.62) * 1.12;
      rotor.rotation.y = time * 1.05;
      const pulse = 0.87 + Math.sin(time * 1.7) * 0.13;
      ringGlow.color.setRGB(pulse, pulse * 0.9, pulse * 0.66);
    }
  };
}

function updateOrbitCamera(world) {
  const { camera, orbit } = world;
  const horizontal = orbit.distance * Math.cos(orbit.pitch);
  camera.position.set(
    orbit.targetX + Math.sin(orbit.yaw) * horizontal,
    orbit.targetY + orbit.distance * Math.sin(orbit.pitch),
    orbit.targetZ + Math.cos(orbit.yaw) * horizontal
  );
  camera.lookAt(orbit.targetX, orbit.targetY, orbit.targetZ);
}

function bindOrbit(canvas, world) {
  const activePointers = new Map();
  let dragging = false;
  let panning = false;
  let pointerMoved = false;
  let pinching = false;
  let pinchDistance = 0;
  let previousX = 0;
  let previousY = 0;

  const clampTarget = () => {
    world.orbit.targetX = THREE.MathUtils.clamp(world.orbit.targetX, -30, 30);
    world.orbit.targetZ = THREE.MathUtils.clamp(world.orbit.targetZ, -30, 30);
  };

  const getPointerPairDistance = () => {
    const pointers = [...activePointers.values()];
    if (pointers.length < 2) return 0;
    return Math.hypot(
      pointers[1].clientX - pointers[0].clientX,
      pointers[1].clientY - pointers[0].clientY
    );
  };

  const getDistanceLimits = () => (
    world === overviewWorld ? [22, 82] : [9, 28]
  );

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  canvas.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch") event.preventDefault();
    activePointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY
    });
    dragging = true;
    panning = event.button === 2 || event.button === 1 || event.shiftKey;
    pointerMoved = false;
    previousX = event.clientX;
    previousY = event.clientY;
    if (activePointers.size > 1) {
      pinching = true;
      pointerMoved = true;
      pinchDistance = getPointerPairDistance();
    }
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.toggle("is-panning", panning);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (activePointers.has(event.pointerId)) {
      activePointers.set(event.pointerId, {
        clientX: event.clientX,
        clientY: event.clientY
      });
    }
    if (!dragging) {
      if (world === focusWorld) {
        canvas.style.cursor = findCabinAtPointer(event) !== null ? "pointer" : "grab";
      }
      return;
    }

    if (pinching || activePointers.size > 1) {
      event.preventDefault();
      const nextDistance = getPointerPairDistance();
      if (nextDistance > 0 && pinchDistance > 0) {
        const [minDistance, maxDistance] = getDistanceLimits();
        world.orbit.distance = THREE.MathUtils.clamp(
          world.orbit.distance * (pinchDistance / nextDistance),
          minDistance,
          maxDistance
        );
        updateOrbitCamera(world);
      }
      pinchDistance = nextDistance;
      pointerMoved = true;
      return;
    }

    const deltaX = event.clientX - previousX;
    const deltaY = event.clientY - previousY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) pointerMoved = true;
    previousX = event.clientX;
    previousY = event.clientY;

    if (panning) {
      // 平移：按当前距离换算世界位移，沿相机的右方向与前方向移动视点
      const scale = world.orbit.distance * 0.0022;
      const sin = Math.sin(world.orbit.yaw);
      const cos = Math.cos(world.orbit.yaw);
      world.orbit.targetX -= (cos * deltaX + sin * deltaY) * scale;
      world.orbit.targetZ += (sin * deltaX - cos * deltaY) * scale;
      clampTarget();
    } else {
      world.orbit.yaw -= deltaX * 0.005;
      world.orbit.pitch = THREE.MathUtils.clamp(
        world.orbit.pitch + deltaY * 0.004,
        world === overviewWorld ? 0.33 : 0.06,
        world === overviewWorld ? 0.98 : 0.66
      );
    }
    updateOrbitCamera(world);
  });

  const release = (event, allowPick) => {
    activePointers.delete(event.pointerId);
    const shouldPick =
      allowPick &&
      !pointerMoved &&
      !panning &&
      event.button === 0 &&
      canvas === elements.focusCanvas &&
      activePointers.size === 0;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (activePointers.size === 0) {
      dragging = false;
      panning = false;
      pinching = false;
      pinchDistance = 0;
      canvas.classList.remove("is-panning");
    } else {
      const remaining = activePointers.values().next().value;
      previousX = remaining.clientX;
      previousY = remaining.clientY;
      pinching = false;
      pinchDistance = 0;
    }
    if (shouldPick) {
      const cabinIndex = findCabinAtPointer(event);
      if (cabinIndex !== null) playRandomTrack(cabinIndex);
    }
  };
  canvas.addEventListener("pointerup", (event) => release(event, true));
  canvas.addEventListener("pointercancel", (event) => release(event, false));

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const [minDistance, maxDistance] = getDistanceLimits();
    world.orbit.distance = THREE.MathUtils.clamp(
      world.orbit.distance + event.deltaY * 0.025,
      minDistance,
      maxDistance
    );
    updateOrbitCamera(world);
  }, { passive: false });
}

function animateWorlds() {
  requestAnimationFrame(animateWorlds);
  modelTime += 0.016;
  const now = performance.now();
  const delta = lastFrameTime ? Math.min((now - lastFrameTime) / 1000, 0.06) : 0.016;
  lastFrameTime = now;

  if (overviewWorld) {
    updateRain(overviewWorld, delta);
    Object.values(overviewWorld.rides).forEach((ride) => ride.update(modelTime));
    overviewWorld.renderer.render(overviewWorld.scene, overviewWorld.camera);
    positionMapMarkers();
  }

  if (activeModel && focusWorld) {
    updateRain(focusWorld, delta);
    activeModel.update(modelTime);
    focusWorld.renderer.render(focusWorld.scene, focusWorld.camera);
  }
}

function positionMapMarkers() {
  if (!overviewWorld) return;
  const width = overviewWorld.width;
  const height = overviewWorld.height;

  facilities.forEach((facility) => {
    const marker = elements.mapSites.querySelector(`[data-facility="${facility.id}"]`);
    const anchor = overviewWorld.rideAnchors[facility.id];
    if (!marker || !anchor) return;

    const projected = anchor.clone().project(overviewWorld.camera);
    const visible = projected.z < 1 && Math.abs(projected.x) < 1.2 && Math.abs(projected.y) < 1.2;
    const rawX = (projected.x * 0.5 + 0.5) * width;
    marker.style.left = `${THREE.MathUtils.clamp(rawX, width < 700 ? 52 : 42, width - (width < 700 ? 52 : 42))}px`;
    marker.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
    marker.style.opacity = visible ? "1" : "0";
    marker.style.pointerEvents = visible ? "auto" : "none";
  });
}

// 放到最后调用：此时所有顶层常量（天空配方、地形参数等）都已初始化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
