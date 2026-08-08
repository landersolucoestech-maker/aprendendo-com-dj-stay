import { spawn, spawnSync } from "node:child_process";
import { SURFACES } from "./surfaces.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base = process.env.PREVIEW_BASE_URL ?? "http://127.0.0.1:4173/aprendendo-com-dj-stay/";

const findChrome = () => {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const candidate of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const found = spawnSync("which", [candidate], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error("Chrome/Chromium não encontrado.");
};

const waitJson = async (url, timeoutMs = 30000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch {}
    await sleep(150);
  }
  throw new Error("Timeout: " + url);
};

class Cdp {
  constructor(url) { this.url=url; this.id=1; this.pending=new Map(); this.events=[]; }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((ok, bad) => {
      this.ws.addEventListener("open", ok, { once:true });
      this.ws.addEventListener("error", bad, { once:true });
    });
    this.ws.addEventListener("message", (event) => {
      const msg=JSON.parse(String(event.data));
      if (msg.id) {
        const p=this.pending.get(msg.id); if (!p) return;
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(JSON.stringify(msg.error))) : p.resolve(msg.result ?? {});
      } else if (msg.method) this.events.push(msg);
    });
  }
  send(method, params={}) {
    const id=this.id++;
    return new Promise((resolve,reject)=>{ this.pending.set(id,{resolve,reject}); this.ws.send(JSON.stringify({id,method,params})); });
  }
  close(){ this.ws?.close(); }
}

const evaluate = async (client, expression) => {
  const result=await client.send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if (result.exceptionDetails) throw new Error("Eval failed: "+expression);
  return result.result?.value;
};

const chromePath=findChrome();
const port=9333;
const chrome=spawn(chromePath,[
  "--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
  "--remote-allow-origins=*","--remote-debugging-port="+port,
  "--user-data-dir=/tmp/visual-preview-chrome","about:blank",
],{stdio:["ignore","ignore","ignore"]});

try {
  await waitJson(`http://127.0.0.1:${port}/json/version`);
  let tested=0;
  for (const viewport of [{name:"desktop",width:1440,height:1000},{name:"mobile",width:390,height:844}]) {
    for (const surface of SURFACES) {
      const target=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:"PUT"}).then(r=>r.json());
      const client=new Cdp(target.webSocketDebuggerUrl); await client.connect();
      await client.send("Page.enable"); await client.send("Runtime.enable"); await client.send("Network.enable");
      await client.send("Emulation.setDeviceMetricsOverride",{width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:viewport.width<640});
      const url=base+"visual-preview/"+surface.slug+"/";
      await client.send("Page.navigate",{url});
      const deadline=Date.now()+15000;
      let ready=false;
      while(Date.now()<deadline){
        ready=await evaluate(client,"document.documentElement.dataset.visualPreviewReady === 'true'");
        if(ready) break;
        await sleep(100);
      }
      if(!ready) throw new Error(`${surface.slug} ${viewport.name}: preview não ficou pronto`);
      await sleep(250);
      const state=await evaluate(client,`(() => ({
        text: (document.body.innerText || "").trim().length,
        root: Boolean(document.querySelector("#root")?.firstElementChild),
        surface: document.body.dataset.previewSurface || "",
        title: document.title
      }))()`);
      if(!state.root || state.text < 40 || state.surface !== surface.slug) {
        throw new Error(`${surface.slug} ${viewport.name}: tela vazia/inválida ${JSON.stringify(state)}`);
      }
      const exceptions=client.events.filter(e=>e.method==="Runtime.exceptionThrown");
      if(exceptions.length) throw new Error(`${surface.slug} ${viewport.name}: console/runtime exception`);
      const external=[...new Set(client.events
        .filter(e=>e.method==="Network.requestWillBeSent")
        .map(e=>e.params?.request?.url)
        .filter(Boolean)
        .filter(u=>/^https?:/.test(u) && !u.startsWith("http://127.0.0.1:4173/")))];
      if(external.length) throw new Error(`${surface.slug} ${viewport.name}: requisição externa ${external.join(", ")}`);
      tested++;
      console.log(`PREVIEW_SMOKE ${viewport.name} ${surface.slug} PASS`);
      client.close();
      await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`);
    }
  }
  console.log(`PREVIEW_SMOKE_TOTAL=${tested} PASS`);
} finally {
  chrome.kill("SIGTERM");
}
