/* ====== CONFIG ====== */
const CHATBOT_CONFIG = {
  webhookUrl: "https://n8n1.vbservices.org/webhook/167a3d1c-e104-4a41-8241-941148302b51/chat",
  title: "De Zakkenspecialist Assistent",

  bubbleIconClosed: "./Assets/ChatImage.png",
  bubbleIconOpen:   "./Assets/dropDown.png",

  agentAvatar: "./Assets/ChatImage.png",

  headers: {},

  parseReply: (data) => {
    if (!data) return "Er ging iets mis. Probeer opnieuw.";
    if (typeof data === "string") return data;
    if (data.output) return data.output;
    if (data.reply)  return data.reply;
    if (data.text)   return data.text;
    if (data.message)return data.message;
    try { return JSON.stringify(data); } catch { return String(data); }
  },

  identity: { site: location.hostname, path: location.pathname },

  watermark: {
    image: "./Assets/plastic_molecules1.png",
    mode: "center",
    text: "",
    opacity: 0.6
  },

  bubbleOpenZoom: 1.3,

  resize: {
    minW: 300, minH: 360,
    maxWvw: 90, maxHvh: 85,
    remember: true,
    storageKey: "cb_size"
  },
};
/* ===================== */

(function(){
  const qs = (s,p=document)=>p.querySelector(s);
  const elWin    = qs('#cbWindow');
  const elBody   = qs('#cbBody');
  const elForm   = qs('#cbForm');
  const elInput  = qs('#cbInput');
  const elToggle = qs('#cbToggle');
  const elClose  = qs('#cbClose');
  const elAvatar = qs('#cbAvatar');
  const elIconClosed = qs('.cb-icon-closed', elToggle);
  const elIconOpen   = qs('.cb-icon-open',   elToggle);

  const bust = (url)=> url ? url + ((url.includes('?')?'&':'?') + 'v=' + Date.now()) : url;
  function preload(src){ if(!src) return; const i=new Image(); i.src=bust(src); }
  function setBubbleIcons(closed,open){
    if (closed) elIconClosed.src = bust(closed);
    if (open)   elIconOpen.src   = bust(open);
  }
  function setAvatar(src){
    if(!src){ elAvatar.style.display='none'; return; }
    elAvatar.src = bust(src);
  }
  function applyOpenZoom(){
    const z = Number(CHATBOT_CONFIG.bubbleOpenZoom||1);
    elToggle.style.setProperty('--cb-open-zoom', String(z>0?z:1));
  }

  /* markdown helpers */
  function escapeHTML(s){ return s.replace(/[&<>"]/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch])); }
  function parseBlocks(md){
    const lines=String(md).replace(/\r\n?/g,'\n').split('\n');
    const blocks=[]; let buf=[]; let inCode=false;
    const flush=()=>{ const t=buf.join('\n').trim(); buf=[]; if(t) blocks.push({type:'p',text:t}); };

    for(let i=0;i<lines.length;i++){
      const line=lines[i];

      const fence=line.match(/^```(\w+)?\s*$/);
      if(fence){
        if(!inCode){ flush(); inCode=true; blocks.push({type:'code_open',lang:fence[1]||''}); }
        else{ inCode=false; blocks.push({type:'code_close'}); }
        continue;
      }
      if(inCode){ blocks.push({type:'code_line',text:line}); continue; }

      const h=line.match(/^(#{1,6})\s+(.*)$/);
      if(h){ flush(); blocks.push({type:'h',level:h[1].length,text:h[2]}); continue; }

      const ul=line.match(/^\s*-\s+(.*)$/);
      if(ul){
        flush(); const items=[ul[1]];
        while(i+1<lines.length && /^\s*-\s+/.test(lines[i+1])) items.push(lines[++i].replace(/^\s*-\s+/,'')); 
        blocks.push({type:'ul',items}); continue;
      }

      const ol=line.match(/^\s*\d+\.\s+(.*)$/);
      if(ol){
        flush(); const items=[ol[1]];
        while(i+1<lines.length && /^\s*\d+\.\s+/.test(lines[i+1])) items.push(lines[++i].replace(/^\s*\d+\.\s+/,'')); 
        blocks.push({type:'ol',items}); continue;
      }

      if(/^\s*$/.test(line)) flush(); else buf.push(line);
    }
    flush();
    return blocks;
  }
  function renderInline(t){
    let s=escapeHTML(t);
    s=s.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,(m,a,u)=>`<img src="${u}" alt="${a}" class="cb-img">`);
    s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(m,txt,u)=>`<a href="${u}" target="_blank">${txt}</a>`);
    s=s.replace(/`([^`]+)`/g,(m,c)=>`<code>${c}</code>`);
    s=s.replace(/\*\*([^*]+)\*\*/g,(m,x)=>`<strong>${x}</strong>`);
    s=s.replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g,(m,p,x)=>`${p}<em>${x}</em>`);
    s=s.replace(/(https?:\/\/[^\s<]+?\.(?:png|jpe?g|gif|webp|svg))(?![^<]*>)/gi,(u)=>`<img src="${u}" class="cb-img">`);
    s=s.replace(/(https?:\/\/[^\s<]+)(?![^<]*>)/g,(u)=>`<a href="${u}" target="_blank">${u}</a>`);
    return s;
  }
  function renderMarkdown(md){
    const blocks=parseBlocks(md);
    const out=[]; let inCode=false; let codeBuf=[];
    for(const b of blocks){
      if(b.type==='code_open'){ inCode=true; codeBuf=[]; continue; }
      if(b.type==='code_close'){
        out.push(`<pre><code>${escapeHTML(codeBuf.join('\n'))}</code></pre>`);
        inCode=false; codeBuf=[]; continue;
      }
      if(b.type==='code_line'){ codeBuf.push(b.text); continue; }
      if(b.type==='h'){ const lvl=Math.min(3,Math.max(1,b.level)); out.push(`<h${lvl}>${renderInline(b.text)}</h${lvl}>`); continue; }
      if(b.type==='ul'){ out.push(`<ul>${b.items.map(t=>`<li>${renderInline(t)}</li>`).join('')}</ul>`); continue; }
      if(b.type==='ol'){ out.push(`<ol>${b.items.map(t=>`<li>${renderInline(t)}</li>`).join('')}</ol>`); continue; }
      if(b.type==='p'){ out.push(`<p>${renderInline(b.text)}</p>`); continue; }
    }
    return out.join('');
  }

  function addMsg(role,text,isTyping=false,isHTML=false){
    const m=document.createElement('div');
    m.className=`cb-msg ${role}`;
    if(isTyping){
      m.innerHTML=`<span class="cb-typing"><span class="cb-dot"></span><span class="cb-dot"></span><span class="cb-dot"></span></span>`;
    } else {
      if(isHTML){ m.innerHTML=text; }
      else{ m.textContent=text; }
    }
    elBody.appendChild(m);
    elBody.scrollTop=elBody.scrollHeight;
    return m;
  }

  /* SSE streaming */
  function sseAppendChunk(acc,dataStr){
    try{
      const o=JSON.parse(dataStr);
      const c=o.token ?? o.delta ?? o.text ?? o.output ?? o.message ?? "";
      return acc+(c||"");
    }catch{
      if(dataStr==="[DONE]") return acc;
      return acc+dataStr;
    }
  }

  async function readSSEStream(res,onUpdate){
    const reader=res.body.getReader();
    const dec=new TextDecoder("utf8");
    let buf=""; let full=""; let last=0;

    const flush=()=>{
      onUpdate(full);
      elBody.scrollTop=elBody.scrollHeight;
      last=performance.now();
    };

    while(true){
      const {value,done}=await reader.read();
      if(done){ flush(); break; }
      buf+=dec.decode(value,{stream:true});

      let idx;
      while((idx=buf.indexOf("\n\n"))!==-1){
        const evt=buf.slice(0,idx);
        buf=buf.slice(idx+2);

        const lines=evt.split("\n");
        for(const line of lines){
          if(line.startsWith("data:")){
            const d=line.slice(5).trim();
            if(d==="[DONE]"){ flush(); return; }
            full=sseAppendChunk(full,d);
          }
        }
        if(performance.now()-last>50) flush();
      }
    }
  }

  async function sendMessage(text){
    addMsg('user', text);
    const typing=addMsg('bot','',true);

    const payload={ chatInput:text, sessionId, metadata:CHATBOT_CONFIG.identity };

    try{
      const res=await fetch(CHATBOT_CONFIG.webhookUrl,{
        method:'POST',
        headers:{ 'Content-Type':'application/json','Accept':'text/event-stream',...CHATBOT_CONFIG.headers },
        body:JSON.stringify(payload),
      });

      const ctype=(res.headers.get('content-type')||"").toLowerCase();

      typing.innerHTML='';
      const holder=document.createElement('div');
      typing.appendChild(holder);

      if(ctype.includes('text/event-stream') && res.body && res.body.getReader){
        await readSSEStream(res,(full)=>{
          holder.innerHTML=renderMarkdown(full);
        });
      } else {
        const raw=await res.text();
        let data; try{ data=JSON.parse(raw);}catch{ data=raw; }
        holder.innerHTML=renderMarkdown(CHATBOT_CONFIG.parseReply(data));
      }
    } catch(e){
      console.error(e);
      typing.textContent="Er ging iets mis. Probeer het later opnieuw.";
    }
  }

  /* OPEN/CLOSE animatie met fases */
  function setOpen(open){
    if (open) {
      // eventuele closing classes resetten
      elWin.classList.remove('cb-closing-phase1','cb-closing-phase2',
                             'cb-opening-phase1','cb-opening-phase2');

      // cb-open + startstate: klein strookje rechtsonder
      elWin.classList.add('cb-open','cb-opening-start');
      elToggle.classList.add('is-open');

      // volgende frame: fase1 → omhoog uitklappen
      requestAnimationFrame(() => {
        elWin.classList.add('cb-opening-phase1');
        elWin.classList.remove('cb-opening-start');

        // duur moet matchen CSS (.28s)
        setTimeout(() => {
          // fase2 → horizontaal uitklappen
          elWin.classList.add('cb-opening-phase2');
          elWin.classList.remove('cb-opening-phase1');

          // na fase2 klaar → cleanup + focus
          setTimeout(() => {
            elWin.classList.remove('cb-opening-phase2');
            elInput.focus();
          }, 260); // match .cb-opening-phase2
        }, 280);   // match .cb-opening-phase1
      });
    } else {
      // sluiten: eerst X inklappen, dan Y
      elWin.classList.remove('cb-opening-start','cb-opening-phase1','cb-opening-phase2');
      elWin.classList.add('cb-closing-phase1');

      setTimeout(() => {
        elWin.classList.remove('cb-closing-phase1');
        elWin.classList.add('cb-closing-phase2');

        setTimeout(() => {
          elWin.classList.remove('cb-open','cb-closing-phase2');
          elToggle.classList.remove('is-open');
        }, 280); // match .cb-closing-phase2
      }, 260);   // match .cb-closing-phase1
    }
  }

  /* Watermark */
  function initWatermark(){
    const wm=CHATBOT_CONFIG.watermark||{};
    if(!wm.image && !wm.text) return;
    const layer=document.createElement('div');
    layer.className='cb-watermark';
    if(typeof wm.opacity==='number') layer.style.opacity=String(wm.opacity);

    if(wm.image){
      const img=document.createElement('img');
      img.src=bust(wm.image);
      layer.appendChild(img);
    }
    if(wm.text){
      const t=document.createElement('div');
      t.className='cb-watermark-text';
      t.textContent=wm.text;
      layer.appendChild(t);
    }
    elBody.appendChild(layer);
  }

  /* Resize (fixed) */
  function initResize(){
    const grip=document.createElement('div');
    grip.className='cb-resize';
    elWin.appendChild(grip);

    const cfg=CHATBOT_CONFIG.resize||{};
    const key=(k)=>`${cfg.storageKey||'cb_size'}_${k}`;

    if(cfg.remember){
      const w=+localStorage.getItem(key('w'));
      const h=+localStorage.getItem(key('h'));
      if(w>0 && h>0){
        elWin.style.width=`${w}px`;
        elWin.style.height=`${h}px`;
      }
    }

    const getBounds=()=>{
      const vw=Math.max(document.documentElement.clientWidth, window.innerWidth||0);
      const vh=Math.max(document.documentElement.clientHeight,window.innerHeight||0);
      const maxW=Math.min(vw*(cfg.maxWvw||90)/100,760);
      const maxH=Math.min(vh*(cfg.maxHvh||85)/100,900);
      const minW=cfg.minW||300;
      const minH=cfg.minH||360;
      return {vw,vh,maxW,maxH,minW,minH};
    };

    let startW=0,startH=0,startX=0,startY=0,resizing=false;

    const onDown=(x,y)=>{
      const r=elWin.getBoundingClientRect();
      startW=r.width; startH=r.height; startX=x; startY=y;
      resizing=true;
      elWin.classList.add('cb-resizing');
      document.body.style.cursor='nw-resize';
    };

    const applyResize=(x,y)=>{
      const {maxW,maxH,minW,minH}=getBounds();
      let dX=x-startX;
      let dY=y-startY;
      let newW=Math.min(Math.max(startW-dX,minW),maxW);
      let newH=Math.min(Math.max(startH-dY,minH),maxH);
      elWin.style.width=`${Math.round(newW)}px`;
      elWin.style.height=`${Math.round(newH)}px`;
    };

    const onMove=(e)=>{
      if(!resizing) return;
      applyResize(e.clientX, e.clientY);
    };

    const onUp=()=>{
      if(!resizing) return;
      resizing=false;
      elWin.classList.remove('cb-resizing');
      document.body.style.cursor='';
      if(cfg.remember){
        const r=elWin.getBoundingClientRect();
        localStorage.setItem(key('w'),String(Math.round(r.width)));
        localStorage.setItem(key('h'),String(Math.round(r.height)));
      }
      window.removeEventListener('mousemove',onMove);
    };

    grip.addEventListener('mousedown',e=>{
      e.preventDefault(); e.stopPropagation();
      onDown(e.clientX,e.clientY);
      window.addEventListener('mousemove',onMove);
      window.addEventListener('mouseup',onUp,{once:true});
    });

    grip.addEventListener('touchstart',e=>{
      const t=e.touches[0];
      if(!t) return;
      e.preventDefault(); e.stopPropagation();
      onDown(t.clientX,t.clientY);
    },{passive:false});

    window.addEventListener('touchmove',e=>{
      if(!resizing) return;
      const t=e.touches[0]; if(!t) return;
      applyResize(t.clientX,t.clientY);
    },{passive:false});

    window.addEventListener('touchend',onUp);

    grip.addEventListener('dblclick',()=>{
      elWin.style.width=''; elWin.style.height='';
      if(cfg.remember){
        localStorage.removeItem(key('w'));
        localStorage.removeItem(key('h'));
      }
    });
  }

  /* INIT */
  setBubbleIcons(CHATBOT_CONFIG.bubbleIconClosed,CHATBOT_CONFIG.bubbleIconOpen);
  preload(CHATBOT_CONFIG.bubbleIconClosed); preload(CHATBOT_CONFIG.bubbleIconOpen);
  setAvatar(CHATBOT_CONFIG.agentAvatar);
  applyOpenZoom();
  if(CHATBOT_CONFIG.title) qs('#cbTitle').textContent=CHATBOT_CONFIG.title;

  initWatermark();
  initResize();

  const SESSION_KEY='cb_session_id';
  let sessionId=localStorage.getItem(SESSION_KEY);
  if(!sessionId){
    sessionId='sess_'+Math.random().toString(36).slice(2)+Date.now();
    localStorage.setItem(SESSION_KEY,sessionId);
  }

  elToggle.addEventListener('click',()=> setOpen(!elWin.classList.contains('cb-open')));
  elClose.addEventListener('click',()=> setOpen(false));
  elClose.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') setOpen(false); });

  elForm.addEventListener('submit',e=>{
    e.preventDefault();
    const text=(elInput.value||"").trim();
    if(!text) return;
    elInput.value='';
    sendMessage(text);
  });

  const welcome="Hoi! Waar kan ik je mee helpen?\n\n- Productvragen\n- Bestellingen\n- Levering & retour";
  addMsg('bot',renderMarkdown(welcome),false,true);
})();