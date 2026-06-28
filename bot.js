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

function loadSettings() {
    const settingsPath = path.join(__dirname, 'settings.json');
    try {
        const raw = fs.readFileSync(settingsPath, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.warn('[bot] settings.json не найден или повреждён, используем дефолт');
        return {};
    }
}

const gameSettings = loadSettings();
console.log('[bot] Настройки загружены:', JSON.stringify(gameSettings, null, 2));

// ШАГ 1: выполняется ДО userscript — прописываем настройки из settings.json
const INIT_BEFORE = `
(function() {
    const KEY = 'fadd_tiwar_settings';
    const s = ${JSON.stringify(gameSettings)};

    // Записываем основные настройки
    const existing = {};
    try { Object.assign(existing, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch(e) {}
    const merged = Object.assign(existing, s);
    localStorage.setItem(KEY, JSON.stringify(merged));

    // Порядок очереди
    if (Array.isArray(s.sequentialOrder)) {
        localStorage.setItem('fadd_custom_order', JSON.stringify(s.sequentialOrder));
    }

    // Замороженные задачи
    if (Array.isArray(s.frozenTasks)) {
        localStorage.setItem('fadd_frozen_tasks', JSON.stringify(s.frozenTasks));
    }

    console.log('[bot-init] настройки из settings.json прописаны');
})();
`;

// ШАГ 2: выполняется ПОСЛЕ userscript — патчит frozen чтобы не сбрасывались
const INIT_AFTER = `
(function() {
    const FROZEN_ALWAYS = ${JSON.stringify(gameSettings.frozenTasks || [])};

    function enforceFrozen() {
        if (!FROZEN_ALWAYS.length) return;
        try {
            const current = JSON.parse(localStorage.getItem('fadd_frozen_tasks') || '[]');
            const set = new Set(current);
            let changed = false;
            FROZEN_ALWAYS.forEach(t => {
                if (!set.has(t)) { set.add(t); changed = true; }
            });
            if (changed) {
                localStorage.setItem('fadd_frozen_tasks', JSON.stringify([...set]));
                console.log('[bot-patch] восстановили frozen:', [...set]);
            }
        } catch(e) {}
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(enforceFrozen, 100);
            setTimeout(enforceFrozen, 1000);
        });
    } else {
        setTimeout(enforceFrozen, 100);
        setTimeout(enforceFrozen, 1000);
    }

    // Перехватываем localStorage.setItem чтобы frozen не терял нужные задачи
    const _origSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
        if (key === 'fadd_frozen_tasks' && FROZEN_ALWAYS.length) {
            try {
                const arr = JSON.parse(value || '[]');
                const set = new Set(arr);
                FROZEN_ALWAYS.forEach(t => set.add(t));
                value = JSON.stringify([...set]);
            } catch(e) {}
        }
        return _origSet(key, value);
    };

    console.log('[bot-patch] перехват frozen_tasks активен');
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

    await context.addInitScript({ content: INIT_BEFORE });
    await context.addInitScript({ content: fs.readFileSync(path.join(__dirname, 'userscript.js'), 'utf8') });
    await context.addInitScript({ content: INIT_AFTER });

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
