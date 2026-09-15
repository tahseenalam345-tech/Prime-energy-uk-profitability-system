import { spawn } from 'child_process';

async function test() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const remoteDebuggingPort = 9222;

  const edgeProc = spawn(edgePath, [
    `--remote-debugging-port=${remoteDebuggingPort}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=1280,800',
    'http://localhost:5173/'
  ]);

  try {
    await new Promise(r => setTimeout(r, 3000));
    const listRes = await fetch(`http://127.0.0.1:${remoteDebuggingPort}/json`);
    const pages = await listRes.json();
    const page = pages.find(p => p.url.includes('5173')) || pages[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let msgId = 1;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === id) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });

    await send('Runtime.enable');
    await new Promise(r => setTimeout(r, 2000));

    // Expand row 0
    await send('Runtime.evaluate', {
      expression: `(() => {
        const row = document.querySelector('.crm-sheet-row');
        if (row) row.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 800));

    // Set wrapper width to container clientWidth
    const evalRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const gridContainer = document.querySelector('.crm-sheet-scroll-container');
        const cWidth = gridContainer.clientWidth;

        const wrapper = document.querySelector('.crm-sheet-slider-expand-wrapper');
        if (wrapper) {
          wrapper.style.position = 'sticky';
          wrapper.style.left = '0';
          wrapper.style.width = cWidth + 'px';
          wrapper.style.maxWidth = cWidth + 'px';
          wrapper.style.boxSizing = 'border-box';
        }

        const drawer = document.querySelector('.crm-expand-drawer');
        if (drawer) {
          drawer.style.width = '100%';
          drawer.style.maxWidth = '100%';
          drawer.style.boxSizing = 'border-box';
        }

        const dossierTrack = document.querySelector('.crm-slider-track');
        if (dossierTrack) {
          dossierTrack.style.width = '100%';
          dossierTrack.style.maxWidth = '100%';
          dossierTrack.style.boxSizing = 'border-box';
        }

        return {
          gridContainer: {
            scrollWidth: gridContainer?.scrollWidth,
            clientWidth: gridContainer?.clientWidth,
            isScrollable: gridContainer.scrollWidth > gridContainer.clientWidth
          },
          dossierTrack: {
            scrollWidth: dossierTrack?.scrollWidth,
            clientWidth: dossierTrack?.clientWidth,
            isScrollable: dossierTrack.scrollWidth > dossierTrack.clientWidth
          }
        };
      })()`,
      returnByValue: true
    });

    console.log('=== TEST RESULT WITH WRAPPER CONSTRAINED TO CONTAINER CLIENTWIDTH ===');
    console.log(JSON.stringify(evalRes.result.value, null, 2));

    // Now test scrolling dossier all the way right
    const dossierScrollRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const dossierTrack = document.querySelector('.crm-slider-track');
        dossierTrack.scrollTo({ left: 10000, behavior: 'instant' });
        const tr = dossierTrack.getBoundingClientRect();
        const cards = Array.from(dossierTrack.querySelectorAll('.crm-slider-card')).map((c, i) => {
          const r = c.getBoundingClientRect();
          return {
            index: i,
            title: c.querySelector('.crm-drawer-sec-title')?.innerText?.replace(/\\s+/g, ' ')?.trim(),
            left: Math.round(r.left),
            right: Math.round(r.right),
            isFullyInTrack: r.left >= tr.left && r.right <= tr.right + 2
          };
        });
        return {
          trackScrollLeft: dossierTrack.scrollLeft,
          cards
        };
      })()`,
      returnByValue: true
    });

    console.log('=== DOSSIER SCROLLED TO MAX RIGHT ===');
    console.log(JSON.stringify(dossierScrollRes.result.value, null, 2));

    ws.close();
  } finally {
    edgeProc.kill();
  }
}

test().catch(console.error);
