// bot.js
// Открывает headless Chromium, логинится через cookies, внедряет userscript.js
// и держит страницу открытой заданное время.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME_URL            = process.env.GAME_URL            || 'https://tiwar.ru/';
const RUN_MINUTES         = parseInt(process.env.RUN_MINUTES         || '340', 10);
const RELOAD_EVERY_MINUTES = parseInt(process.env.RELOAD_EVERY_MINUTES || '30',  10);

function loadCookies() {
    const raw = process.env.COOKIES_JSON;
    if (!raw) throw new Error('Переменная COOKIES_JSON не задана!');
    return JSON.parse(raw);
}

function loadUserscript() {
    return fs.readFileSync(path.join(__dirname, 'userscript.js'), 'utf8');
}

async function applySettings(page) {
    await page.evaluate(() => {

        // ── 1. Основные настройки ────────────────────────────────────────────
        const KEY = 'fadd_tiwar_settings';
        let s = {};
        try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}

        // Поочерёдный автофарм — включён
        s.autoSequentialFarm = true;

        // Авто-сражения (активные бои по расписанию) — все 4 включены
        s.autoUndying   = true;   // Долина бессмертных
        s.autoClanfight = true;   // Клановый турнир
        s.autoKing      = true;   // Король бессмертных
        s.autoAltars    = true;   // Древние алтари

        // Авто-заявки сражений — все 5 включены
        s.battlesEnableUndying      = true;  // Долина бессмертных
        s.battlesEnableClanfight    = true;  // Клановый турнир
        s.battlesEnableKing         = true;  // Король бессмертных
        s.battlesEnableAltars       = true;  // Древние алтари
        s.battlesEnableClancoliseum = true;  // Клановый колизей

        localStorage.setItem(KEY, JSON.stringify(s));

        // ── 2. Порядок очереди автофарма ────────────────────────────────────
        //    Набор в клан → Привет → Шахта → Кузница → Пещера → Подземелье →
        //    Поход → Карьера → Хижина мудреца → Заявки сражений → Арена →
        //    Казна клана → Долина бессмертных
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

        // ── 3. Замороженные задачи ───────────────────────────────────────────
        //    Активны: всё что в CUSTOM_ORDER выше
        //    Заморожены: hunt (Охота), league (Лига), coliseum (Колизей),
        //                clanquest (Клан-задания)
        const FROZEN = ['hunt', 'league', 'coliseum', 'clanquest'];
        localStorage.setItem('fadd_frozen_tasks', JSON.stringify(FROZEN));

        console.log('[bot] настройки применены');
    });
}

(async () => {
    console.log('[bot] Запуск, время:', new Date().toISOString());

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 900 }
    });

    // Куки — авторизация
    await context.addCookies(loadCookies());

    // Скрипт внедряется на каждой странице/перезагрузке (аналог Tampermonkey)
    await context.addInitScript({ content: loadUserscript() });

    const page = await context.newPage();
    page.on('console', msg => console.log('[page]', msg.text()));
    page.on('pageerror', err => console.error('[page-err]', err.message));

    console.log('[bot] Открываю', GAME_URL);
    await page.goto(GAME_URL, { waitUntil: 'load', timeout: 60000 });

    // Применяем настройки и перезагружаем чтобы скрипт подхватил их
    await applySettings(page);
    await page.reload({ waitUntil: 'load', timeout: 60000 });

    console.log('[bot] Страница загружена, скрипт внедрён. Работаю', RUN_MINUTES, 'минут.');

    const endAt = Date.now() + RUN_MINUTES * 60 * 1000;

    while (Date.now() < endAt) {
        const msLeft = endAt - Date.now();
        const waitMs = Math.min(RELOAD_EVERY_MINUTES * 60 * 1000, msLeft);
        await page.waitForTimeout(waitMs);

        if (Date.now() >= endAt) break;

        try {
            console.log('[bot]', new Date().toISOString(), '— профилактическая перезагрузка');
            await page.reload({ waitUntil: 'load', timeout: 60000 });
            await applySettings(page);
        } catch (e) {
            console.log('[bot] Ошибка перезагрузки:', e.message, '— пробую заново');
            try {
                await page.goto(GAME_URL, { waitUntil: 'load', timeout: 60000 });
                await applySettings(page);
                await page.reload({ waitUntil: 'load', timeout: 60000 });
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
