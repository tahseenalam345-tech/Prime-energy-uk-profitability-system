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
    '--window-size=1200,850',
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

    // Expand row 1
    await send('Runtime.evaluate', {
      expression: `(() => {
        const rows = document.querySelectorAll('.crm-sheet-row');
        if (rows[1]) rows[1].click();
      })()`
    });
    await new Promise(r => setTimeout(r, 800));

    // Dispatch wheel event
    await send('Runtime.evaluate', {
      expression: `(() => {
        const track = document.querySelector('.crm-slider-track');
        track.dispatchEvent(new WheelEvent('wheel', { deltaY: 600, bubbles: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 600));

    const afterWheel = await send('Runtime.evaluate', {
      expression: `(() => {
        const track = document.querySelector('.crm-slider-track');
        const cards = Array.from(document.querySelectorAll('.crm-slider-card'));
        const card5 = cards[4]?.getBoundingClientRect();
        const tr = track.getBoundingClientRect();
        return {
          scrollLeft: track.scrollLeft,
          card5Visible: card5.left >= tr.left && card5.right <= tr.right + 10,
          activePill: document.querySelector('.crm-slider-pill.active')?.innerText
        };
      })()`,
      returnByValue: true
    });
    console.log('AFTER WHEEL RESULT:', afterWheel.result.value);

    ws.close();
  } finally {
    edgeProc.kill();
  }
}

test().catch(console.error);
