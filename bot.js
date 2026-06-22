const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME_URL             = process.env.GAME_URL             || 'https://tiwar.ru/';
const RUN_MINUTES          = parseInt(process.env.RUN_MINUTES          || '340', 10);
const RELOAD_EVERY_MINUTES = parseInt(process.env.RELOAD_EVERY_MINUTES || '30',  10);

function loadCookies() {
    const raw = process.env.COOKIES_JSON;
    if (!raw) throw new Error('COOKIES_JSON не задана!');
    return JSON.parse(raw);
}

// Этот код выполняется ДО старта userscript.js на каждой странице/перезагрузке
const INIT_SETTINGS = `
(function() {
    // ── Основные настройки ───────────────────────────────────────────────────
    const KEY = 'fadd_tiwar_settings';
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e) {}

    s.autoSequentialFarm        = true;

    // Авто-сражения по расписанию (активные бои)
    s.autoUndying               = true;
    s.autoClanfight             = true;
    s.autoKing                  = true;
    s.autoAltars                = true;
    s.autoClancoliseum          = false;  // колизей — только заявки, не активный бой

    // Авто-заявки сражений — все 5
    s.battlesEnableUndying      = true;
    s.battlesEnableClanfight    = true;
    s.battlesEnableKing         = true;
    s.battlesEnableAltars       = true;
    s.battlesEnableClancoliseum = true;

    // Одиночные авто-режимы — всё выключено, управляет только очередь
    s.autoHunt1       = false;
    s.autoMine        = false;
    s.autoForge       = false;
    s.autoCave        = false;
    s.autoClanDungeon = false;
    s.autoCampaign    = false;
    s.autoCareer      = false;
    s.autoAdventure   = false;

    localStorage.setItem(KEY, JSON.stringify(s));

    // ── Порядок очереди автофарма ────────────────────────────────────────────
    const CUSTOM_ORDER = [
        'clanrecruit',  // Авто-набор в клан
        'clangreet',    // Авто-привет
        'mine',         // Авто-шахта
        'forge',        // Авто-кузница
        'cave',         // Авто-пещера
        'clandungeon',  // Авто-подземелье
        'campaign',     // Авто-поход
        'career',       // Карьера
        'sage',         // Хижина мудреца
        'battles',      // Авто-заявки сражений
        'arena',        // Авто-арена
        'treasury',     // Авто-казна клана
        'undying',      // Авто-долина бессмертных
    ];
    localStorage.setItem('fadd_custom_order', JSON.stringify(CUSTOM_ORDER));

    // ── Замороженные задачи ──────────────────────────────────────────────────
    // hunt, league, coliseum, clanquest — заморожены и не выполняются
    const FROZEN = ['hunt', 'league', 'coliseum', 'clanquest'];
    localStorage.setItem('fadd_frozen_tasks', JSON.stringify(FROZEN));

    console.log('[bot-init] настройки прописаны до старта скрипта');
})();
`;

(async () => {
    console.log('[bot] Запуск:', new Date().toISOString());

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 900 }
    });

    await context.addCookies(loadCookies());

    // Порядок важен: сначала прописываем настройки в localStorage,
    // потом запускается userscript — он читает уже правильные значения
    await context.addInitScript({ content: INIT_SETTINGS });
    await context.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'userscript.js'), 'utf8') });

    const page = await context.newPage();
    page.on('console', msg => console.log('[page]', msg.text()));
    page.on('pageerror', err => console.error('[page-err]', err.message));

    console.log('[bot] Открываю', GAME_URL);
    await page.goto(GAME_URL, { waitUntil: 'load', timeout: 60000 });

    console.log('[bot] Работаю', RUN_MINUTES, 'минут.');

    const endAt = Date.now() + RUN_MINUTES * 60 * 1000;

    while (Date.now() < endAt) {
        const msLeft = endAt - Date.now();
        const waitMs = Math.min(RELOAD_EVERY_MINUTES * 60 * 1000, msLeft);
        await page.waitForTimeout(waitMs);
        if (Date.now() >= endAt) break;

        try {
            console.log('[bot]', new Date().toISOString(), '— перезагрузка');
            await page.reload({ waitUntil: 'load', timeout: 60000 });
        } catch (e) {
            console.log('[bot] Ошибка перезагрузки:', e.message);
            try {
                await page.goto(GAME_URL, { waitUntil: 'load', timeout: 60000 });
            } catch (e2) {
                console.log('[bot] Не получилось:', e2.message);
            }
        }
    }

    console.log('[bot] Время вышло, закрываю браузер.');
    await browser.close();
})().catch(err => {
    console.error('[bot] Критическая ошибка:', err);
    process.exit(1);
});
