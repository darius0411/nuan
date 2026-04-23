const CACHE = 'nuan-v3';
const ASSETS = [
  './nuanv3.html',
  './manifest.json',
  './icon.png',
  './body.png',
  './eye_left.png',
  './eye_right.png',
  './blush.png',
  './antennas.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== 'nuan-settings-v1').map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ─── Background care notifications ───────────────────────
self.addEventListener('periodicsync', e => {
  if (e.tag === 'nuan-care') {
    e.waitUntil(sendCareNotification());
  }
});

async function sendCareNotification() {
  try {
    const settingsCache = await caches.open('nuan-settings-v1');
    const res = await settingsCache.match('notif-prefs');
    if (!res) return;
    const prefs = await res.json();
    if (!prefs.enabled) return;

    const now    = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();

    const [mH, mM] = (prefs.morning || '08:00').split(':').map(Number);
    const [eH, eM] = (prefs.evening || '21:00').split(':').map(Number);
    const morMin = mH * 60 + mM;
    const eveMin = eH * 60 + eM;

    const isEn = prefs.lang === 'en';

    const CARE_MSGS = {
      morning: {
        zh: ['早安 ☀️ 新的一天，暖暖在这里', '睡得好吗？新的一天开始啦 ♡', '早上好～今天也要好好的哦'],
        en: ['Good morning ☀️ Lumi is here', 'Morning~ hope today is wonderful ♡', 'A new day begins — Lumi\'s with you ✨']
      },
      evening: {
        zh: ['辛苦了 🌙 今天过得怎么样？', '晚上好，来聊聊今天的故事吧 ♡', '一天结束了，暖暖在这里陪你'],
        en: ['Long day? 🌙 Lumi\'s here to listen', 'Good evening~ how was your day? ♡', 'The day is over — Lumi\'s here']
      },
      random: {
        zh: ['最近还好吗？暖暖想你了 ♡', '突然想到你，今天有没有开心一点？'],
        en: ['Just thinking about you ♡', 'Hey… Lumi misses you a little']
      }
    };

    function pick(type) {
      const lang = isEn ? 'en' : 'zh';
      const pool = CARE_MSGS[type][lang];
      return pool[Math.floor(Math.random() * pool.length)];
    }

    const title = isEn ? 'Lumi' : '暖暖';
    let body = null;

    // Morning window ±45 min
    if (Math.abs(curMin - morMin) <= 45) {
      body = pick('morning');
    }
    // Evening window ±45 min
    else if (Math.abs(curMin - eveMin) <= 45) {
      body = pick('evening');
    }
    // Random: ~20% chance when periodic sync fires outside time windows
    else if (prefs.random && Math.random() < 0.2) {
      body = pick('random');
    }

    if (body) {
      await self.registration.showNotification(title, {
        body,
        icon: './icon.png',
        badge: './icon.png',
        tag: 'nuan-care',
        renotify: true,
        data: { url: './nuanv3.html' }
      });
    }
  } catch(e) { /* silent */ }
}

// Clicking notification opens the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || './nuanv3.html';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if (client.url.includes('nuanv3') && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
