const CACHE = 'nuan-v22';

// Core files — MUST cache for app to work offline
const CORE = [
  './nuanv3.html',
  './manifest.json',
  './icon.png',
];

// Optional assets — cached best-effort, failure won't block install
const OPTIONAL = [
  './body.png',
  './eye_left.png',
  './eye_right.png',
  './blush.png',
  './antennas.png',
  './nuan-assets/nn-watching.png',
  './nuan-assets/nn-hero.png',
  './nuan-assets/nn-card-chat.png',
  './nuan-assets/nn-card-profile.png',
  './nuan-assets/nn-card-journal.png',
  './nuan-assets/nn-card-explore.png',
  './nuan-assets/nn-peeking.png',
  './nuan-assets/nn-thinking.png',
  './nuan-assets/nn-lying.png',
  './nuan-assets/nn-sleepy.png',
  './nuan-assets/nn-pointing.png',
  './nuan-assets/nn-angry-pout.png',
  './nuan-assets/nn-angry-hands.png',
  './nuan-assets/nn-angry-circles.png',
  './nuan-assets/nn-frazzled.png',
  './nuan-assets/nn-eat-cake.png',
  './nuan-assets/nn-eat-riceball.png',
  './nuan-assets/nn-happy-walk.png',
  './nuan-assets/nn-guard.png',
  './nuan-assets/nn-guard-armor.png',
  './nuan-assets/mood-sad.png',
  './nuan-assets/mood-down.png',
  './nuan-assets/mood-neutral.png',
  './nuan-assets/mood-happy.png',
  './nuan-assets/mood-excited.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async cache => {
      // Core files must succeed
      await cache.addAll(CORE);
      // Optional assets: cache individually, ignore failures
      await Promise.allSettled(
        OPTIONAL.map(url =>
          cache.add(url).catch(() => { /* ignore individual failures */ })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE && k !== 'nuan-settings-v1')
          .map(k => caches.delete(k))
      )
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

    if (Math.abs(curMin - morMin) <= 45) {
      body = pick('morning');
    } else if (Math.abs(curMin - eveMin) <= 45) {
      body = pick('evening');
    } else if (prefs.random && Math.random() < 0.2) {
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
