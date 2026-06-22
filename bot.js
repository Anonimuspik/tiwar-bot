// bot.js — поддержка 5 аккаунтов через ACCOUNT_INDEX
// Запуск: ACCOUNT_INDEX=1 node bot.js

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ACCOUNT_INDEX = parseInt(process.env.ACCOUNT_INDEX || '1', 10);
const GAME_URL = 'https://tiwar.ru/';
const RUN_MINUTES = parseInt(process.env.RUN_MINUTES || '340', 10);
const RELOAD_EVERY_MINUTES = 30;

// ── Настройки аккаунтов ───────────────────────────────────────────────────────

const ACCOUNT_CONFIGS = {
  1: {
    name: 'Kaneki',
    cookiesEnv: 'COOKIES_JSON_1',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ['arena','mine','forge','hunt','cave','clandungeon','campaign','career','sage','battles','league','coliseum','treasury','undying','clanquest','clanrecruit','clangreet'],
      sequentialIgnored: [],
      autoAltars: true,
      autoKing: true,
      autoClanfight: true,
      autoUndying: true,
      battlesEnableUndying: true,
      battlesEnableClanfight: false,
      battlesEnableKing: true,
      battlesEnableAltars: true,
      battlesEnableClancoliseum: false,
    }
  },
  2: {
    name: 'Black Fly',
    cookiesEnv: 'COOKIES_JSON_2',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ['mine','forge','treasury','hunt','sage','arena','coliseum','clandungeon','campaign','career','undying','clanrecruit','clangreet'],
      sequentialIgnored: [],
      battlesEnableUndying: true,
      battlesEnableClanfight: true,
      battlesEnableKing: true,
      battlesEnableAltars: true,
      battlesEnableClancoliseum: true,
      autoUndying: true,
      autoClanfight: true,
      autoKing: true,
      autoAltars: true,
    }
  },
  3: {
    name: 'Акк3',
    cookiesEnv: 'COOKIES_JSON_3',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ['mine','forge','arena','sage','coliseum','clandungeon','campaign','career','battles','treasury','undying','clanquest','clanrecruit','clangreet'],
      sequentialIgnored: [],
      battlesEnableUndying: true,
      battlesEnableClanfight: true,
      battlesEnableKing: true,
      battlesEnableAltars: true,
      battlesEnableClancoliseum: true,
      autoUndying: true,
      autoClanfight: true,
      autoKing: true,
      autoAltars: true,
    }
  },
  4: {
    name: 'Украду',
    cookiesEnv: 'COOKIES_JSON_4',
    settings: {
      autoSequentialFarm: true,
      sequentialOrder: ['clanrecruit','battles','mine','forge','hunt','arena','cave','clandungeon','campaign','career','sage','treasury','undying','clanquest','clangreet'],
      sequentialIgnored: [],
      battlesEnableUndying: true,
      battlesEnableClanfight: true,
      battlesEnableKing: true,
      battlesEnableAltars: true,
      battlesEnableClancoliseum: false,
      autoUndying: true,
      autoClanfight: true,
      autoKing: true,
      autoAltars: true,
    }
  },
  5: {
    name: 'Вирус Б',
    cookiesEnv: 'COOKIES_JSON_5',
    settings: {
      autoSequentialFarm: true,
      autoClanDungeon: true, // клан задания ON только для Вирус Б
      sequentialOrder: ['clanrecruit','battles','mine','forge','hunt','arena','cave','clandungeon','campaign','career','sage','treasury','undying','clanquest','clangreet'],
      sequentialIgnored: [],
      battlesEnableUndying: true,
      battlesEnableClanfight: true,
      battlesEnableKing: true,
      battlesEnableAltars: true,
      battlesEnableClancoliseum: false,
      autoUndying: true,
      autoClanfight: true,
      autoKing: true,
      autoAltars: true,
    }
  }
};

// ── Вспомогательные функции ───────────────────────────────────────────────────

function loadCookies(envKey) {
  const raw = process.env[envKey];
  if (!raw) throw new Error(`Переменная ${envKey} не задана!`);
  return JSON.parse(raw);
}

function loadUserscript() {
  return fs.readFileSync(path.join(__dirname, 'userscript.js'), 'utf8');
}

async function applySettings(page, settings) {
  await page.evaluate((cfg) => {
    const KEY = 'fadd_tiwar_settings';
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    Object.assign(s, cfg);
    localStorage.setItem(KEY, JSON.stringify(s));
    console.log('[bot] Настройки применены:', JSON.stringify(cfg));
  }, settings);
}

// ── Основной запуск ───────────────────────────────────────────────────────────

(async () => {
  const config = ACCOUNT_CONFIGS[ACCOUNT_INDEX];
  if (!config) {
    console.error(`[bot] Неизвестный ACCOUNT_INDEX: ${ACCOUNT_INDEX}`);
    process.exit(1);
  }

  console.log(`[bot] Запуск аккаунта #${ACCOUNT_INDEX}: ${config.name} | ${new Date().toISOString()}`);

  const cookies = loadCookies(config.cookiesEnv);
  const userscript = loadUserscript();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 }
  });

  // Куки
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

  // Userscript инъецируется при каждой загрузке страницы
  await context.addInitScript({ content: userscript });

  const page = await context.newPage();
  page.on('console', msg => console.log(`[page][${config.name}]`, msg.text()));
  page.on('pageerror', err => console.error(`[err][${config.name}]`, err.message));

  console.log(`[bot] Открываем ${GAME_URL}...`);
  await page.goto(GAME_URL, { waitUntil: 'load', timeout: 60000 });

  await applySettings(page, config.settings);
  await page.reload({ waitUntil: 'load' });

  console.log(`[bot] Страница загружена, работаю ${RUN_MINUTES} мин.`);

  const endAt = Date.now() + RUN_MINUTES * 60 * 1000;

  while (Date.now() < endAt) {
    const msLeft = endAt - Date.now();
    const waitMs = Math.min(RELOAD_EVERY_MINUTES * 60 * 1000, msLeft);
    await page.waitForTimeout(waitMs);
    if (Date.now() >= endAt) break;

    try {
      console.log(`[bot][${config.name}] ${new Date().toISOString()} — перезагрузка страницы`);
      await page.reload({ waitUntil: 'load' });
      await applySettings(page, config.settings);
    } catch (e) {
      console.log(`[bot] Ошибка перезагрузки: ${e.message} — переоткрываю страницу`);
      try {
        await page.goto(GAME_URL, { waitUntil: 'load' });
        await applySettings(page, config.settings);
        await page.reload({ waitUntil: 'load' });
      } catch (e2) {
        console.log(`[bot] Не удалось переоткрыть: ${e2.message}`);
      }
    }
  }

  console.log(`[bot][${config.name}] Завершение.`);
  await browser.close();
})().catch(err => {
  console.error('[bot] Критическая ошибка:', err);
  process.exit(1);
});
