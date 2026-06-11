(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════
  // Configurable Parameters (CDP/CI can override before page load)
  // ═══════════════════════════════════════════════════════
  const CFG = Object.assign({
    scrollDuration: 2000,
    canvasDuration: 3000,
    canvasBalls: 1000,
    stressMemIterations: 50,
    stressMemDelay: 100,
    stressIframeCount: 50,
    stressDomCount: 50000,
    stressCanvasCount: 3000,
    stressTimeout: 15000,
  }, window.__KERNEL_TEST_CONFIG__ || {});

  // ═══════════════════════════════════════════════════════
  // Tab Switching
  // ═══════════════════════════════════════════════════════
  const tabs = document.querySelectorAll('.kt-tab');
  const panels = document.querySelectorAll('.kt-panel');
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('panel-' + t.dataset.tab).classList.add('active');
  }));

  // ═══════════════════════════════════════════════════════
  // State
  // ═══════════════════════════════════════════════════════
  let totalTests = 0, completed = 0, passed = 0, failed = 0, unsupported = 0;
  let isRunning = false;
  const results = { basic: {}, performance: {}, storage: {}, media: {}, stress: {} };

  function resetState() {
    totalTests = 0; completed = 0; passed = 0; failed = 0; unsupported = 0;
    Object.keys(results).forEach(k => results[k] = {});
  }

  function updateUI() {
    document.getElementById('sTotal').textContent = totalTests;
    document.getElementById('sPass').textContent = passed;
    document.getElementById('sFail').textContent = failed;
    const pct = totalTests > 0 ? (completed / totalTests * 100) : 0;
    document.getElementById('progressFill').style.width = pct + '%';
  }

  function setRowValue(id, val, cls) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = val;
    el.className = 'kt-row-val ' + (cls || '');
  }

  function markPass(tab, id, val) {
    results[tab][id] = val || 'PASS';
    setRowValue('v-' + id, val || 'PASS', val ? 'metric' : 'pass');
    completed++; passed++; updateUI(); syncOutput();
  }
  function markFail(tab, id, reason) {
    results[tab][id] = reason || 'FAIL';
    setRowValue('v-' + id, reason || 'FAIL', 'fail');
    completed++; failed++; updateUI(); syncOutput();
  }
  function markUnsupported(tab, id) {
    results[tab][id] = 'N/A';
    setRowValue('v-' + id, 'N/A', 'unsupported');
    completed++; unsupported++; updateUI(); syncOutput();
  }
  function markRunning(id) { setRowValue('v-' + id, 'RUNNING...', 'running'); }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  function setButtons(disabled) {
    isRunning = disabled;
    document.getElementById('btnRunAll').disabled = disabled;
    document.querySelectorAll('[data-run]').forEach(b => b.disabled = disabled);
  }

  function syncOutput() {
    const info = parseBrowserInfo();
    const output = {
      timestamp: new Date().toISOString(),
      ua: navigator.userAgent,
      browser: { chromium: info.Chromium, android: info.Android, cpu: navigator.hardwareConcurrency, memory: (navigator.deviceMemory||'N/A')+'GB' },
      summary: { total: totalTests, pass: passed, fail: failed, unsupported: unsupported, completed: completed },
      config: CFG,
      tabs: results
    };
    window.__KERNEL_TEST_RESULT__ = output;
    try { localStorage.setItem('kernel_test_result', JSON.stringify(output)); } catch(e) {}
  }

  function withTimeout(fn, ms) {
    return Promise.race([
      fn(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))
    ]);
  }

  // ═══════════════════════════════════════════════════════
  // Browser Info
  // ═══════════════════════════════════════════════════════
  function parseBrowserInfo() {
    const ua = navigator.userAgent;
    const chromiumMatch = ua.match(/Chrom(?:e|ium)\/(\d+)/);
    const androidMatch = ua.match(/Android (\d+[\.\d]*)/);
    const info = {
      'User Agent': ua,
      'Chromium': chromiumMatch ? chromiumMatch[1] : 'N/A',
      'Android': androidMatch ? androidMatch[1] : 'N/A',
      'Platform': navigator.platform,
      'Language': navigator.language,
      'CPU Cores': navigator.hardwareConcurrency || 'N/A',
      'Device Memory': navigator.deviceMemory ? navigator.deviceMemory + ' GB' : 'N/A',
      'Cookie Enabled': navigator.cookieEnabled ? 'Yes' : 'No',
    };
    const container = document.getElementById('browserInfo');
    container.innerHTML = Object.entries(info).map(([k,v]) =>
      `<div class="kt-info-item"><div class="kt-info-label">${k}</div><div class="kt-info-value">${v}</div></div>`
    ).join('');
    return info;
  }

  // ═══════════════════════════════════════════════════════
  // Test Definitions
  // ═══════════════════════════════════════════════════════

  const BASIC_TESTS = [
    { id: 'localStorage', name: 'LocalStorage', fn: () => { try { localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return true; } catch(e) { return false; } } },
    { id: 'sessionStorage', name: 'SessionStorage', fn: () => { try { sessionStorage.setItem('_t','1'); sessionStorage.removeItem('_t'); return true; } catch(e) { return false; } } },
    { id: 'indexedDB', name: 'IndexedDB', fn: () => typeof indexedDB !== 'undefined' },
    { id: 'fetch', name: 'Fetch API', fn: () => typeof fetch === 'function' },
    { id: 'xhr', name: 'XMLHttpRequest', fn: () => typeof XMLHttpRequest === 'function' },
    { id: 'websocket', name: 'WebSocket', fn: () => typeof WebSocket === 'function' },
    { id: 'worker', name: 'Web Worker', fn: () => typeof Worker !== 'undefined' },
    { id: 'sharedWorker', name: 'SharedWorker', fn: () => typeof SharedWorker !== 'undefined' },
    { id: 'serviceWorker', name: 'ServiceWorker', fn: () => 'serviceWorker' in navigator },
    { id: 'wasm', name: 'WebAssembly', fn: () => typeof WebAssembly !== 'undefined' },
    { id: 'webgl', name: 'WebGL', fn: () => { try { return !!document.createElement('canvas').getContext('webgl'); } catch(e) { return false; } } },
    { id: 'webgl2', name: 'WebGL 2', fn: () => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch(e) { return false; } } },
    { id: 'canvas2d', name: 'Canvas 2D', fn: () => { try { return !!document.createElement('canvas').getContext('2d'); } catch(e) { return false; } } },
    { id: 'offscreen', name: 'OffscreenCanvas', fn: () => typeof OffscreenCanvas !== 'undefined' },
    { id: 'webgpu', name: 'WebGPU', fn: () => 'gpu' in navigator },
    { id: 'webrtc', name: 'WebRTC', fn: () => typeof RTCPeerConnection !== 'undefined' },
    { id: 'crypto', name: 'Web Crypto', fn: () => !!(window.crypto && window.crypto.subtle) },
    { id: 'intersectionObs', name: 'IntersectionObserver', fn: () => typeof IntersectionObserver !== 'undefined' },
    { id: 'resizeObs', name: 'ResizeObserver', fn: () => typeof ResizeObserver !== 'undefined' },
    { id: 'mutationObs', name: 'MutationObserver', fn: () => typeof MutationObserver !== 'undefined' },
    { id: 'broadcastCh', name: 'BroadcastChannel', fn: () => typeof BroadcastChannel !== 'undefined' },
    { id: 'sharedBuf', name: 'SharedArrayBuffer', fn: () => typeof SharedArrayBuffer !== 'undefined' },
    { id: 'notification', name: 'Notification', fn: () => typeof Notification !== 'undefined' },
    { id: 'geolocation', name: 'Geolocation', fn: () => 'geolocation' in navigator },
    { id: 'mediaRecorder', name: 'MediaRecorder', fn: () => typeof MediaRecorder !== 'undefined' },
    { id: 'perfObserver', name: 'PerformanceObserver', fn: () => typeof PerformanceObserver !== 'undefined' },
  ];

  const PERF_JS_TESTS = [
    { id: 'jsLoop', name: 'Math.sqrt 10M iterations' },
    { id: 'jsonParse', name: 'JSON parse/stringify (1MB)' },
    { id: 'regexBench', name: 'Regex 100K matches' },
  ];
  const PERF_DOM_TESTS = [
    { id: 'domCreate', name: 'Create 10000 DIVs' },
    { id: 'domDelete', name: 'Delete 10000 DIVs' },
    { id: 'domQuery', name: 'querySelectorAll 10000x' },
  ];
  const PERF_RENDER_TESTS = [
    { id: 'scrollFps', name: 'Scroll FPS (long list)' },
    { id: 'canvasFps', name: 'Canvas ' + CFG.canvasBalls + ' balls FPS' },
  ];

  const STORAGE_TESTS = [
    { id: 'lsWrite', name: 'localStorage Write 1000' },
    { id: 'lsRead', name: 'localStorage Read 1000' },
    { id: 'lsDelete', name: 'localStorage Delete 1000' },
    { id: 'ssWrite', name: 'sessionStorage Write' },
    { id: 'idbWrite', name: 'IndexedDB Write 100' },
    { id: 'idbRead', name: 'IndexedDB Read 100' },
    { id: 'cookie', name: 'Cookie Read/Write' },
  ];

  const MEDIA_CODEC_TESTS = [
    { id: 'h264', name: 'Video H.264' },
    { id: 'vp9', name: 'Video VP9' },
    { id: 'h265', name: 'Video H.265/HEVC' },
    { id: 'av1', name: 'Video AV1' },
    { id: 'aac', name: 'Audio AAC' },
    { id: 'opus', name: 'Audio Opus' },
  ];
  const MEDIA_GFX_TESTS = [
    { id: 'gfxWebgl', name: 'WebGL Render' },
    { id: 'gfxWebgl2', name: 'WebGL2 Render' },
    { id: 'gfxCanvas', name: 'Canvas 2D Render' },
    { id: 'gfxWebrtc', name: 'WebRTC DataChannel' },
  ];

  const STRESS_TESTS = [
    { id: 'memPressure', name: 'Memory Pressure (' + Math.round(CFG.stressMemIterations * CFG.stressMemDelay / 1000) + 's)' },
    { id: 'iframePressure', name: 'Create ' + CFG.stressIframeCount + ' iframes' },
    { id: 'domPressure', name: 'Create ' + CFG.stressDomCount + ' DOM nodes' },
    { id: 'canvasPressure', name: 'Canvas ' + CFG.stressCanvasCount + ' objects' },
  ];

  // ═══════════════════════════════════════════════════════
  // Render Test Rows
  // ═══════════════════════════════════════════════════════
  function renderRows(containerId, tests) {
    const el = document.getElementById(containerId);
    el.innerHTML = tests.map(t =>
      `<div class="kt-row"><span class="kt-row-name">${t.name}</span><span class="kt-row-val waiting" id="v-${t.id}">--</span></div>`
    ).join('');
  }

  function initUI() {
    parseBrowserInfo();
    renderRows('basicTests', BASIC_TESTS);
    renderRows('perfJsTests', PERF_JS_TESTS);
    renderRows('perfDomTests', PERF_DOM_TESTS);
    renderRows('perfRenderTests', PERF_RENDER_TESTS);
    renderRows('storageTests', STORAGE_TESTS);
    renderRows('mediaCodecTests', MEDIA_CODEC_TESTS);
    renderRows('mediaGfxTests', MEDIA_GFX_TESTS);
    renderRows('stressTests', STRESS_TESTS);
  }

  // ═══════════════════════════════════════════════════════
  // Test Runners
  // ═══════════════════════════════════════════════════════

  async function runBasic() {
    for (const t of BASIC_TESTS) {
      markRunning(t.id);
      await delay(30);
      try {
        const r = t.fn();
        if (r) markPass('basic', t.id);
        else markUnsupported('basic', t.id);
      } catch(e) { markUnsupported('basic', t.id); }
    }
  }

  async function runPerformance() {
    markRunning('jsLoop'); await delay(50);
    let t0 = performance.now();
    for (let i = 0; i < 10000000; i++) Math.sqrt(i);
    let ms = Math.round(performance.now() - t0);
    markPass('performance', 'jsLoop', ms + ' ms');

    markRunning('jsonParse'); await delay(50);
    const bigObj = {}; for (let i = 0; i < 10000; i++) bigObj['key_' + i] = 'value_' + Math.random();
    t0 = performance.now();
    const str = JSON.stringify(bigObj); JSON.parse(str);
    ms = Math.round(performance.now() - t0);
    markPass('performance', 'jsonParse', ms + ' ms');

    markRunning('regexBench'); await delay(50);
    const re = /(\d+)-(\w+)/g;
    const testStr = '123-abc '.repeat(100000);
    t0 = performance.now(); testStr.match(re);
    ms = Math.round(performance.now() - t0);
    markPass('performance', 'regexBench', ms + ' ms');

    markRunning('domCreate'); await delay(50);
    const frag = document.createDocumentFragment();
    t0 = performance.now();
    for (let i = 0; i < 10000; i++) { const d = document.createElement('div'); d.textContent = i; frag.appendChild(d); }
    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:0;';
    document.body.appendChild(container);
    container.appendChild(frag);
    ms = Math.round(performance.now() - t0);
    markPass('performance', 'domCreate', ms + ' ms');

    markRunning('domDelete'); await delay(50);
    t0 = performance.now(); container.innerHTML = '';
    ms = Math.round(performance.now() - t0);
    document.body.removeChild(container);
    markPass('performance', 'domDelete', ms + ' ms');

    markRunning('domQuery'); await delay(50);
    const qc = document.createElement('div');
    qc.style.cssText = 'position:absolute;left:-9999px;';
    for (let i = 0; i < 100; i++) { const s = document.createElement('span'); s.className = 'test-q'; qc.appendChild(s); }
    document.body.appendChild(qc);
    t0 = performance.now();
    for (let i = 0; i < 10000; i++) qc.querySelectorAll('.test-q');
    ms = Math.round(performance.now() - t0);
    document.body.removeChild(qc);
    markPass('performance', 'domQuery', ms + ' ms');

    markRunning('scrollFps'); await delay(50);
    const scrollBox = document.createElement('div');
    scrollBox.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;overflow:auto;z-index:-1;opacity:0;';
    for (let i = 0; i < 5000; i++) { const d = document.createElement('div'); d.style.height='30px'; d.textContent='Item '+i; scrollBox.appendChild(d); }
    document.body.appendChild(scrollBox);
    let frames = 0, scrollStart = performance.now();
    const dur = CFG.scrollDuration;
    const scrollRaf = () => { frames++; if (performance.now() - scrollStart < dur) requestAnimationFrame(scrollRaf); };
    requestAnimationFrame(scrollRaf);
    const scrollInterval = setInterval(() => { scrollBox.scrollTop += 200; }, 16);
    await delay(dur);
    clearInterval(scrollInterval);
    const fps = Math.round(frames / (dur / 1000));
    document.body.removeChild(scrollBox);
    markPass('performance', 'scrollFps', fps + ' fps');

    markRunning('canvasFps');
    const canvasBox = document.getElementById('canvasBox');
    const canvas = document.getElementById('fpsCanvas');
    canvasBox.style.display = 'block';
    canvas.width = canvasBox.clientWidth; canvas.height = 200;
    const ctx = canvas.getContext('2d');
    const balls = [];
    for (let i = 0; i < CFG.canvasBalls; i++) balls.push({ x: Math.random()*canvas.width, y: Math.random()*canvas.height, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, r: 3+Math.random()*4, c: `hsl(${Math.random()*360},70%,60%)` });
    let cFrames = 0; const cStart = performance.now(); let running = true;
    const cdur = CFG.canvasDuration;
    const animate = () => {
      if (!running) return;
      ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);
      for (const b of balls) {
        b.x += b.vx; b.y += b.vy;
        if (b.x < 0 || b.x > canvas.width) b.vx *= -1;
        if (b.y < 0 || b.y > canvas.height) b.vy *= -1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.fillStyle = b.c; ctx.fill();
      }
      cFrames++; requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
    await delay(cdur);
    running = false;
    const cFps = Math.round(cFrames / (cdur / 1000));
    canvasBox.style.display = 'none';
    markPass('performance', 'canvasFps', cFps + ' fps');
  }

  async function runStorage() {
    markRunning('lsWrite'); await delay(30);
    try { let t0 = performance.now(); for (let i=0;i<1000;i++) localStorage.setItem('_kt'+i,'v'+i); let ms=Math.round(performance.now()-t0); markPass('storage','lsWrite',ms+' ms'); } catch(e) { markFail('storage','lsWrite'); }

    markRunning('lsRead'); await delay(30);
    try { let t0=performance.now(); for(let i=0;i<1000;i++) localStorage.getItem('_kt'+i); let ms=Math.round(performance.now()-t0); markPass('storage','lsRead',ms+' ms'); } catch(e) { markFail('storage','lsRead'); }

    markRunning('lsDelete'); await delay(30);
    try { let t0=performance.now(); for(let i=0;i<1000;i++) localStorage.removeItem('_kt'+i); let ms=Math.round(performance.now()-t0); markPass('storage','lsDelete',ms+' ms'); } catch(e) { markFail('storage','lsDelete'); }

    markRunning('ssWrite'); await delay(30);
    try { let t0=performance.now(); for(let i=0;i<1000;i++) sessionStorage.setItem('_kt'+i,'v'); for(let i=0;i<1000;i++) sessionStorage.removeItem('_kt'+i); let ms=Math.round(performance.now()-t0); markPass('storage','ssWrite',ms+' ms'); } catch(e) { markFail('storage','ssWrite'); }

    markRunning('idbWrite'); await delay(30);
    try {
      await new Promise((res, rej) => { const r = indexedDB.deleteDatabase('_ktTest'); r.onsuccess = res; r.onerror = res; r.onblocked = res; });
      const db = await new Promise((res,rej) => { const r=indexedDB.open('_ktTest',1); r.onupgradeneeded=e=>e.target.result.createObjectStore('s',{keyPath:'id'}); r.onsuccess=()=>res(r.result); r.onerror=rej; });
      let t0=performance.now();
      const tx=db.transaction('s','readwrite'); const store=tx.objectStore('s');
      for(let i=0;i<100;i++) store.put({id:i,data:'x'.repeat(100)});
      await new Promise(r=>{tx.oncomplete=r;});
      let ms=Math.round(performance.now()-t0);
      markPass('storage','idbWrite',ms+' ms');

      markRunning('idbRead');
      t0=performance.now();
      const tx2=db.transaction('s','readonly'); const store2=tx2.objectStore('s');
      for(let i=0;i<100;i++) store2.get(i);
      await new Promise(r=>{tx2.oncomplete=r;});
      ms=Math.round(performance.now()-t0);
      markPass('storage','idbRead',ms+' ms');
      db.close();
      indexedDB.deleteDatabase('_ktTest');
    } catch(e) { markFail('storage','idbWrite'); markFail('storage','idbRead'); }

    markRunning('cookie'); await delay(30);
    try { document.cookie='_kt=1;path=/'; const has=document.cookie.includes('_kt=1'); document.cookie='_kt=;expires=Thu,01 Jan 1970 00:00:00 GMT;path=/'; if(has) markPass('storage','cookie'); else markFail('storage','cookie'); } catch(e) { markFail('storage','cookie'); }
  }

  async function runMedia() {
    const v = document.createElement('video');
    const a = document.createElement('audio');

    const codecs = [
      { id:'h264', test: () => v.canPlayType('video/mp4; codecs="avc1.42E01E"') !== '' },
      { id:'vp9', test: () => v.canPlayType('video/webm; codecs="vp9"') !== '' },
      { id:'h265', test: () => v.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"') !== '' || v.canPlayType('video/mp4; codecs="hvc1.1.6.L93.B0"') !== '' },
      { id:'av1', test: () => v.canPlayType('video/mp4; codecs="av01.0.01M.08"') !== '' },
      { id:'aac', test: () => a.canPlayType('audio/mp4; codecs="mp4a.40.2"') !== '' },
      { id:'opus', test: () => a.canPlayType('audio/webm; codecs="opus"') !== '' },
    ];
    for (const c of codecs) {
      markRunning(c.id); await delay(30);
      try { if (c.test()) markPass('media', c.id, 'Supported'); else markUnsupported('media', c.id); }
      catch(e) { markUnsupported('media', c.id); }
    }

    markRunning('gfxWebgl'); await delay(30);
    try { const cv=document.createElement('canvas'); const gl=cv.getContext('webgl'); if(gl){gl.clearColor(1,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT); markPass('media','gfxWebgl');} else markUnsupported('media','gfxWebgl'); } catch(e) { markUnsupported('media','gfxWebgl'); }

    markRunning('gfxWebgl2'); await delay(30);
    try { const cv=document.createElement('canvas'); const gl=cv.getContext('webgl2'); if(gl){gl.clearColor(0,1,0,1);gl.clear(gl.COLOR_BUFFER_BIT); markPass('media','gfxWebgl2');} else markUnsupported('media','gfxWebgl2'); } catch(e) { markUnsupported('media','gfxWebgl2'); }

    markRunning('gfxCanvas'); await delay(30);
    try { const cv=document.createElement('canvas'); const ctx=cv.getContext('2d'); ctx.fillRect(0,0,10,10); markPass('media','gfxCanvas'); } catch(e) { markFail('media','gfxCanvas'); }

    markRunning('gfxWebrtc'); await delay(30);
    try { if(typeof RTCPeerConnection!=='undefined'){const pc=new RTCPeerConnection(); const dc=pc.createDataChannel('test'); dc.close(); pc.close(); markPass('media','gfxWebrtc');} else markUnsupported('media','gfxWebrtc'); } catch(e) { markFail('media','gfxWebrtc'); }
  }

  async function runStress() {
    markRunning('memPressure'); await delay(50);
    try {
      await withTimeout(async () => {
        const arr = [];
        const memStart = performance.memory ? performance.memory.usedJSHeapSize : 0;
        for (let i = 0; i < CFG.stressMemIterations; i++) { arr.push(new Array(100000).fill(Math.random())); await delay(CFG.stressMemDelay); }
        const memEnd = performance.memory ? performance.memory.usedJSHeapSize : 0;
        const memDelta = Math.round((memEnd - memStart) / 1024 / 1024);
        arr.length = 0;
        markPass('stress', 'memPressure', (memDelta > 0 ? '+' + memDelta : memDelta) + ' MB');
      }, CFG.stressTimeout);
    } catch(e) { markFail('stress', 'memPressure', e.message === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR'); }

    markRunning('iframePressure'); await delay(50);
    try {
      await withTimeout(async () => {
        const iframeBox = document.createElement('div');
        iframeBox.style.cssText = 'position:absolute;left:-9999px;top:0;';
        document.body.appendChild(iframeBox);
        let alive = 0;
        for (let i = 0; i < CFG.stressIframeCount; i++) { const f = document.createElement('iframe'); f.srcdoc = '<p>'+i+'</p>'; iframeBox.appendChild(f); alive++; }
        await delay(1000);
        markPass('stress', 'iframePressure', alive + ' alive');
        iframeBox.remove();
      }, CFG.stressTimeout);
    } catch(e) { markFail('stress', 'iframePressure', e.message === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR'); }

    markRunning('domPressure'); await delay(50);
    try {
      await withTimeout(async () => {
        const domBox = document.createElement('div');
        domBox.style.cssText = 'position:absolute;left:-9999px;top:0;';
        document.body.appendChild(domBox);
        const t0 = performance.now();
        for (let i = 0; i < CFG.stressDomCount; i++) { const d = document.createElement('span'); domBox.appendChild(d); }
        const dms = Math.round(performance.now() - t0);
        markPass('stress', 'domPressure', dms + ' ms / ' + (CFG.stressDomCount/1000) + 'K');
        domBox.remove();
      }, CFG.stressTimeout);
    } catch(e) { markFail('stress', 'domPressure', e.message === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR'); }

    markRunning('canvasPressure'); await delay(50);
    try {
      await withTimeout(async () => {
        const cv = document.createElement('canvas'); cv.width=400; cv.height=300;
        const ctx = cv.getContext('2d');
        const ct0 = performance.now();
        for (let i = 0; i < CFG.stressCanvasCount; i++) { ctx.fillStyle = `hsl(${i%360},60%,50%)`; ctx.fillRect(Math.random()*400, Math.random()*300, 5, 5); }
        const cms = Math.round(performance.now() - ct0);
        markPass('stress', 'canvasPressure', cms + ' ms / ' + (CFG.stressCanvasCount/1000) + 'K');
      }, CFG.stressTimeout);
    } catch(e) { markFail('stress', 'canvasPressure', e.message === 'TIMEOUT' ? 'TIMEOUT' : 'ERROR'); }
  }

  // ═══════════════════════════════════════════════════════
  // Orchestration
  // ═══════════════════════════════════════════════════════
  const TAB_COUNTS = {
    basic: () => BASIC_TESTS.length,
    perf: () => PERF_JS_TESTS.length + PERF_DOM_TESTS.length + PERF_RENDER_TESTS.length,
    storage: () => STORAGE_TESTS.length,
    media: () => MEDIA_CODEC_TESTS.length + MEDIA_GFX_TESTS.length,
    stress: () => STRESS_TESTS.length,
  };
  const TAB_RUNNERS = {
    basic: runBasic, perf: runPerformance, storage: runStorage, media: runMedia, stress: runStress
  };

  function countTests() {
    return Object.values(TAB_COUNTS).reduce((sum, fn) => sum + fn(), 0);
  }

  async function runAll() {
    resetState();
    let totalTests = countTests();
    updateUI();
    document.getElementById('globalStatus').textContent = 'Running...';
    setButtons(true);
    document.getElementById('btnReport').disabled = true;

    await runBasic();
    await runPerformance();
    await runStorage();
    await runMedia();
    await runStress();

    finalize();
  }

  async function runTab(tab) {
    resetState();
    let totalTests = TAB_COUNTS[tab]();
    updateUI();
    document.getElementById('globalStatus').textContent = 'Running ' + tab + '...';
    setButtons(true);
    document.getElementById('btnReport').disabled = true;

    await TAB_RUNNERS[tab]();
    finalize();
  }

  function finalize() {
    document.getElementById('globalStatus').textContent = 'Done ✓';
    setButtons(false);
    syncOutput();
    document.getElementById('btnReport').disabled = false;
  }

  // ═══════════════════════════════════════════════════════
  // Event Bindings
  // ═══════════════════════════════════════════════════════
  document.getElementById('btnRunAll').addEventListener('click', () => { if (!isRunning) runAll(); });
  document.querySelectorAll('[data-run]').forEach(btn => btn.addEventListener('click', () => { if (!isRunning) runTab(btn.dataset.run); }));

  document.getElementById('btnExport').addEventListener('click', () => {
    const d = window.__KERNEL_TEST_RESULT__; if(!d) return;
    const blob = new Blob([JSON.stringify(d,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kernel_test_'+Date.now()+'.json'; a.click();
  });

  document.getElementById('btnCopy').addEventListener('click', () => {
    const d = window.__KERNEL_TEST_RESULT__; if(!d) return;
    const text = JSON.stringify(d,null,2);
    if(navigator.clipboard) navigator.clipboard.writeText(text);
    else { const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    document.getElementById('globalStatus').textContent = 'Copied ✓';
    setTimeout(()=>document.getElementById('globalStatus').textContent='Done ✓', 1500);
  });

  // ═══════════════════════════════════════════════════════
  // Scoring
  // ═══════════════════════════════════════════════════════
  const SCORE_WEIGHTS = {
    // 核心 5分/项
    localStorage: 5, sessionStorage: 5, indexedDB: 5, fetch: 5,
    websocket: 5, wasm: 5, webgl: 5, canvas2d: 5, crypto: 5,
    // 重要 3分/项
    xhr: 3, worker: 3, webgl2: 3, webrtc: 3, serviceWorker: 3,
    mediaRecorder: 3, intersectionObs: 3, resizeObs: 3, mutationObs: 3,
    // 扩展 1分/项
    sharedWorker: 1, offscreen: 1, webgpu: 1, broadcastCh: 1,
    sharedBuf: 1, notification: 1, geolocation: 1, perfObserver: 1,
  };
  const SCORE_BASE = 20;

  function calcScore(basicResults) {
    if (!basicResults) return null;
    let earned = 0;
    let possible = 0;
    Object.entries(SCORE_WEIGHTS).forEach(([id, w]) => {
      possible += w;
      const val = basicResults[id];
      if (val === 'PASS' || val === 'Supported') earned += w;
    });
    return { score: SCORE_BASE + Math.round((earned / possible) * (100 - SCORE_BASE)), earned, possible };
  }

  function scoreMeta(score) {
    if (score >= 95) return { label: '优秀', sublabel: '可发版', color: '#4ade80', badge: '🟢' };
    if (score >= 85) return { label: '良好', sublabel: '关注失分项', color: '#f5a623', badge: '🟡' };
    if (score >= 70) return { label: '待改进', sublabel: '需评估影响', color: '#fb923c', badge: '🟠' };
    return { label: '不通过', sublabel: '阻塞升核', color: '#ff5555', badge: '🔴' };
  }

  // ═══════════════════════════════════════════════════════
  // Report Generation
  // ═══════════════════════════════════════════════════════
  function generateReport() {
    const d = window.__KERNEL_TEST_RESULT__;
    if (!d) return;

    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    const testMap = {};
    [BASIC_TESTS, PERF_JS_TESTS, PERF_DOM_TESTS, PERF_RENDER_TESTS, STORAGE_TESTS, MEDIA_CODEC_TESTS, MEDIA_GFX_TESTS, STRESS_TESTS].forEach(arr => {
      arr.forEach(t => testMap[t.id] = t.name);
    });

    const scoreResult = calcScore(d.tabs.basic);
    const meta = scoreResult ? scoreMeta(scoreResult.score) : null;
    const passRate = d.summary.total > 0 ? Math.round((d.summary.pass / d.summary.total) * 100) : 0;

    const scoreHtml = scoreResult ? `
      <div class="kt-report-score-block" style="border-color:${meta.color}33;background:${meta.color}0d;">
        <div class="kt-report-score-num" style="color:${meta.color};">${scoreResult.score}</div>
        <div class="kt-report-score-info">
          <div class="kt-report-score-label" style="color:${meta.color};">${meta.badge} ${meta.label} — ${meta.sublabel}</div>
          <div class="kt-report-score-sub">API 能力得分 · 满分 100 · 基础分 ${SCORE_BASE}</div>
          <div class="kt-report-score-sub">核心项得分 ${scoreResult.earned} / ${scoreResult.possible} 分</div>
        </div>
        <a href="kernel_test_help.html#scoring" class="kt-report-score-help" target="_blank">评分说明 ↗</a>
      </div>
    ` : '';

    let html = `
      <div class="kt-report-header">
        <h2 class="kt-report-title">WebView 内核测试报告</h2>
        <div class="kt-report-meta">
          时间: ${esc(new Date(d.timestamp).toLocaleString())}<br>
          设备: Chromium ${esc(d.browser.chromium)} / Android ${esc(d.browser.android)}<br>
          系统: CPU ${esc(d.browser.cpu)} cores / Memory ${esc(d.browser.memory)}
        </div>
      </div>
      <div class="kt-report-body">
        ${scoreHtml}
        <div class="kt-report-summary-box">
          <div><span>Total:</span> <strong>${d.summary.total}</strong></div>
          <div><span>Pass:</span> <strong class="val-pass">${d.summary.pass}</strong></div>
          <div><span>Fail:</span> <strong class="val-fail">${d.summary.fail}</strong></div>
          <div><span>Unsupported:</span> <strong>${d.summary.unsupported}</strong></div>
          <div><span>通过率:</span> <strong>${passRate}%</strong></div>
        </div>
    `;

    const sections = [
      { key: 'basic', title: 'Basic (Web API 能力)' },
      { key: 'performance', title: 'Performance (性能基准)' },
      { key: 'storage', title: 'Storage (存储能力)' },
      { key: 'media', title: 'Media (音视频与图形)' },
      { key: 'stress', title: 'Stress (压力测试)' }
    ];

    sections.forEach(sec => {
      const tabResults = d.tabs[sec.key];
      if (!tabResults || Object.keys(tabResults).length === 0) return;

      html += `<h3 class="kt-report-section-title">${sec.title}</h3>`;
      html += `<table class="kt-report-table"><tbody>`;

      Object.entries(tabResults).forEach(([id, val]) => {
        const name = testMap[id] || id;
        const valStr = String(val);
        let icon = '·', valClass = '';
        if (valStr === 'PASS' || valStr === 'Supported') { icon = '✓'; valClass = 'val-pass'; }
        else if (valStr === 'FAIL') { icon = '✗'; valClass = 'val-fail'; }
        else if (valStr === 'N/A') { icon = '-'; valClass = 'val-na'; }
        else if (valStr.includes('FAIL') || valStr === 'TIMEOUT' || valStr === 'ERROR') { icon = '✗'; valClass = 'val-fail'; }
        else { icon = '✓'; valClass = 'val-metric'; }

        const weight = SCORE_WEIGHTS[id];
        const weightBadge = weight
          ? `<span class="kt-report-weight">${weight}pt</span>`
          : '';

        html += `
          <tr>
            <td class="col-icon ${valClass}">${icon}</td>
            <td class="col-name">${esc(name)}${weightBadge}</td>
            <td class="col-val ${valClass}">${esc(valStr)}</td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
    });

    html += `</div>`;

    document.getElementById('reportContent').innerHTML = html;
    document.getElementById('reportOverlay').classList.add('active');
  }

  document.getElementById('btnReport').addEventListener('click', generateReport);
  document.getElementById('btnCloseReport').addEventListener('click', () => {
    document.getElementById('reportOverlay').classList.remove('active');
  });
  document.getElementById('reportOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'reportOverlay') {
      document.getElementById('reportOverlay').classList.remove('active');
    }
  });

  // ═══════════════════════════════════════════════════════
  // Init
  // ═══════════════════════════════════════════════════════
  initUI();

})();
