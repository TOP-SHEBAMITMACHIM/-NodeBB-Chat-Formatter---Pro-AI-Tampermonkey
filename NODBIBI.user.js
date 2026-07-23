// ==UserScript==
// @name         NodeBB Chat Formatter - Pro (V2.6 - AI Format)
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description   הוספת סרגל כפתורי עיצוב לחלון הצ'אט בפורומי NodeBB - כולל עיצוב אוטומטי ע"י AI - עובד בכמה אתרים
// @author       טופ שבמתמחים
// @match        *://*.mitmachim.top/*
// @match        *://mitmachim.top/*
// @match        *://bnebrak.com/*
// @match        *://otzaria.org/*
// @match        *https://forum-gabai.onrender.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @license      MIT
// @updateURL   https://raw.githubusercontent.com/TOP-SHEBAMITMACHIM/-NodeBB-Chat-Formatter---Pro-AI-Tampermonkey/main/NODBIBI.user.js
// @downloadURL https://raw.githubusercontent.com/TOP-SHEBAMITMACHIM/-NodeBB-Chat-Formatter---Pro-AI-Tampermonkey/main/NODBIBI.user.js
// ==/UserScript==

(function() {
    'use strict';

    // ─── עדכון מפתח API דרך תפריט Tampermonkey ────────────────────────────────

    function updateApiKey() {
        const currentKey = GM_getValue('gemini_api_key', '');
        const masked = currentKey ? (currentKey.slice(0, 4) + '••••' + currentKey.slice(-4)) : 'לא הוגדר';
        const newKey = prompt('מפתח API נוכחי: ' + masked + '\nהזן מפתח API חדש של Gemini (השאר ריק כדי לבטל):', '');
        if (newKey === null) return; // המשתמש ביטל
        if (newKey.trim() === '') return;
        GM_setValue('gemini_api_key', newKey.trim());
        alert('מפתח ה-API עודכן בהצלחה!');
    }

    if (typeof GM_registerMenuCommand !== 'undefined') {
        GM_registerMenuCommand('🔑 עדכן מפתח API של Gemini', updateApiKey);
    }

    const buttonsConfig = [
        { id: 'bold',       icon: 'fa-bold',       prefix: '**',    suffix: '**',   defaultText: 'מודגש',        title: 'מודגש' },
        { id: 'italic',     icon: 'fa-italic',     prefix: '*',     suffix: '*',    defaultText: 'נטוי',         title: 'נטוי' },
        { id: 'inline_code',icon: 'fa-terminal',   prefix: '`',     suffix: '`',    defaultText: 'קוד',          title: 'קוד בשורה' },
        { id: 'code_block', icon: 'fa-code',       prefix: '```\n', suffix: '\n```',defaultText: 'הכנס קוד כאן', title: 'בלוק קוד' },
        { id: 'link',       icon: 'fa-link',       prefix: '[',     suffix: ']',    defaultText: 'טקסט קישור',   title: 'קישור',  isLink: true },
        { id: 'image',      icon: 'fa-image',      prefix: '![',    suffix: ']',    defaultText: 'תיאור תמונה',  title: 'תמונה',  isLink: true },
        { id: 'list',       icon: 'fa-list',       prefix: '• ',    suffix: '',     defaultText: 'פריט רשימה',   title: 'רשימה',  isList: true },
        { id: 'center',     icon: 'fa-align-center',prefix: '|-',   suffix: '-|',   defaultText: 'מרכוז',        title: 'מרכוז' },
        { id: 'spoiler',    icon: 'fa-eye-slash',  prefix: '||',    suffix: '||',   defaultText: 'ספויילר',      title: 'ספוילר' },
        { id: 'anchor',     icon: 'fa-anchor',     prefix: '#anchor(', suffix: ')', defaultText: 'כותרת',        title: 'עוגן' }
    ];

    // placeholder מוגדר שניתן לסמן מיד בהדבקה
    const URL_PLACEHOLDER = 'כתובת_כאן';

    function insertFormatting(input, config) {
        const start = input.selectionStart;
        const end   = input.selectionEnd;
        const selectedText = input.value.substring(start, end);
        const hadSelection = selectedText.length > 0;

        let innerText    = selectedText || config.defaultText;
        let formattedText = '';

        // אחרי ההכנסה — מה לסמן?
        // selectStart/selectEnd יחסי לתחילת formattedText
        let selectStart = null;
        let selectEnd   = null;

        if (config.isLink) {
            // [טקסט קישור](כתובת_כאן)
            formattedText = config.prefix + innerText + '](' + URL_PLACEHOLDER + ')';

            // תמיד סמן את כתובת_כאן — בין אם היה טקסט מסומן מראש ובין אם לא
            const urlOffset = config.prefix.length + innerText.length + 2; // אחרי "]("
            selectStart = start + urlOffset;
            selectEnd   = selectStart + URL_PLACEHOLDER.length;

        } else if (config.isList) {
            if (selectedText) {
                const lines = selectedText.split('\n');
                formattedText = lines.map(line => '• ' + line).join('\n');
            } else {
                formattedText = '• ' + innerText;
                selectStart = start + 2; // אחרי "• "
                selectEnd   = selectStart + innerText.length;
            }

        } else if (config.isQuote) {
            if (selectedText) {
                const lines = selectedText.split('\n');
                formattedText = lines.map(line => '> ' + line).join('\n');
            } else {
                formattedText = '> ' + innerText;
                selectStart = start + 2; // אחרי "> "
                selectEnd   = selectStart + innerText.length;
            }

        } else if (config.isHeading) {
            // כותרת חלה רק על השורה הראשונה של הבחירה (או שורה בודדת)
            if (selectedText) {
                const firstLine = selectedText.split('\n')[0];
                formattedText = config.prefix + selectedText;
                selectStart = start + config.prefix.length;
                selectEnd   = selectStart + firstLine.length;
            } else {
                formattedText = config.prefix + innerText;
                selectStart = start + config.prefix.length; // אחרי "### "
                selectEnd   = selectStart + innerText.length;
            }

        } else {
            formattedText = config.prefix + innerText + config.suffix;

            if (!hadSelection) {
                // סמן את ה-defaultText בתוך הפורמט
                selectStart = start + config.prefix.length;
                selectEnd   = selectStart + innerText.length;
            }
            // אם היה selectedText — לא צריך לסמן שוב, הסמן נשאר בסוף
        }

        // הכנסה
        input.setRangeText(formattedText, start, end, 'end');

        // סימון הפלייסהולדר / defaultText
        if (selectStart !== null) {
            input.setSelectionRange(selectStart, selectEnd);
        }

        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function insertHeading(input, level) {
        const prefix = '#'.repeat(level) + ' ';
        const start = input.selectionStart;
        const end   = input.selectionEnd;
        const selectedText = input.value.substring(start, end);
        const innerText = selectedText || ('כותרת ' + level);

        let formattedText;
        let selectStart, selectEnd;

        if (selectedText) {
            const firstLine = selectedText.split('\n')[0];
            formattedText = prefix + selectedText;
            selectStart = start + prefix.length;
            selectEnd   = selectStart + firstLine.length;
        } else {
            formattedText = prefix + innerText;
            selectStart = start + prefix.length;
            selectEnd   = selectStart + innerText.length;
        }

        input.setRangeText(formattedText, start, end, 'end');
        input.setSelectionRange(selectStart, selectEnd);
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function createHeadingDropdown(textarea) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-block;flex-shrink:0;';

        const toggleBtn = document.createElement('button');
        toggleBtn.type      = 'button';
        toggleBtn.title     = 'כותרות';
        toggleBtn.className = 'chat-format-btn';
        toggleBtn.innerHTML = '<i class="fa fa-header"></i>';
        toggleBtn.style.cssText = 'background:white;border:1px solid #ddd;cursor:pointer;color:#666;font-size:12px;padding:3px 5px;border-radius:2px;transition:all 0.2s;min-width:24px;height:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0;';

        toggleBtn.addEventListener('mouseover', () => { toggleBtn.style.background = '#007bff'; toggleBtn.style.color = 'white'; toggleBtn.style.borderColor = '#007bff'; });
        toggleBtn.addEventListener('mouseout',  () => { toggleBtn.style.background = 'white';   toggleBtn.style.color = '#666';  toggleBtn.style.borderColor = '#ddd'; });

        // הפאנל מצורף ל-body (לא לטולבר) כדי שלא ייחתך ע"י overflow הטולבר
        const panel = document.createElement('div');
        panel.className = 'chat-heading-panel';
        panel.style.cssText = 'display:none;position:fixed;background:white;border:1px solid #ddd;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.18);z-index:99999;min-width:110px;overflow-y:auto;overflow-x:hidden;direction:rtl;';

        const ITEM_HEIGHT = 32; // px - גובה קבוע לכל שורה
        const VISIBLE_ITEMS = 2; // כמה שורות מוצגות בבת אחת לפני גלילה
        panel.style.maxHeight = (ITEM_HEIGHT * VISIBLE_ITEMS) + 'px';

        const headingLevels = [1, 2, 3, 4];

        headingLevels.forEach(level => {
            const item = document.createElement('div');
            item.textContent = 'כותרת ' + level;
            item.style.cssText = `height:${ITEM_HEIGHT}px;line-height:${ITEM_HEIGHT}px;padding:0 14px;box-sizing:border-box;cursor:pointer;font-size:13px;font-weight:500;color:#333;white-space:nowrap;`;
            item.addEventListener('mouseover', () => { item.style.background = '#f0f6ff'; });
            item.addEventListener('mouseout',  () => { item.style.background = 'white'; });
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                insertHeading(textarea, level);
                closePanel();
            });
            panel.appendChild(item);
        });

        function positionPanel() {
            const rect = toggleBtn.getBoundingClientRect();
            panel.style.top  = (rect.bottom + 4) + 'px';
            panel.style.left = Math.max(4, rect.left) + 'px';
        }

        function closePanel() {
            panel.style.display = 'none';
        }

        function openPanel() {
            document.querySelectorAll('.chat-heading-panel').forEach(p => p.style.display = 'none');
            positionPanel();
            panel.style.display = 'block';
        }

        toggleBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = panel.style.display === 'block';
            isOpen ? closePanel() : openPanel();
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target) && !panel.contains(e.target)) closePanel();
        });
        window.addEventListener('scroll', (e) => {
            if (panel.contains(e.target)) return; // גלילה בתוך הפאנל עצמו - לא לסגור
            closePanel();
        }, true);
        window.addEventListener('resize', closePanel);

        document.body.appendChild(panel);
        wrapper.appendChild(toggleBtn);
        return wrapper;
    }

    // ─── AI Formatting ───────────────────────────────────────────────────────

    async function formatWithAI(textarea, aiBtn) {
        // מצב פעיל -> ביטול (Undo)
        if (aiBtn.dataset.aiActive === "true") {
            if (textarea.dataset.originalText !== undefined) {
                textarea.value = textarea.dataset.originalText;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
            }
            aiBtn.dataset.aiActive = "false";
            aiBtn.querySelector('i').style.color = '';
            aiBtn.title = 'עיצוב אוטומטי באמצעות AI';
            return;
        }

        const originalText = textarea.value.trim();
        if (!originalText) {
            alert('אנא כתוב קודם טקסט בתיבת הצ\'אט.');
            return;
        }

        let apiKey = GM_getValue('gemini_api_key');
        if (!apiKey) {
            apiKey = prompt('אנא הזן את מפתח ה-API של Gemini שלך:');
            if (!apiKey) return;
            GM_setValue('gemini_api_key', apiKey);
        }

        textarea.dataset.originalText = textarea.value;

        const icon = aiBtn.querySelector('i');
        let spinnerAnimation;
        if (icon) {
            spinnerAnimation = icon.animate(
                [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }],
                { duration: 1000, iterations: Infinity }
            );
        }
        aiBtn.style.opacity = '0.5';
        aiBtn.style.pointerEvents = 'none';

        const promptText = `קבל את הטקסט הבא והוסף לו עיצוב Markdown.
חוקים נוקשים:
1. אסור לשנות אף מילה מהטקסט המקורי.
2. מותר רק להוסיף תגיות עיצוב (כמו כותרות #, הדגשות **, רשימות -, ובלוקים של קוד).
3. אם חסר פיסוק, אל תוסיף מילים, רק נקודות או פסיקים היכן שצריך.

הטקסט:
${originalText}`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: "אתה כלי טכני בלבד שממיר טקסט רגיל ל-Markdown. עליך לשמור על 100% מהתוכן המקורי. אסור לך להוסיף טקסט משלך, להשמיט מילים, או לשנות ניסוח. החזר אך ורק את קוד ה-Markdown המעוצב ללא כל הקדמה." }]
                    },
                    contents: [{ parts: [{ text: promptText }] }],
                    generationConfig: { temperature: 0.0 }
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                let aiResult = data.candidates[0].content.parts[0].text;
                aiResult = aiResult.replace(/^```(markdown|md)?\n?/i, '').replace(/\n?```$/i, '');

                textarea.value = aiResult;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

                aiBtn.dataset.aiActive = "true";
                if (icon) icon.style.color = '#007bff';
                aiBtn.title = 'ביטול עיצוב AI וחזרה לטקסט המקורי';
            } else {
                throw new Error(data.error?.message || 'שגיאה לא ידועה.');
            }
        } catch (error) {
            alert('שגיאה: ' + error.message);
            if (error.message.includes('API key')) GM_setValue('gemini_api_key', '');
        } finally {
            if (spinnerAnimation) spinnerAnimation.cancel();
            aiBtn.style.opacity = '1';
            aiBtn.style.pointerEvents = 'auto';
        }
    }

    // ─── Floating quote button ───────────────────────────────────────────────

    function addQuoteButtonToSelection() {
        const selection  = window.getSelection();
        const selectedText = selection.toString().trim();

        if (!selectedText || selectedText.length < 3) {
            const existingBtn = document.getElementById('floating-quote-btn');
            if (existingBtn) existingBtn.remove();
            return;
        }

        const chatTextarea = document.querySelector('textarea[component="chat/input"]');
        if (!chatTextarea) {
            const existingBtn = document.getElementById('floating-quote-btn');
            if (existingBtn) existingBtn.remove();
            return;
        }

        const range = selection.getRangeAt(0);
        const selectedElement = range.commonAncestorContainer.parentElement;

        if (selectedElement.closest('textarea') || selectedElement.closest('.chat-input')) {
            const existingBtn = document.getElementById('floating-quote-btn');
            if (existingBtn) existingBtn.remove();
            return;
        }

        let quoteBtn = document.getElementById('floating-quote-btn');
        if (!quoteBtn) {
            quoteBtn = document.createElement('button');
            quoteBtn.id = 'floating-quote-btn';
            quoteBtn.innerHTML = '<i class="fa fa-quote-left"></i> ציטוט';
            quoteBtn.style.cssText = `
                position: fixed;
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                z-index: 10000;
                font-size: 12px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transition: all 0.2s;
                font-family: Arial, sans-serif;
            `;

            quoteBtn.addEventListener('mouseover', () => { quoteBtn.style.background = '#0056b3'; });
            quoteBtn.addEventListener('mouseout',  () => { quoteBtn.style.background = '#007bff'; });

            quoteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const textarea = document.querySelector('textarea[component="chat/input"]');
                if (textarea) {
                    const currentValue = textarea.value;
                    const lines = selectedText.split('\n');
                    const quotedText = lines.map(line => '> ' + line).join('\n');
                    textarea.value = currentValue + (currentValue ? '\n' : '') + quotedText;
                    textarea.focus();
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    quoteBtn.remove();
                    window.getSelection().removeAllRanges();
                }
            });

            document.body.appendChild(quoteBtn);
        }

        const rect = range.getBoundingClientRect();
        quoteBtn.style.top  = (rect.bottom + 10) + 'px';
        quoteBtn.style.left = (rect.left + rect.width / 2 - 40) + 'px';
    }

    document.addEventListener('mouseup',  addQuoteButtonToSelection);
    document.addEventListener('touchend', addQuoteButtonToSelection);

    // ─── Toolbar creation ────────────────────────────────────────────────────

    function createToolbar(textarea) {
        if (!textarea.getAttribute('component') || textarea.getAttribute('component') !== 'chat/input') return;

        const parent = textarea.parentNode;
        if (!parent || parent.querySelector('.chat-pro-toolbar')) return;

        const toolbar = document.createElement('div');
        toolbar.className = 'chat-pro-toolbar';
        toolbar.style.cssText = 'display:flex;gap:4px;padding:3px 4px;background:transparent;border-bottom:1px solid #eee;margin-bottom:3px;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;direction:rtl;scrollbar-width:thin;max-width:100%;';

        buttonsConfig.forEach(btnInfo => {
            const btn = document.createElement('button');
            btn.type      = 'button';
            btn.title     = btnInfo.title;
            btn.className = 'chat-format-btn';
            btn.innerHTML = '<i class="fa ' + btnInfo.icon + '"></i>';
            btn.style.cssText = 'background:white;border:1px solid #ddd;cursor:pointer;color:#666;font-size:12px;padding:3px 5px;border-radius:2px;transition:all 0.2s;min-width:24px;height:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0;';

            btn.addEventListener('mouseover', () => { btn.style.background = '#007bff'; btn.style.color = 'white'; btn.style.borderColor = '#007bff'; });
            btn.addEventListener('mouseout',  () => { btn.style.background = 'white';   btn.style.color = '#666';  btn.style.borderColor = '#ddd'; });

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                insertFormatting(textarea, btnInfo);
            });

            toolbar.appendChild(btn);

            if (btnInfo.id === 'italic') {
                toolbar.appendChild(createHeadingDropdown(textarea));
            }
        });

        // ─── כפתור AI ───
        const aiBtn = document.createElement('button');
        aiBtn.type      = 'button';
        aiBtn.title     = 'עיצוב אוטומטי באמצעות AI';
        aiBtn.className = 'chat-format-btn chat-ai-btn';
        aiBtn.dataset.aiActive = "false";
        aiBtn.innerHTML = '<i class="fa fa-magic"></i>';
        aiBtn.style.cssText = 'background:white;border:1px solid #ddd;cursor:pointer;color:#666;font-size:12px;padding:3px 5px;border-radius:2px;transition:all 0.2s;min-width:24px;height:24px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:6px;';

        aiBtn.addEventListener('mouseover', () => {
            if (aiBtn.dataset.aiActive !== "true") {
                aiBtn.style.background = '#007bff';
                aiBtn.style.color = 'white';
                aiBtn.style.borderColor = '#007bff';
            }
        });
        aiBtn.addEventListener('mouseout', () => {
            if (aiBtn.dataset.aiActive !== "true") {
                aiBtn.style.background = 'white';
                aiBtn.style.color = '#666';
                aiBtn.style.borderColor = '#ddd';
            }
        });

        aiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            formatWithAI(textarea, aiBtn);
        });

        // איפוס מצב אם המשתמש מוחק הכל ידנית
        textarea.addEventListener('input', () => {
            if (textarea.value.trim() === "" && aiBtn.dataset.aiActive === "true") {
                aiBtn.dataset.aiActive = "false";
                const icon = aiBtn.querySelector('i');
                if (icon) icon.style.color = '';
                aiBtn.title = 'עיצוב אוטומטי באמצעות AI';
                textarea.dataset.originalText = "";
            }
        });

        toolbar.appendChild(aiBtn);

        parent.insertBefore(toolbar, textarea);
        console.log('✅ סרגל עיצוב (כולל AI) התווסף בהצלחה!');
    }

    // ─── Scan & observe ──────────────────────────────────────────────────────

    function scanForTextareas() {
        document.querySelectorAll('textarea[component="chat/input"]').forEach(textarea => {
            if (textarea && textarea.parentNode) createToolbar(textarea);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scanForTextareas);
    } else {
        scanForTextareas();
    }

    setInterval(scanForTextareas, 1000);

    const observer = new MutationObserver(scanForTextareas);
    observer.observe(document.body, { childList: true, subtree: true, attributes: false });

    console.log('🚀 NodeBB Chat Formatter v2.5 (AI) - מופעל!');

})();
