const { chromium } = require('playwright');
const fs = require('fs');

const ACCOUNT_INDEX = parseInt(process.env.ACCOUNT_INDEX || '1', 10);

// Общий порядок для акков 1-4
const ORDER_DEFAULT = [
  'clanrecruit', 'clangreet', 'mine', 'forge', 'cave',
  'clandungeon', 'campaign', 'career', 'sage', 'battles',
  'arena', 'treasury', 'undying'
];

// Акк 5 — то же + clanquest
const ORDER_ACC5 = [
  'clanrecruit', 'clangreet', 'mine', 'forge', 'cave',
  'clandungeon', 'campaign', 'career', 'sage', 'battles',
  'arena', 'treasury', 'undying', 'clanquest'
];

// Все авто-сражения включены для всех
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

const ACCOUNT_CONFIGS = {
  1: {
    name: 'Kaneki',
    cookiesEnv: 'COOKIES_JSON_1',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ORDER_DEFAULT,
      sequentialIgnored: [],
      ...BATTLES_ALL_ON,
    }
  },
  2: {
    name: 'Black Fly',
    cookiesEnv: 'COOKIES_JSON_2',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ORDER_DEFAULT,
      sequentialIgnored: [],
      ...BATTLES_ALL_ON,
    }
  },
  3: {
    name: 'Tsukiyama',
    cookiesEnv: 'COOKIES_JSON_3',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ORDER_DEFAULT,
      sequentialIgnored: [],
      ...BATTLES_ALL_ON,
    }
  },
  4: {
    name: 'Украду',
    cookiesEnv: 'COOKIES_JSON_4',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ORDER_DEFAULT,
      sequentialIgnored: [],
      ...BATTLES_ALL_ON,
    }
  },
  5: {
    name: 'Вирус Б',
    cookiesEnv: 'COOKIES_JSON_5',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ORDER_ACC5,
      sequentialIgnored: [],
      ...BATTLES_ALL_ON,
    }
  }
};

(async () => {
  const config = ACCOUNT_CONFIGS[ACCOUNT_INDEX];
  if (!config) {
    console.error(`[bot] Неизвестный ACCOUNT_INDEX: ${ACCOUNT_INDEX}`);
    process.exit(1);
  }

  console.log(`[bot] Запуск аккаунта #${ACCOUNT_INDEX}: ${config.name}`);

  const cookiesRaw = process.env[config.cookiesEnv];
  if (!cookiesRaw) {
    console.error(`[bot] Переменная окружения ${config.cookiesEnv} не задана!`);
    process.exit(1);
  }

  let cookies;
  try {
    cookies = JSON.parse(cookiesRaw);
  } catch (e) {
    console.error(`[bot] Ошибка парсинга cookies: ${e.message}`);
    process.exit(1);
  }

  const scriptContent = fs.readFileSync('userscript.js', 'utf8');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const formattedCookies = cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain || 'tiwar.ru',
    path: c.path || '/',
    expires: c.expirationDate || c.expires || -1,
    httpOnly: c.httpOnly || false,
    secure: c.secure || false,
    sameSite: c.sameSite === 'no_restriction' ? 'None' : (c.sameSite || 'Lax')
  }));

  await context.addCookies(formattedCookies);

  const page = await context.newPage();
  page.on('console', msg => console.log(`[page][${config.name}] ${msg.text()}`));
  page.on('pageerror', err => console.error(`[page-err][${config.name}] ${err.message}`));

  console.log(`[bot] Открываем tiwar.ru...`);
  await page.goto('https://tiwar.ru/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log(`[bot] URL: ${page.url()}`);

  await page.evaluate((cfg) => {
    const KEY = 'fadd_tiwar_settings';
    const merged = { ...JSON.parse(localStorage.getItem(KEY) || '{}'), ...cfg };
    localStorage.setItem(KEY, JSON.stringify(merged));
    console.log('[bot] Настройки:', JSON.stringify(merged));
  }, config.settings);

  await page.addScriptTag({ content: scriptContent });
  console.log(`[bot] Скрипт внедрён для ${config.name}`);

  const RUN_DURATION = 5 * 60 * 60 * 1000 + 40 * 60 * 1000;
  const HEARTBEAT = 60 * 1000;
  const startTime = Date.now();

  const heartbeatInterval = setInterval(async () => {
    const elapsed = Math.round((Date.now() - startTime) / 60000);
    console.log(`[bot][${config.name}] Работает ${elapsed} мин...`);
    try {
      const isAlive = await page.evaluate(() => !!window._fadd_alive).catch(() => false);
      if (!isAlive) {
        console.log(`[bot] Переинъецируем скрипт...`);
        await page.evaluate((cfg) => {
          const KEY = 'fadd_tiwar_settings';
          localStorage.setItem(KEY, JSON.stringify({ ...JSON.parse(localStorage.getItem(KEY) || '{}'), ...cfg }));
        }, config.settings);
        await page.addScriptTag({ content: scriptContent });
      }
    } catch (e) {
      console.log(`[bot] Ошибка heartbeat: ${e.message}`);
    }
  }, HEARTBEAT);

  await new Promise(resolve => setTimeout(resolve, RUN_DURATION));

  clearInterval(heartbeatInterval);
  console.log(`[bot][${config.name}] Завершение.`);
  await browser.close();
})();
