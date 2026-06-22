const { chromium } = require('playwright');
const fs = require('fs');

const ORDER_DEFAULT = [
  'clanrecruit','clangreet','mine','forge','cave',
  'clandungeon','campaign','career','sage','battles',
  'arena','treasury','undying'
];

const ORDER_ACC5 = [...ORDER_DEFAULT, 'clanquest'];

const BATTLES_ALL_ON = {
  battlesEnableUndying: true,
  battlesEnableClanfight: true,
  battlesEnableKing: true,
  battlesEnableAltars: true,
  battlesEnableClancoliseum: true,
  autoUndying: true,
  autoClanfight: true,
  autoKing: true,
  autoAltars: true,
};

const ACCOUNTS = [
  {
    id: 1,
    name: 'Kaneki',
    cookies: 'COOKIES_JSON_1',
    order: ORDER_DEFAULT,
    extra: BATTLES_ALL_ON
  },
  {
    id: 2,
    name: 'Black Fly',
    cookies: 'COOKIES_JSON_2',
    order: ORDER_DEFAULT,
    extra: BATTLES_ALL_ON
  },
  {
    id: 3,
    name: 'Tsukiyama',
    cookies: 'COOKIES_JSON_3',
    order: ORDER_DEFAULT,
    extra: BATTLES_ALL_ON
  },
  {
    id: 4,
    name: 'Украду',
    cookies: 'COOKIES_JSON_4',
    order: ORDER_DEFAULT,
    extra: BATTLES_ALL_ON
  },
  {
    id: 5,
    name: 'Вирус Б',
    cookies: 'COOKIES_JSON_5',
    order: ORDER_ACC5,
    extra: {
      ...BATTLES_ALL_ON,
      autoClanTasks: true
    }
  }
];

const scriptContent = fs.readFileSync('userscript.js', 'utf8');

async function runAccount(browser, acc) {
  const raw = process.env[acc.cookies];
  if (!raw) {
    console.log(`[${acc.name}] нет cookies`);
    return null;
  }

  let cookies;
  try {
    cookies = JSON.parse(raw);
  } catch {
    console.log(`[${acc.name}] bad cookies`);
    return null;
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  await context.addCookies(cookies);

  const page = await context.newPage();

  page.on('console', m => console.log(`[${acc.name}]`, m.text()));

  await page.goto('https://tiwar.ru/', { waitUntil: 'commit' });

  await page.evaluate((accData) => {
    const KEY = 'fadd_tiwar_settings';

    const merged = {
      ...JSON.parse(localStorage.getItem(KEY) || '{}'),
      autoSequentialFarm: true,
      sequentialOrder: accData.order,
      ...accData.extra
    };

    localStorage.setItem(KEY, JSON.stringify(merged));
  }, acc);

  await page.addScriptTag({ content: scriptContent });

  return page;
}

(async () => {
  console.log('[bot] FAST START');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  const pages = await Promise.all(
    ACCOUNTS.map(acc => runAccount(browser, acc))
  );

  console.log('[bot] ALL ACCOUNTS READY');

  const HEARTBEAT = 120000;

  setInterval(async () => {
    for (const page of pages) {
      if (!page) continue;
      try {
        await page.evaluate(() => window._fadd_alive === true);
      } catch {}
    }
  }, HEARTBEAT);

  const RUN_TIME = 5 * 60 * 60 * 1000;

  await new Promise(r => setTimeout(r, RUN_TIME));

  await browser.close();
})();
