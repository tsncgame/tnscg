const API_URL = 'https://tsncg.onrender.com';
let coins = 0;
let clicks = 0;
let clickPower = 1;
let passive = 0;
let level = 1;
let xp = 0;
let combo = 0;
let comboTimer = null;
let audioCtx = null;
let lastSaveTime = Date.now();
let saveStatusTimer = null;
let webVerifiedClicksPending = 0;
let webVerifyBusy = false;
async function syncWebClicks(force=false){ if(!window.tsncgWebAuthReady || !location.protocol.startsWith('http')) return; if(webVerifyBusy || (!force && webVerifiedClicksPending < 5)) return; const delta=webVerifiedClicksPending; webVerifiedClicksPending=0; webVerifyBusy=true; try {
    const r = await fetch(`${API_URL}/api/verify-clicks`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ delta })
    });

    if (!r.ok) {
        webVerifiedClicksPending += delta;
    }
} catch (_) {
    webVerifiedClicksPending += delta;
} finally {
    webVerifyBusy = false;
}
}
setInterval(()=>syncWebClicks(false),1000);
window.addEventListener('beforeunload',()=>{ if(webVerifiedClicksPending>0) navigator.sendBeacon?.('/api/verify-clicks',new Blob([JSON.stringify({delta:webVerifiedClicksPending})],{type:'application/json'})); });

const drinks = [
  { name: 'Piwo Jasne', unlock: 0, mult: 1 },
  { name: 'Lager', unlock: 250, mult: 1.5 },
  { name: 'IPA', unlock: 1500, mult: 2.5 },
  { name: 'Porter', unlock: 8000, mult: 4 },
  { name: 'Stout', unlock: 40000, mult: 6 },
  { name: 'Bursztyn Piekielny', unlock: 250000, mult: 10 },
  { name: 'Złoty Eliksir', unlock: 1500000, mult: 18 }
];
let drinkIndex = 0;
let clickUpgradeLevel = 0;
let passiveUpgradeLevel = 0;
let critUpgradeLevel = 0;
let clickCost = 25;
let passiveCost = 75;
let critCost = 250;
let brutalLevel = 0, turboLevel = 0, goldenLevel = 0, luckyLevel = 0, comboUpgradeLevel = 0, breweryLevel = 0;
let brutalCost = 1000, turboCost = 3000, goldenCost = 10000, luckyCost = 15000, comboUpgradeCost = 25000, breweryCost = 50000;
let characterName = 'Twój Stary';
let storyChapter = 0;
let storyStep = 0;
let criticalClicks = 0;
let playedSeconds = 0;
let achievementUnlocked = [];
let achievementTimer = null;
let settings = { musicVolume: 0.55, sfxVolume: 0.55, effects: true, autosave: true, fullscreen: false };
let questCompleted = [];
let questClaimed = [];
let stage22Data = {};
let stage21Data = {};
let stage20Data = {};
let stage19Data = {};
let stage18Data = {};
let stage17Data = {};
let stage16Data = {};
let stage15Data = {};
let stage14Data = {};


const $ = id => document.getElementById(id);
const coinsEl = $('coins');
const clicksEl = $('clicks');
const powerEl = $('clickPower');
const passiveEl = $('perSecond');
const levelEl = $('level');
const xpBar = $('xpBar');
const beerButton = $('beerButton');
const floaters = $('floaters');
const upgradeClick = $('upgradeClick');
const upgradePassive = $('upgradePassive');
const upgradeCrit = $('upgradeCrit');
const clickCostEl = $('clickCost');
const passiveCostEl = $('passiveCost');
const critCostEl = $('critCost');
const upgradeBrutal = $('upgradeBrutal'), upgradeTurbo = $('upgradeTurbo'), upgradeGolden = $('upgradeGolden'), upgradeLucky = $('upgradeLucky'), upgradeCombo = $('upgradeCombo'), upgradeBrewery = $('upgradeBrewery');
const characterNameInput = $('characterNameInput'), characterNameDisplay = $('characterNameDisplay');
let purchaseMultiplier = 1;
const buyMultButtons = document.querySelectorAll('.buy-mult');
const commandsButton = $('commandsButton'), commandsModal = $('commandsModal'), commandsClose = $('commandsClose'), commandCodeInput = $('commandCodeInput'), commandExecute = $('commandExecute'), commandStatus = $('commandStatus');
const comboEl = $('combo');
const drinkNameEl = $('drinkName');
const drinkMultEl = $('drinkMult');
const drinkUnlockEl = $('drinkUnlock');
const nextDrinkEl = $('nextDrink');
const storyModal = $('storyModal');
const storyChapterEl = $('storyChapter');
const storyTitleEl = $('storyTitle');
const storyTextEl = $('storyText');
const storyNext = $('storyNext');
const storyClose = $('storyClose');
const storyButton = $('storyButton');
const storyBox = $('storyBox');
const achievementsModal = $('achievementsModal');
const achievementsList = $('achievementsList');
const achievementsButton = $('achievementsButton');
const achievementsCount = $('achievementsCount');
const settingsModal = $('settingsModal');
const settingsButton = $('settingsButton');
const settingsClose = $('settingsClose');
const statsModal = $('statsModal');
const statsButton = $('statsButton');
const statsClose = $('statsClose');
const statsGrid = $('statsGrid');
const settingsMusicVolume = $('settingsMusicVolume');
const settingsSfxVolume = $('settingsSfxVolume');
const settingsMusicValue = $('settingsMusicValue');
const settingsSfxValue = $('settingsSfxValue');
const effectsToggle = $('effectsToggle');
const autosaveToggle = $('autosaveToggle');
const fullscreenToggle = $('fullscreenToggle');
const backupButton = $('backupButton');
const backupModal = $('backupModal');
const backupClose = $('backupClose');
const exportSaveButton = $('exportSaveButton');
const importSaveButton = $('importSaveButton');
const backupStatus = $('backupStatus');
const questsModal = $('questsModal');
const questsButton = $('questsButton');
const questsClose = $('questsClose');
const questsList = $('questsList');
const questsCount = $('questsCount');
const collectionModal = $('collectionModal');
const collectionButton = $('collectionButton');
const collectionClose = $('collectionClose');
const collectionList = $('collectionList');
const collectionCount = $('collectionCount');
const collectionProgress = $('collectionProgress');


const achievements = [
  ['Pierwszy Kufel','Wykonaj 1 kliknięcie.',()=>clicks>=1],
  ['Łyk za łyk','Wykonaj 10 kliknięć.',()=>clicks>=10],
  ['Nie przestawaj','Wykonaj 100 kliknięć.',()=>clicks>=100],
  ['Kufel w rękę','Wykonaj 500 kliknięć.',()=>clicks>=500],
  ['Klickoza','Wykonaj 1 000 kliknięć.',()=>clicks>=1000],
  ['Palec zagłady','Wykonaj 5 000 kliknięć.',()=>clicks>=5000],
  ['Fabryka klików','Wykonaj 10 000 kliknięć.',()=>clicks>=10000],
  ['Klikowy magnat','Wykonaj 25 000 kliknięć.',()=>clicks>=25000],
  ['Kuflowy weteran','Wykonaj 50 000 kliknięć.',()=>clicks>=50000],
  ['Nie pytaj o palec','Wykonaj 100 000 kliknięć.',()=>clicks>=100000],
  ['Drobniak','Zdobądź 100 kasy.',()=>coins>=100],
  ['Pierwszy tysiąc','Zdobądź 1 000 kasy.',()=>coins>=1000],
  ['Piwny milioner','Zdobądź 10 000 kasy.',()=>coins>=10000],
  ['Bogacz z karczmy','Zdobądź 100 000 kasy.',()=>coins>=100000],
  ['Poważne pieniądze','Zdobądź 1 000 000 kasy.',()=>coins>=1000000],
  ['Kufel pełen złota','Zdobądź 10 000 000 kasy.',()=>coins>=10000000],
  ['Krytyczny początek','Zadaj pierwszy krytyk.',()=>criticalClicks>=1],
  ['Krytyczna masa','Wykonaj 10 krytyków.',()=>criticalClicks>=10],
  ['Krytyczny specjalista','Wykonaj 50 krytyków.',()=>criticalClicks>=50],
  ['Krytyczny wariat','Wykonaj 100 krytyków.',()=>criticalClicks>=100],
  ['Krytyczny mistrz','Wykonaj 500 krytyków.',()=>criticalClicks>=500],
  ['Krytyczna legenda','Wykonaj 1 000 krytyków.',()=>criticalClicks>=1000],
  ['Combo x5','Osiągnij combo 5.',()=>combo>=5],
  ['Combo x10','Osiągnij combo 10.',()=>combo>=10],
  ['Combo x20','Osiągnij combo 20.',()=>combo>=20],
  ['Combo x30','Osiągnij combo 30.',()=>combo>=30],
  ['Combo x50','Osiągnij combo 50.',()=>combo>=50],
  ['Mocny klik','Kup pierwsze ulepszenie kliku.',()=>clickUpgradeLevel>=1],
  ['Piwniczny pracownik','Kup pierwsze ulepszenie pasywne.',()=>passiveUpgradeLevel>=1],
  ['Krwawy palec','Kup pierwszy poziom krytyka.',()=>critUpgradeLevel>=1],
  ['Mocarny kciuk','Osiągnij 10 poziomów Mocnego Klika.',()=>clickUpgradeLevel>=10],
  ['Piwniczny kierownik','Osiągnij 10 poziomów Starego w Piwnicy.',()=>passiveUpgradeLevel>=10],
  ['Krytyczny fachowiec','Osiągnij 10 poziomów Krwistego Krytyka.',()=>critUpgradeLevel>=10],
  ['Pierwszy poziom','Awansuj na poziom 2.',()=>level>=2],
  ['Dwucyfrowy bohater','Osiągnij poziom 10.',()=>level>=10],
  ['Karczemny boss','Osiągnij poziom 25.',()=>level>=25],
  ['Prawie legenda','Osiągnij poziom 50.',()=>level>=50],
  ['Legenda kufla','Osiągnij poziom 100.',()=>level>=100],
  ['Lager!','Odblokuj Lager.',()=>drinkIndex>=1],
  ['IPA na horyzoncie','Odblokuj IPA.',()=>drinkIndex>=2],
  ['Porter wjeżdża','Odblokuj Porter.',()=>drinkIndex>=3],
  ['Stout bez pytań','Odblokuj Stout.',()=>drinkIndex>=4],
  ['Piekielny bursztyn','Odblokuj Bursztyn Piekielny.',()=>drinkIndex>=5],
  ['Złoty finał','Odblokuj Złoty Eliksir.',()=>drinkIndex>=6],
  ['Rozdział pierwszy','Odblokuj rozdział II.',()=>storyChapter>=1],
  ['Rozdział drugi','Odblokuj rozdział III.',()=>storyChapter>=2],
  ['Rozdział trzeci','Odblokuj rozdział IV.',()=>storyChapter>=3],
  ['Rozdział czwarty','Odblokuj rozdział V.',()=>storyChapter>=4],
  ['Rozdział piąty','Odblokuj rozdział VI.',()=>storyChapter>=5],
  ['Godzina w karczmie','Graj przez 1 godzinę.',()=>playedSeconds>=3600]
];

const quests = [
  ['Rozgrzewka', 'Wykonaj 100 kliknięć.', () => clicks >= 100, 250],
  ['Kasa musi się zgadzać', 'Zdobądź 1 000 kasy.', () => coins >= 1000, 500],
  ['Szybki palec', 'Osiągnij combo x50.', () => combo >= 50, 1000],
  ['Kierownik ulepszeń', 'Kup 10 ulepszeń Mocnego Klika.', () => clickUpgradeLevel >= 10, 2500],
  ['Krytyczna robota', 'Wykonaj 100 krytycznych kliknięć.', () => criticalClicks >= 100, 5000],
  ['IPA na stole', 'Odblokuj IPA.', () => drinkIndex >= 2, 7500]
];

const story = [
  { title: 'Pod Zdechłym Kogutem', unlock: 0, lines: [
    'W karczmie jest cicho. Podejrzanie cicho.',
    'Twój Stary siedzi przy stole i patrzy na pusty kufel.',
    '„To nie może się tak skończyć. Potrzebuję jeszcze jednego piwa.”',
    'Karczmarz wskazuje na stary szyld: WIELKI KUFEL.\n„Jeśli chcesz legendy, zacznij od klikania.”'
  ]},
  { title: 'Wielki Kufel', unlock: 250, lines: [
    'Pierwszy kufel pęka od piany. Właściciel karczmy zaczyna się bać.',
    'Twój Stary odkrywa, że każdy klik przybliża go do Wielkiego Kufla.',
    '„Skoro zwykłe piwo daje kasę, to co daje piwo wielkie?”',
    'Odpowiedź czeka w piwnicy. Naturalnie. Gdzie indziej miałaby czekać?'
  ]},
  { title: 'Piwnica', unlock: 1500, lines: [
    'Schodzicie pod karczmę. Z beczek dochodzi dziwne bulgotanie.',
    'W kącie stoi stary aparat browarniczy opisany: NIE DOTYKAĆ.',
    'Twój Stary dotyka go natychmiast.',
    'Maszyna rusza. Nadchodzi coś większego niż zwykły Lager.'
  ]},
  { title: 'Turniej Piwoszy', unlock: 8000, lines: [
    'Wieść o twoim kuflu dociera do całego królestwa.',
    'Najwięksi Piwosze zbierają się na turnieju.',
    'Zasada jest prosta: kto pierwszy przestanie klikać, przegrywa.',
    'Twój Stary uśmiecha się. „To akurat potrafię.”'
  ]},
  { title: 'Piekielny Browar', unlock: 40000, lines: [
    'Drzwi do Piekielnego Browaru otwierają się same.',
    'Za nimi warzy się Bursztyn Piekielny, trunek tak mocny, że nawet demon czyta etykietę dwa razy.',
    'Twój Stary bierze kufel i rusza dalej.',
    'Cel jest jeden: Złoty Eliksir.'
  ]},
  { title: 'Ostatni Kufel', unlock: 250000, lines: [
    'Na szczycie browaru czeka ostatni kufel.',
    'Nie ma już karczmarza, demonów ani turnieju. Jest tylko cisza.',
    'Twój Stary patrzy na złoty napój.',
    '„Dobra. Ten jest naprawdę ostatni.”\nNarrator: Nie był.'
  ]}
];

function storyUnlocked(chapter) { return coins >= story[chapter].unlock || chapter === 0; }
function openStory() {
  if (!storyUnlocked(storyChapter)) return;
  storyStep = 0; renderStory(); storyModal.classList.remove('hidden');
}
function renderStory() {
  const ch = story[storyChapter];
  storyChapterEl.textContent = `ROZDZIAŁ ${['I','II','III','IV','V','VI'][storyChapter]}`;
  storyTitleEl.textContent = ch.title;
  storyTextEl.textContent = ch.lines[storyStep];
  storyNext.textContent = storyStep < ch.lines.length - 1 ? 'DALEJ ▶' : (storyChapter < story.length - 1 ? 'ODBLOKUJ NASTĘPNY ▶' : 'KONIEC ▶');
  storyBox.textContent = ch.lines[storyStep];
}
function advanceStory() {
  const ch = story[storyChapter];
  if (storyStep < ch.lines.length - 1) { storyStep += 1; renderStory(); return; }
  if (storyChapter < story.length - 1 && coins >= story[storyChapter + 1].unlock) {
    storyChapter += 1; storyStep = 0; saveGame(false); renderStory(); render();
  } else {
    storyModal.classList.add('hidden');
  }
}
storyButton?.addEventListener('click', openStory);
storyNext?.addEventListener('click', advanceStory);
storyClose?.addEventListener('click', () => storyModal.classList.add('hidden'));
storyModal?.addEventListener('click', e => { if (e.target === storyModal) storyModal.classList.add('hidden'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') storyModal?.classList.add('hidden'); });

function format(n) {
  return Math.floor(n).toLocaleString('pl-PL');
}
function currentDrink() { return drinks[drinkIndex]; }
window.tsncgGame = { coins: () => coins, clicks: () => clicks, level: () => level };
function critChance() { return Math.min(0.30, 0.05 + critUpgradeLevel * 0.01 + luckyLevel * 0.005); }

function getSaveData() {
  return {
    version: 3,
    coins,
    clicks,
    clickPower,
    passive,
    level,
    xp,
    drinkIndex,
    clickUpgradeLevel,
    passiveUpgradeLevel,
    critUpgradeLevel,
    clickCost,
    passiveCost,
    critCost,
    brutalLevel, turboLevel, goldenLevel, luckyLevel, comboUpgradeLevel, breweryLevel,
    brutalCost, turboCost, goldenCost, luckyCost, comboUpgradeCost, breweryCost,
    characterName,
    storyChapter,
    criticalClicks,
    playedSeconds,
    achievementUnlocked,
    questCompleted,
    questClaimed,
    settings,
    savedAt: Date.now()
  };
}

async function saveGame(showStatus = false) {
  if (!window.tsncg?.saveGame) return;
  const result = await window.tsncg.saveGame(getSaveData());
  if (result?.ok) {
    lastSaveTime = Date.now();
    if (showStatus) showSaveStatus('ZAPISANO ✓');
  } else if (showStatus) {
    showSaveStatus('BŁĄD ZAPISU');
  }
}

function showSaveStatus(text) {
  const el = document.getElementById('saveStatus');
  if (!el) return;
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(saveStatusTimer);
  saveStatusTimer = setTimeout(() => el.classList.remove('visible'), 1600);
}


const musicButton = document.getElementById('musicButton');
const musicModal = document.getElementById('musicModal');
const musicClose = document.getElementById('musicClose');
const musicScan = document.getElementById('musicScan');
const musicToggle = document.getElementById('musicToggle');
const musicPrev = document.getElementById('musicPrev');
const musicNext = document.getElementById('musicNext');
const musicVolume = document.getElementById('musicVolume');
const musicList = document.getElementById('musicList');
const musicNow = document.getElementById('musicNow');
let musicTracks = [];
let musicIndex = -1;
let musicAudio = new Audio();
musicAudio.loop = false;
musicAudio.volume = Number(musicVolume?.value || 0.55);
musicAudio.addEventListener('ended', () => nextTrack(true));

function renderMusicList() {
  if (!musicList) return;
  musicList.innerHTML = '';
  if (!musicTracks.length) {
    musicList.innerHTML = '<div class="music-item"><span>Brak plików muzycznych.</span><small>music/</small></div>';
    musicNow.textContent = 'Brak utworów. Karczma milczy.';
    return;
  }
  musicTracks.forEach((track, i) => {
    const row = document.createElement('div');
    row.className = `music-item ${i === musicIndex ? 'active' : ''}`;
    row.innerHTML = `<span>${track.name}</span><small>${i === musicIndex ? 'GRA' : (track.format || 'AUDIO')}</small>`;
    row.addEventListener('click', () => selectTrack(i, true));
    musicList.appendChild(row);
  });
  if (musicIndex >= 0) musicNow.textContent = `TERAZ: ${musicTracks[musicIndex].name}`;
}

async function scanMusic() {
  musicTracks = await (window.tsncg?.listMusic?.() || []);
  if (musicIndex >= musicTracks.length) musicIndex = -1;
  renderMusicList();
}
function selectTrack(index, autoplay = false) {
  if (!musicTracks[index]) return;
  musicIndex = index;
  musicAudio.src = musicTracks[index].url;
  musicNow.textContent = `TERAZ: ${musicTracks[index].name}`;
  renderMusicList();
  if (autoplay) musicAudio.play().then(() => { musicToggle.textContent = '⏸ PAUZA'; }).catch(() => {});
}
function nextTrack(autoplay = false) {
  if (!musicTracks.length) return;
  selectTrack((musicIndex + 1 + musicTracks.length) % musicTracks.length, autoplay || !musicAudio.paused);
}
function prevTrack() {
  if (!musicTracks.length) return;
  selectTrack((musicIndex - 1 + musicTracks.length) % musicTracks.length, !musicAudio.paused);
}
function toggleMusic() {
  if (!musicTracks.length) { scanMusic(); return; }
  if (musicIndex < 0) selectTrack(0);
  if (musicAudio.paused) musicAudio.play().then(() => { musicToggle.textContent = '⏸ PAUZA'; }).catch(() => {});
  else { musicAudio.pause(); musicToggle.textContent = '▶ ODTWARZAJ'; }
}
musicButton?.addEventListener('click', async () => { await scanMusic(); musicModal?.classList.remove('hidden'); });
musicClose?.addEventListener('click', () => musicModal?.classList.add('hidden'));
musicModal?.addEventListener('click', e => { if (e.target === musicModal) musicModal.classList.add('hidden'); });
musicScan?.addEventListener('click', scanMusic);
musicToggle?.addEventListener('click', toggleMusic);
musicNext?.addEventListener('click', () => nextTrack());
musicPrev?.addEventListener('click', prevTrack);
musicVolume?.addEventListener('input', () => { musicAudio.volume = Number(musicVolume.value); });



function showBackupStatus(text) {
  if (!backupStatus) return;
  backupStatus.textContent = text;
  backupStatus.classList.add('visible');
  setTimeout(() => backupStatus.classList.remove('visible'), 2200);
}

backupButton?.addEventListener('click', () => backupModal?.classList.remove('hidden'));
backupClose?.addEventListener('click', () => backupModal?.classList.add('hidden'));
backupModal?.addEventListener('click', e => { if (e.target === backupModal) backupModal.classList.add('hidden'); });
exportSaveButton?.addEventListener('click', async () => {
  await saveGame(false);
  const result = await window.tsncg?.exportSave?.(getSaveData());
  if (result?.ok) showBackupStatus('ZAPIS WYEKSPORTOWANY ✓');
  else if (!result?.canceled) showBackupStatus('BŁĄD EKSPORTU');
});
importSaveButton?.addEventListener('click', async () => {
  const result = await window.tsncg?.importSave?.();
  if (!result?.ok) {
    if (!result?.canceled) showBackupStatus('NIEPRAWIDŁOWY PLIK');
    return;
  }
  try {
    const data = result.data;
    if (typeof data.coins !== 'number' || typeof data.clicks !== 'number') throw new Error('invalid');
    const saveResult = await window.tsncg.saveGame(data);
    if (!saveResult?.ok) throw new Error('save');
    showBackupStatus('IMPORT GOTOWY • RESTARTUJĘ ✓');
    setTimeout(() => window.location.reload(), 700);
  } catch (_) {
    showBackupStatus('NIEPRAWIDŁOWY PLIK');
  }
});

function applySettings() {
  if (settingsMusicVolume) settingsMusicVolume.value = String(settings.musicVolume);
  if (settingsSfxVolume) settingsSfxVolume.value = String(settings.sfxVolume);
  if (settingsMusicValue) settingsMusicValue.textContent = `${Math.round(settings.musicVolume * 100)}%`;
  if (settingsSfxValue) settingsSfxValue.textContent = `${Math.round(settings.sfxVolume * 100)}%`;
  if (effectsToggle) effectsToggle.textContent = settings.effects ? 'WŁĄCZONE' : 'WYŁĄCZONE';
  if (autosaveToggle) autosaveToggle.textContent = settings.autosave ? 'WŁĄCZONY' : 'WYŁĄCZONY';
  musicAudio.volume = settings.musicVolume;
  Object.values(sfx).forEach(a => { a.volume = settings.sfxVolume; });
  document.body.classList.toggle('reduced-effects', !settings.effects);
}
function openSettings() { applySettings(); settingsModal?.classList.remove('hidden'); }
function openStats() {
  if (!statsGrid) return;
  const rows = [
    ['KASA', format(coins)], ['KLIKNIĘCIA', format(clicks)], ['KRYTYKI', format(criticalClicks)],
    ['POZIOM', level], ['XP', `${xp}/100`], ['COMBO', combo],
    ['KASA / KLIK', format(clickPower * currentDrink().mult)], ['KASA / SEK.', format(passive * currentDrink().mult)],
    ['ULEPSZENIA', clickUpgradeLevel + passiveUpgradeLevel + critUpgradeLevel], ['TRUNEK', currentDrink().name],
    ['ROZDZIAŁ', `${storyChapter + 1}/6`], ['CZAS GRY', formatTime(playedSeconds)],
    ['OSIĄGNIĘCIA', `${achievementUnlocked.length}/${achievements.length}`]
  ];
  statsGrid.innerHTML = rows.map(([label, value]) => `<div class="stat-card"><small>${label}</small><b>${value}</b></div>`).join('');
  statsModal?.classList.remove('hidden');
}
function formatTime(total) {
  const s = Math.max(0, Math.floor(total));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
settingsButton?.addEventListener('click', openSettings);
settingsClose?.addEventListener('click', () => settingsModal?.classList.add('hidden'));
settingsModal?.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });
statsButton?.addEventListener('click', openStats);
statsClose?.addEventListener('click', () => statsModal?.classList.add('hidden'));
statsModal?.addEventListener('click', e => { if (e.target === statsModal) statsModal.classList.add('hidden'); });
settingsMusicVolume?.addEventListener('input', () => { settings.musicVolume = Number(settingsMusicVolume.value); applySettings(); saveGame(false); });
settingsSfxVolume?.addEventListener('input', () => { settings.sfxVolume = Number(settingsSfxVolume.value); applySettings(); saveGame(false); });
effectsToggle?.addEventListener('click', () => { settings.effects = !settings.effects; applySettings(); saveGame(false); });
autosaveToggle?.addEventListener('click', () => { settings.autosave = !settings.autosave; applySettings(); saveGame(false); });
fullscreenToggle?.addEventListener('click', async () => { settings.fullscreen = !settings.fullscreen; const actual = await window.tsncg?.setFullscreen?.(settings.fullscreen); settings.fullscreen = Boolean(actual); applySettings(); saveGame(false); });
document.addEventListener('keydown', async e => {
  if (e.key === 'F11') { e.preventDefault(); const actual = await window.tsncg?.setFullscreen?.(!(await window.tsncg?.getFullscreen?.())); settings.fullscreen = Boolean(actual); applySettings(); saveGame(false); return; }
  if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.altKey) { musicButton?.click(); }
  if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.altKey) { settingsButton?.click(); }
});

async function loadGame() {
  if (!window.tsncg?.loadSave) return;
  const data = await window.tsncg.loadSave();
  if (!data) return;

  coins = Number(data.coins) || 0;
  clicks = Number(data.clicks) || 0;
  clickPower = Number(data.clickPower) || 1;
  passive = Number(data.passive) || 0;
  level = Number(data.level) || 1;
  xp = Number(data.xp) || 0;
  drinkIndex = Math.min(Math.max(Number(data.drinkIndex) || 0, 0), drinks.length - 1);
  clickUpgradeLevel = Number(data.clickUpgradeLevel) || 0;
  passiveUpgradeLevel = Number(data.passiveUpgradeLevel) || 0;
  critUpgradeLevel = Number(data.critUpgradeLevel) || 0;
  clickCost = Number(data.clickCost) || 25;
  passiveCost = Number(data.passiveCost) || 75;
  critCost = Number(data.critCost) || 250;
  brutalLevel = Number(data.brutalLevel) || 0; turboLevel = Number(data.turboLevel) || 0; goldenLevel = Number(data.goldenLevel) || 0; luckyLevel = Number(data.luckyLevel) || 0; comboUpgradeLevel = Number(data.comboUpgradeLevel) || 0; breweryLevel = Number(data.breweryLevel) || 0;
  brutalCost = Number(data.brutalCost) || 1000; turboCost = Number(data.turboCost) || 3000; goldenCost = Number(data.goldenCost) || 10000; luckyCost = Number(data.luckyCost) || 15000; comboUpgradeCost = Number(data.comboUpgradeCost) || 25000; breweryCost = Number(data.breweryCost) || 50000;
  characterName = typeof data.characterName === 'string' && data.characterName.trim() ? data.characterName.trim().slice(0,24) : 'Twój Stary';
  storyChapter = Math.min(Math.max(Number(data.storyChapter) || 0, 0), story.length - 1);
  criticalClicks = Number(data.criticalClicks) || 0;
  playedSeconds = Number(data.playedSeconds) || 0;
  achievementUnlocked = Array.isArray(data.achievementUnlocked) ? data.achievementUnlocked.map(Number).filter(n => n >= 0 && n < achievements.length) : [];
  questCompleted = Array.isArray(data.questCompleted) ? data.questCompleted.map(Number).filter(n => n >= 0 && n < quests.length) : [];
  questClaimed = Array.isArray(data.questClaimed) ? data.questClaimed.map(Number).filter(n => n >= 0 && n < quests.length) : [];
  stage14Data = data.stage14Data && typeof data.stage14Data === 'object' ? data.stage14Data : {};
  stage15Data = data.stage15Data && typeof data.stage15Data === 'object' ? data.stage15Data : {};
  stage16Data = data.stage16Data && typeof data.stage16Data === 'object' ? data.stage16Data : {};
  stage17Data = data.stage17Data && typeof data.stage17Data === 'object' ? data.stage17Data : {};
  stage18Data = data.stage18Data && typeof data.stage18Data === 'object' ? data.stage18Data : {};
  stage19Data = data.stage19Data && typeof data.stage19Data === 'object' ? data.stage19Data : {};
  stage20Data = data.stage20Data && typeof data.stage20Data === 'object' ? data.stage20Data : {};
  stage21Data = data.stage21Data && typeof data.stage21Data === 'object' ? data.stage21Data : {};
  stage22Data = data.stage22Data && typeof data.stage22Data === 'object' ? data.stage22Data : {};
  if (data.settings && typeof data.settings === 'object') {
    settings = { ...settings, ...data.settings };
  }

  // Offline progress: passive income earned while the game was closed, capped at 8 hours.
  const previous = Number(data.savedAt);
  if (previous && passive > 0) {
    const elapsedSeconds = Math.min(Math.max((Date.now() - previous) / 1000, 0), 8 * 60 * 60);
    const offlineGain = passive * currentDrink().mult * elapsedSeconds;
    if (offlineGain > 0) {
      coins += offlineGain;
      spawnFloater(`+${format(offlineGain)} OFFLINE`, 0, -95);
    }
  }

  checkDrinks();
  checkAchievements();
  render();
  renderAchievements();
  renderQuests();
  renderCollection();
  applySettings();
  if (settings.fullscreen) window.tsncg?.setFullscreen?.(true);
  showSaveStatus('WCZYTANO ✓');
}

function openQuests() { renderQuests(); questsModal?.classList.remove('hidden'); }
function renderQuests() {
  if (!questsList) return;
  questsList.innerHTML = '';
  quests.forEach(([name, desc, condition, reward], i) => {
    const completed = questCompleted.includes(i);
    const claimed = questClaimed.includes(i);
    const row = document.createElement('div');
    row.className = `quest-card ${completed ? 'completed' : ''}`;
    const action = claimed ? '<span class="quest-state claimed">ODEBRANO ✓</span>' : completed ? `<button class="quest-claim" data-quest="${i}">ODBIERZ +${format(reward)}</button>` : '<span class="quest-state">W TOKU</span>';
    row.innerHTML = `<div class="quest-icon">${claimed ? '🎁' : completed ? '✅' : '📋'}</div><div class="quest-body"><b>${name}</b><small>${desc}</small></div><div class="quest-reward">${action}</div>`;
    questsList.appendChild(row);
  });
  if (questsCount) questsCount.textContent = `${questClaimed.length}/${quests.length}`;
  if (collectionCount) collectionCount.textContent = `${Math.min(drinkIndex + 1, drinks.length)}/${drinks.length}`;
  questsList.querySelectorAll('.quest-claim').forEach(btn => btn.addEventListener('click', () => claimQuest(Number(btn.dataset.quest))));
}
function checkQuests() {
  let changed = false;
  quests.forEach(([name, desc, condition], i) => {
    if (!questCompleted.includes(i) && condition()) { questCompleted.push(i); changed = true; spawnFloater(`ZADANIE UKOŃCZONE: ${name}`, 0, -100); playSfx('achievement'); }
  });
  if (changed) { renderQuests(); saveGame(false); }
}
function claimQuest(i) {
  if (!questCompleted.includes(i) || questClaimed.includes(i)) return;
  const reward = quests[i][3];
  questClaimed.push(i);
  coins += reward;
  playSfx('buy');
  spawnFloater(`+${format(reward)} NAGRODY`, 0, -80);
  checkDrinks();
  checkAchievements();
  renderQuests();
  render();
  saveGame(false);
}
questsButton?.addEventListener('click', openQuests);
questsClose?.addEventListener('click', () => questsModal?.classList.add('hidden'));
questsModal?.addEventListener('click', e => { if (e.target === questsModal) questsModal.classList.add('hidden'); });


function openCollection() {
  renderCollection();
  collectionModal?.classList.remove('hidden');
}
function renderCollection() {
  if (!collectionList) return;
  collectionList.innerHTML = '';
  drinks.forEach((drink, i) => {
    const unlocked = i <= drinkIndex;
    const card = document.createElement('div');
    card.className = `collection-card ${unlocked ? 'unlocked' : 'locked'} ${i === drinkIndex ? 'current' : ''}`;
    card.innerHTML = `<div class="collection-icon">${unlocked ? '🍺' : '🔒'}</div><div class="collection-body"><b>${unlocked ? drink.name : '???'}</b><small>${unlocked ? `Mnożnik ×${drink.mult} • od ${format(drink.unlock)} kasy` : `Odblokowanie: ${format(drink.unlock)} kasy`}</small></div><div class="collection-state">${i === drinkIndex ? 'AKTUALNY' : unlocked ? 'ODKRYTY' : 'ZABLOKOWANY'}</div>`;
    collectionList.appendChild(card);
  });
  const unlockedCount = Math.min(drinkIndex + 1, drinks.length);
  if (collectionCount) collectionCount.textContent = `${unlockedCount}/${drinks.length}`;
  if (collectionProgress) collectionProgress.textContent = `${unlockedCount}/${drinks.length} odblokowanych`;
}
collectionButton?.addEventListener('click', openCollection);
collectionClose?.addEventListener('click', () => collectionModal?.classList.add('hidden'));
collectionModal?.addEventListener('click', e => { if (e.target === collectionModal) collectionModal.classList.add('hidden'); });

function render() {
  coinsEl.textContent = format(coins);
  clicksEl.textContent = format(clicks);
  powerEl.textContent = format((clickPower + brutalLevel * 3) * effectiveDrinkMultiplier());
  passiveEl.textContent = format((passive + turboLevel * 3) * effectiveDrinkMultiplier());
  levelEl.textContent = level;
  comboEl.textContent = combo;
  xpBar.style.width = `${xp}%`;
  clickCostEl.textContent = format(clickCost);
  passiveCostEl.textContent = format(passiveCost);
  critCostEl.textContent = format(critCost);
  $('brutalCost').textContent = format(brutalCost); $('turboCost').textContent = format(turboCost); $('goldenCost').textContent = format(goldenCost); $('luckyCost').textContent = format(luckyCost); $('comboUpgradeCost').textContent = format(comboUpgradeCost); $('breweryCost').textContent = format(breweryCost);
  $('brutalLevel').textContent = `LVL ${brutalLevel}`; $('turboLevel').textContent = `LVL ${turboLevel}`; $('goldenLevel').textContent = `LVL ${goldenLevel}`; $('luckyLevel').textContent = `LVL ${luckyLevel}`; $('comboUpgradeLevel').textContent = `LVL ${comboUpgradeLevel}`; $('breweryLevel').textContent = `LVL ${breweryLevel}`;
  upgradeClick.disabled = coins < clickCost;
  upgradePassive.disabled = coins < passiveCost;
  upgradeCrit.disabled = coins < critCost || critUpgradeLevel >= 10;
  upgradeBrutal.disabled = coins < brutalCost; upgradeTurbo.disabled = coins < turboCost; upgradeGolden.disabled = coins < goldenCost || goldenLevel >= 20; upgradeLucky.disabled = coins < luckyCost || luckyLevel >= 20; upgradeCombo.disabled = coins < comboUpgradeCost || comboUpgradeLevel >= 15; upgradeBrewery.disabled = coins < breweryCost || breweryLevel >= 20;
  $('clickLevel').textContent = `LVL ${clickUpgradeLevel}`;
  $('passiveLevel').textContent = `LVL ${passiveUpgradeLevel}`;
  $('critLevel').textContent = `LVL ${critUpgradeLevel}`;
  drinkNameEl.textContent = currentDrink().name; $('topDrinkName').textContent = currentDrink().name;
  drinkMultEl.textContent = `×${effectiveDrinkMultiplier().toFixed(2)}`;
  drinkUnlockEl.textContent = currentDrink().unlock ? `Odblokowano za ${format(currentDrink().unlock)} kasy` : 'STARTOWE PIWO';
  const next = drinks[drinkIndex + 1];
  nextDrinkEl.textContent = next ? `Następne: ${next.name} • ${format(next.unlock)} kasy` : 'Maksymalny poziom alkoholicznej technologii';
  if (storyButton) storyButton.disabled = !storyUnlocked(storyChapter);
  if (storyButton) storyButton.textContent = `📜 ROZDZIAŁ ${storyChapter + 1}: ${story[storyChapter].title.toUpperCase()}`;
  if (achievementsCount) achievementsCount.textContent = `${achievementUnlocked.length}/${achievements.length}`;
  if (questsCount) questsCount.textContent = `${questClaimed.length}/${quests.length}`;
  if (collectionCount) collectionCount.textContent = `${Math.min(drinkIndex + 1, drinks.length)}/${drinks.length}`;
  if (characterNameDisplay) characterNameDisplay.textContent = characterName;
  if (characterNameInput && document.activeElement !== characterNameInput) characterNameInput.value = characterName;
}

function renderAchievements() {
  if (!achievementsList) return;
  achievementsList.innerHTML = '';
  achievements.forEach(([name, desc], i) => {
    const unlocked = achievementUnlocked.includes(i);
    const row = document.createElement('div');
    row.className = `achievement ${unlocked ? 'unlocked' : 'locked'}`;
    row.innerHTML = `<span class="achievement-icon">${unlocked ? '🏆' : '🔒'}</span><div><b>${name}</b><small>${desc}</small></div>`;
    achievementsList.appendChild(row);
  });
  if (achievementsCount) achievementsCount.textContent = `${achievementUnlocked.length}/${achievements.length}`;
  if (questsCount) questsCount.textContent = `${questClaimed.length}/${quests.length}`;
  if (collectionCount) collectionCount.textContent = `${Math.min(drinkIndex + 1, drinks.length)}/${drinks.length}`;
  if (characterNameDisplay) characterNameDisplay.textContent = characterName;
  if (characterNameInput && document.activeElement !== characterNameInput) characterNameInput.value = characterName;
}
function checkAchievements() {
  let changed = false;
  achievements.forEach(([name, desc, condition], i) => {
    if (!achievementUnlocked.includes(i) && condition()) {
      achievementUnlocked.push(i);
      changed = true;
      showAchievementToast(name);
    }
  });
  if (changed) { renderAchievements(); saveGame(false); }
}
function showAchievementToast(name) {
  const toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = `<b>🏆 OSIĄGNIĘCIE!</b><span>${name}</span>`;
  playSfx('achievement');
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 20);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 250); }, 2600);
}
achievementsButton?.addEventListener('click', () => { renderAchievements(); achievementsModal?.classList.remove('hidden'); });
$('achievementsClose')?.addEventListener('click', () => achievementsModal?.classList.add('hidden'));
achievementsModal?.addEventListener('click', e => { if (e.target === achievementsModal) achievementsModal.classList.add('hidden'); });

const sfx = {
  click: new Audio('sounds/click.wav'),
  critical: new Audio('sounds/critical.wav'),
  buy: new Audio('sounds/buy.wav'),
  achievement: new Audio('sounds/achievement.wav')
};
Object.values(sfx).forEach(a => { a.preload = 'auto'; a.volume = 0.55; });

function playSfx(name) {
  try {
    const sound = sfx[name];
    if (!sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  } catch (_) {}
}

function playClickSound(critical = false) {
  playSfx(critical ? 'critical' : 'click');
}

function spawnFloater(text, x = 0, y = 0) {
  const el = document.createElement('span');
  el.className = 'floater'; el.textContent = text;
  el.style.left = `calc(50% + ${x}px)`; el.style.top = `calc(50% + ${y}px)`;
  el.style.setProperty('--dx', `${Math.round(Math.random() * 90 - 45)}px`);
  floaters.appendChild(el); setTimeout(() => el.remove(), 750);
}


function spawnBubble(text) {
  const el = document.createElement('span');
  el.className = 'bubble';
  el.textContent = text;
  const r = beerButton.getBoundingClientRect();
  el.style.left = `${r.left + r.width / 2 + (Math.random() * 70 - 35)}px`;
  el.style.top = `${r.top + r.height * 0.35}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 700);
}

function incomeBonus() { return 1 + goldenLevel * 0.05; }
function comboBonus() { return 1 + comboUpgradeLevel * 0.02; }
function breweryMultiplier() { return 1 + breweryLevel * 0.03; }
function effectiveDrinkMultiplier() { return currentDrink().mult * breweryMultiplier(); }

function gain(amount) {
  const earned = amount * incomeBonus();
  coins += earned;
  if (typeof recordDailyCoins15 === 'function') recordDailyCoins15(earned);
  clicks += 1;
  if (typeof recordDailyClick15 === 'function') recordDailyClick15(); xp += 2;
  while (xp >= 100) { xp -= 100; level += 1; spawnFloater(`LEVEL ${level}!`, 0, -25); }
}

beerButton.addEventListener('click', () => {
  webVerifiedClicksPending += 1;
  syncWebClicks(false);
  if (typeof dailyKey15 === 'function' && stage15Data.date !== dailyKey15()) stage15Data = {date:dailyKey15(), claimed:[], clicks:0, coinsEarned:0, bestCombo:0};
  combo += 1; stage15Data.bestCombo = Math.max(Number(stage15Data.bestCombo)||0, combo); clearTimeout(comboTimer);
  comboTimer = setTimeout(() => { combo = 0; render(); }, 1200);
  const critical = Math.random() < critChance();
  if (critical) criticalClicks += 1;
  playClickSound(critical);
  const base = (clickPower + brutalLevel * 3) * effectiveDrinkMultiplier();
  const amount = critical ? base * (5 + critUpgradeLevel * 0.25) : base;
  const comboFactor = combo >= 10 ? (1 + Math.min(combo, 100) * 0.01) * comboBonus() : 1;
  gain(amount * comboFactor);
  if (settings.effects) {
    beerButton.classList.remove('hit', 'critical-hit'); void beerButton.offsetWidth;
    beerButton.classList.add(critical ? 'critical-hit' : 'hit');
  }
  if (settings.effects) {
    spawnFloater(`+${format(amount)}${critical ? ' KRYTYK!' : ''}`, Math.round(Math.random()*80-40), Math.round(Math.random()*30-15));
    if (critical) spawnBubble('✦ KRYTYK ✦');
    if (combo === 10) spawnFloater('COMBO x10!', 0, -70);
  }
  checkDrinks(); checkAchievements(); checkQuests(); render();
});

function checkDrinks() {
  while (storyChapter + 1 < story.length && coins >= story[storyChapter + 1].unlock) {
    storyChapter += 1;
    storyStep = 0;
    spawnFloater(`ROZDZIAŁ ${storyChapter + 1} ODBLOKOWANY!`, 0, -120);
  }
  const next = drinks[drinkIndex + 1];
  if (next && coins >= next.unlock) {
    drinkIndex += 1;
    spawnFloater(`NOWE PIWO: ${currentDrink().name}!`, 0, -95);
    renderCollection();
    beerButton.classList.add('critical-hit');
    setTimeout(() => beerButton.classList.remove('critical-hit'), 220);
  }
}

function buyUpgradeBatch({cost, level, max=Infinity, growth, apply, setLevel, setCost}) {
  if (level >= max || coins < cost) return 0;
  let bought = 0, currentCost = cost;
  const target = Math.min(purchaseMultiplier, max - level);
  while (bought < target && coins >= currentCost) { coins -= currentCost; apply(); bought += 1; level += 1; currentCost = Math.ceil(currentCost * growth); }
  if (bought) { setLevel(level); setCost(currentCost); playSfx('buy'); }
  return bought;
}
function buySelectedUpgrade(config){ if(buyUpgradeBatch(config)) render(); }
buyMultButtons.forEach(button=>button.addEventListener('click',()=>{purchaseMultiplier=Number(button.dataset.mult)||1;buyMultButtons.forEach(b=>b.classList.toggle('active',b===button));}));
upgradeClick.addEventListener('click',()=>buySelectedUpgrade({cost:clickCost,level:clickUpgradeLevel,growth:1.65,apply:()=>{clickPower+=1},setLevel:v=>clickUpgradeLevel=v,setCost:v=>clickCost=v}));
upgradePassive.addEventListener('click',()=>buySelectedUpgrade({cost:passiveCost,level:passiveUpgradeLevel,growth:1.75,apply:()=>{passive+=1},setLevel:v=>passiveUpgradeLevel=v,setCost:v=>passiveCost=v}));
upgradeCrit.addEventListener('click',()=>buySelectedUpgrade({cost:critCost,level:critUpgradeLevel,max:10,growth:2.05,apply:()=>{},setLevel:v=>critUpgradeLevel=v,setCost:v=>critCost=v}));
upgradeBrutal?.addEventListener('click',()=>buySelectedUpgrade({cost:brutalCost,level:brutalLevel,growth:1.8,apply:()=>{clickPower+=3},setLevel:v=>brutalLevel=v,setCost:v=>brutalCost=v}));
upgradeTurbo?.addEventListener('click',()=>buySelectedUpgrade({cost:turboCost,level:turboLevel,growth:1.9,apply:()=>{passive+=3},setLevel:v=>turboLevel=v,setCost:v=>turboCost=v}));
upgradeGolden?.addEventListener('click',()=>buySelectedUpgrade({cost:goldenCost,level:goldenLevel,max:20,growth:2.1,apply:()=>{},setLevel:v=>goldenLevel=v,setCost:v=>goldenCost=v}));
upgradeLucky?.addEventListener('click',()=>buySelectedUpgrade({cost:luckyCost,level:luckyLevel,max:20,growth:2.15,apply:()=>{},setLevel:v=>luckyLevel=v,setCost:v=>luckyCost=v}));
upgradeCombo?.addEventListener('click',()=>buySelectedUpgrade({cost:comboUpgradeCost,level:comboUpgradeLevel,max:15,growth:2.2,apply:()=>{},setLevel:v=>comboUpgradeLevel=v,setCost:v=>comboUpgradeCost=v}));
upgradeBrewery?.addEventListener('click',()=>buySelectedUpgrade({cost:breweryCost,level:breweryLevel,max:20,growth:2.25,apply:()=>{},setLevel:v=>breweryLevel=v,setCost:v=>breweryCost=v}));

characterNameInput?.addEventListener('input', () => {
  const cleaned = characterNameInput.value.replace(/[<>]/g, '').slice(0, 24);
  if (characterNameInput.value !== cleaned) characterNameInput.value = cleaned;
  characterName = cleaned.trim() || 'Twój Stary';
  if (characterNameDisplay) characterNameDisplay.textContent = characterName;
});
characterNameInput?.addEventListener('change', () => saveGame(false));
characterNameInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); characterNameInput.blur(); saveGame(false); } });

setInterval(() => {
  playedSeconds += 1;
  checkAchievements();
  checkQuests();
  if (passive > 0) { const passiveGain = passive * (1 + turboLevel * 3) * effectiveDrinkMultiplier() * prestigeBonus() * incomeBonus(); coins += passiveGain; if (typeof recordDailyCoins15 === 'function') recordDailyCoins15(passiveGain); checkDrinks(); render(); }
}, 1000);

setInterval(() => { if (settings.autosave) saveGame(false); }, 15000);

window.addEventListener('beforeunload', () => {
  // Fire-and-forget save. Electron also autosaves every 15 seconds.
  window.tsncg?.saveGame(getSaveData());
});


const saveButton = document.getElementById('saveButton');
if (saveButton) saveButton.addEventListener('click', () => saveGame(true));

const resetButton = document.getElementById('resetButton');
if (resetButton) resetButton.addEventListener('click', async () => {
  if (!confirm('Na pewno wyzerować cały zapis? Tego kufla już nie odkręcisz.')) return;
  const result = await window.tsncg?.resetSave();
  if (result?.ok) location.reload();
});

loadGame().catch(console.error);


// FUNKCJA: PRESTIŻ
const stage14Button=$('stage14Button'), stage14Modal=$('stage14Modal'), stage14Close=$('stage14Close'), stage14Content=$('stage14Content');
function prestigeBonus(){return 1+Number(stage14Data.tokens||0)*0.05}
function renderStage14(){const t=Number(stage14Data.tokens||0);stage14Content.innerHTML='<p>Żetony prestiżu: <b>'+t+'</b></p><p>Stały bonus: <b>×'+prestigeBonus().toFixed(2)+'</b></p><button id="prestigeDo" class="story-button" '+(coins<100000?'disabled':'')+'>PRESTIŻ za 100 000</button>';$("prestigeDo")?.addEventListener('click',()=>{if(coins<100000)return;stage14Data.tokens=t+1;coins=0;clicks=0;clickPower=1;passive=0;clickUpgradeLevel=0;passiveUpgradeLevel=0;critUpgradeLevel=0;brutalLevel=0;turboLevel=0;goldenLevel=0;luckyLevel=0;comboUpgradeLevel=0;breweryLevel=0;clickCost=25;passiveCost=75;critCost=250;brutalCost=1000;turboCost=3000;goldenCost=10000;luckyCost=15000;comboUpgradeCost=25000;breweryCost=50000;render();renderStage14();saveGame(false)})}
stage14Button?.addEventListener('click',()=>{renderStage14();stage14Modal.classList.remove('hidden')});stage14Close?.addEventListener('click',()=>stage14Modal.classList.add('hidden'));
const _getSave14=getSaveData; getSaveData=function(){const d=_getSave14();d.stage14Data=stage14Data;return d;};


// FUNKCJA: ZLECENIA DZIENNE
const stage15Button=$('stage15Button'), stage15Modal=$('stage15Modal'), stage15Close=$('stage15Close'), stage15Content=$('stage15Content');
function dailyKey15(){const d=new Date();const pad=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function ensureDaily15(){const key=dailyKey15();if(!stage15Data || stage15Data.date!==key){stage15Data={date:key,claimed:[],clicks:0,coinsEarned:0,bestCombo:0};}stage15Data.claimed=Array.isArray(stage15Data.claimed)?stage15Data.claimed:[];stage15Data.clicks=Number(stage15Data.clicks)||0;stage15Data.coinsEarned=Number(stage15Data.coinsEarned)||0;stage15Data.bestCombo=Number(stage15Data.bestCombo)||0;return stage15Data;}
function recordDailyClick15(){const d=ensureDaily15();d.clicks++;d.bestCombo=Math.max(d.bestCombo,Number(combo)||0);}
function recordDailyCoins15(amount){const d=ensureDaily15();d.coinsEarned+=Math.max(0,Number(amount)||0);}
function renderStage15(){const d=ensureDaily15();const defs=[['Klikacz',250,750,()=>d.clicks>=250],['Kasa',2500,1500,()=>d.coinsEarned>=2500],['Combo',30,2000,()=>d.bestCombo>=30]];stage15Content.innerHTML=defs.map((q,i)=>{const claimed=d.claimed.includes(i);const ready=q[3]();return '<div class="stage-row"><b>'+q[0]+'</b><span>Cel: '+q[1]+' • '+(ready?'GOTOWE':'W TOKU')+'</span><button class="story-button daily-claim" data-i="'+i+'" '+(claimed||!ready?'disabled':'')+'>'+ (claimed?'ODEBRANO':ready?'ODBIERZ +'+q[2]:'NIE GOTOWE')+'</button></div>';}).join('');stage15Content.querySelectorAll('.daily-claim').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.i);const current=ensureDaily15();if(!defs[i] || current.claimed.includes(i) || !defs[i][3]())return;current.claimed.push(i);coins+=defs[i][2];playSfx('buy');renderStage15();render();saveGame(false);});}
const _getSave15=getSaveData; getSaveData=function(){const d=_getSave15();d.stage15Data=stage15Data;return d;};


// FUNKCJA: DRZEWKO UMIEJĘTNOŚCI
const stage16Button=$('stage16Button'), stage16Modal=$('stage16Modal'), stage16Close=$('stage16Close'), stage16Content=$('stage16Content');
function renderStage16(){const s=stage16Data;s.skills=s.skills||{click:0,gold:0,combo:0};const points=Math.max(0,level-1)-(s.spent||0);stage16Content.innerHTML='<p>Punkty: <b>'+points+'</b></p>'+[['click','Palec','+2% mocy kliku'],['gold','Skarbiec','+3% monet'],['combo','Combo','+1% premii combo']].map(x=>'<div class="stage-row"><b>'+x[1]+'</b><span>'+x[2]+'</span><button class="story-button skill-buy" data-s="'+x[0]+'">Poziom '+s.skills[x[0]]+'</button></div>').join('');stage16Content.querySelectorAll('.skill-buy').forEach(b=>b.onclick=()=>{if(points<=0)return;s.skills[b.dataset.s]++;s.spent=(s.spent||0)+1;renderStage16();saveGame(false)})}
stage16Button?.addEventListener('click',()=>{renderStage16();stage16Modal.classList.remove('hidden')});stage16Close?.addEventListener('click',()=>stage16Modal.classList.add('hidden'));
const _getSave16=getSaveData; getSaveData=function(){const d=_getSave16();d.stage16Data=stage16Data;return d;};


// FUNKCJA: STATYSTYKI+
const stage17Button=$('stage17Button'), stage17Modal=$('stage17Modal'), stage17Close=$('stage17Close'), stage17Content=$('stage17Content');
function renderStage17(){const s=stage17Data;s.bestCombo=Math.max(s.bestCombo||0,combo);s.bestClicks=Math.max(s.bestClicks||0,clicks);s.bestCoins=Math.max(s.bestCoins||0,coins);stage17Content.innerHTML='<p>Rekord combo: <b>'+s.bestCombo+'</b></p><p>Najwięcej klików: <b>'+format(s.bestClicks)+'</b></p><p>Najwięcej monet w zapisie: <b>'+format(s.bestCoins)+'</b></p><p>Czas gry: <b>'+formatTime(playedSeconds)+'</b></p>'}
stage17Button?.addEventListener('click',()=>{renderStage17();stage17Modal.classList.remove('hidden')});stage17Close?.addEventListener('click',()=>stage17Modal.classList.add('hidden'));
const _getSave17=getSaveData; getSaveData=function(){const d=_getSave17();d.stage17Data=stage17Data;return d;};


// FUNKCJA: MOTYWY KARCZMY
const stage18Button=$('stage18Button'), stage18Modal=$('stage18Modal'), stage18Close=$('stage18Close'), stage18Content=$('stage18Content');
const stage18Themes={classic:'Klasyczna karczma',night:'Nocna piwnica',royal:'Złoty browar',hell:'Piekielny motyw'};function applyStage18(){document.body.dataset.theme=stage18Data.theme||'classic'};function renderStage18(){const unlocked=!!stage18Data.hellUnlocked;stage18Content.innerHTML=Object.entries(stage18Themes).map(([k,v])=>{const locked=k==='hell'&&!unlocked;return '<button class=\"story-button theme-choice '+(locked?'locked':'')+'\" data-theme=\"'+k+'\" '+(locked?'disabled':'')+'>'+v+(locked?' 🔒':'')+'</button>'}).join('');stage18Content.querySelectorAll('.theme-choice:not([disabled])').forEach(b=>b.onclick=()=>{stage18Data.theme=b.dataset.theme;applyStage18();saveGame(false)})}
applyStage18();
stage18Button?.addEventListener('click',()=>{renderStage18();stage18Modal.classList.remove('hidden')});stage18Close?.addEventListener('click',()=>stage18Modal.classList.add('hidden'));
const _getSave18=getSaveData; getSaveData=function(){const d=_getSave18();d.stage18Data=stage18Data;return d;};


// FUNKCJA: STEROWANIE
const stage19Button=$('stage19Button'), stage19Modal=$('stage19Modal'), stage19Close=$('stage19Close'), stage19Content=$('stage19Content');
function renderStage19(){stage19Content.innerHTML='<p><b>SPACJA / ENTER</b> — klik kufla</p><p><b>M</b> — muzyka, <b>S</b> — ustawienia, <b>F11</b> — pełny ekran</p><label><input type="checkbox" id="largeUI"> Duży interfejs</label>';const c=$("largeUI");c.checked=!!stage19Data.largeUI;c.onchange=()=>{stage19Data.largeUI=c.checked;document.body.classList.toggle('large-ui',c.checked);saveGame(false)}}
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.code==='Space'||e.code==='Enter'){e.preventDefault();beerButton?.click()}});
stage19Button?.addEventListener('click',()=>{renderStage19();stage19Modal.classList.remove('hidden')});stage19Close?.addEventListener('click',()=>stage19Modal.classList.add('hidden'));
const _getSave19=getSaveData; getSaveData=function(){const d=_getSave19();d.stage19Data=stage19Data;return d;};


// FUNKCJA: MIGAWKI ZAPISU
const stage20Button=$('stage20Button'), stage20Modal=$('stage20Modal'), stage20Close=$('stage20Close'), stage20Content=$('stage20Content');
function renderStage20(){const s=stage20Data;stage20Content.innerHTML='<p>Ostatnia migawka: <b>'+(s.when||'brak')+'</b></p><button id="makeSnap" class="story-button">UTWÓRZ MIGAWKĘ</button><button id="restoreSnap" class="story-button" '+(s.data?'':'disabled')+'>PRZYWRÓĆ</button>';$("makeSnap").onclick=()=>{s.data=getSaveData();s.when=new Date().toLocaleString('pl-PL');renderStage20();saveGame(false)};$("restoreSnap").onclick=async()=>{if(s.data){await window.tsncg?.saveGame?.(s.data);location.reload()}}}
stage20Button?.addEventListener('click',()=>{renderStage20();stage20Modal.classList.remove('hidden')});stage20Close?.addEventListener('click',()=>stage20Modal.classList.add('hidden'));
const _getSave20=getSaveData; getSaveData=function(){const d=_getSave20();d.stage20Data=stage20Data;return d;};


// FUNKCJA: RANGI I TYTUŁY
const stage21Button=$('stage21Button'), stage21Modal=$('stage21Modal'), stage21Close=$('stage21Close'), stage21Content=$('stage21Content');
function renderStage21(){const score=level*10+clicks/1000+Number(stage14Data?.tokens||0)*100;const ranks=[['NOWICJUSZ',0,'Start gry'],['STAŁY BYWALEC',100,'100 pkt rangi'],['BROWARNIK',250,'250 pkt rangi'],['MISTRZ KUFLA',500,'500 pkt rangi'],['LEGENDA KARCZMY',1000,'1000 pkt rangi']];const rank=ranks.reduce((a,r)=>score>=r[1]?r:a,ranks[0]);const titles=[['PIERWSZY ŁYK','Osiągnij poziom 2'],['KLIKACZ','Wykonaj 1000 kliknięć'],['KRYTYCZNY FACHOWIEC','Zdobądź 100 krytyków'],['PRESTIŻOWY','Zdobądź 1 żeton prestiżu'],['MISTRZ ULEPSZEŃ','Kup 50 poziomów ulepszeń'],['KARCZMARZ','Odblokuj 4 trunki']];const checks=[level>=2,clicks>=1000,criticalClicks>=100,Number(stage14Data?.tokens||0)>=1,(clickUpgradeLevel+passiveUpgradeLevel+critUpgradeLevel+brutalLevel+turboLevel+goldenLevel+luckyLevel+comboUpgradeLevel+breweryLevel)>=50,drinkIndex>=3];stage21Content.innerHTML='<p>Twoja ranga:</p><h2>'+rank[0]+'</h2><p>Wynik rangi: <b>'+score.toFixed(1)+'</b></p><h3>Rangi</h3><div class=\"rank-list\">'+ranks.map(r=>'<div class=\"rank-entry '+(rank[0]===r[0]?'current':'')+'\"><b>'+r[0]+'</b><small>Wymaganie: '+r[2]+'</small></div>').join('')+'</div><h3>Tytuły</h3><div class=\"title-list\">'+titles.map((t,i)=>'<div class=\"title-entry '+(checks[i]?'earned':'')+'\"><b>'+t[0]+'</b><small>'+t[1]+(checks[i]?' ✓':' 🔒')+'</small></div>').join('')+'</div>'}
stage21Button?.addEventListener('click',()=>{renderStage21();stage21Modal.classList.remove('hidden')});stage21Close?.addEventListener('click',()=>stage21Modal.classList.add('hidden'));
const _getSave21=getSaveData; getSaveData=function(){const d=_getSave21();d.stage21Data=stage21Data;return d;};


// FUNKCJA: NOWA GRA+
const stage22Button=$('stage22Button'), stage22Modal=$('stage22Modal'), stage22Close=$('stage22Close'), stage22Content=$('stage22Content');
function ngBonus(){return 1+Number(stage22Data.runs||0)*0.1}function renderStage22(){const r=Number(stage22Data.runs||0);stage22Content.innerHTML='<p>NG+: <b>'+r+'</b></p><p>Bonus: <b>×'+ngBonus().toFixed(2)+'</b></p><button id="ngDo" class="story-button" '+(coins<1500000?'disabled':'')+'>ROZPOCZNIJ NG+</button>';$("ngDo").onclick=()=>{if(coins<1500000)return;stage22Data.runs=r+1;coins=0;clicks=0;clickPower=1;passive=0;drinkIndex=0;storyChapter=0;clickUpgradeLevel=0;passiveUpgradeLevel=0;critUpgradeLevel=0;brutalLevel=0;turboLevel=0;goldenLevel=0;luckyLevel=0;comboUpgradeLevel=0;breweryLevel=0;clickCost=25;passiveCost=75;critCost=250;brutalCost=1000;turboCost=3000;goldenCost=10000;luckyCost=15000;comboUpgradeCost=25000;breweryCost=50000;render();renderStage22();saveGame(false)}}
stage22Button?.addEventListener('click',()=>{renderStage22();stage22Modal.classList.remove('hidden')});stage22Close?.addEventListener('click',()=>stage22Modal.classList.add('hidden'));
const _getSave22=getSaveData; getSaveData=function(){const d=_getSave22();d.stage22Data=stage22Data;return d;};


// PANEL KOMEND: ukryty motyw
// Kod odblokowujący: Filli Hircus
function setCommandStatus(text){if(commandStatus)commandStatus.textContent=text;}
function executeCommand(){const code=(commandCodeInput?.value||'').trim();if(code.toLowerCase()!=='filli hircus'){setCommandStatus('Nieprawidłowy kod.');return;}if(storyChapter<4){setCommandStatus('Kod zadziała po odblokowaniu rozdziału 5.');return;}stage18Data.hellUnlocked=true;stage18Data.theme='hell';applyStage18();setCommandStatus('Kod zaakceptowany. Piekielny motyw odblokowany.');saveGame(false);}
commandsButton?.addEventListener('click',()=>{commandsModal?.classList.remove('hidden');commandCodeInput?.focus()});document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA')return;if(e.key.toLowerCase()==='c'){commandsModal?.classList.remove('hidden');commandCodeInput?.focus();}});commandsClose?.addEventListener('click',()=>commandsModal?.classList.add('hidden'));commandsModal?.addEventListener('click',e=>{if(e.target===commandsModal)commandsModal.classList.add('hidden')});commandExecute?.addEventListener('click',executeCommand);commandCodeInput?.addEventListener('keydown',e=>{if(e.key==='Enter')executeCommand()});
