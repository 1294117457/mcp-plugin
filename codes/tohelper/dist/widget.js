(function(){"use strict";const N=`
#th-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #1f2937;
}

#th-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99999;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #4f46e5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
  border: none;
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
  touch-action: none;
}
#th-btn:hover { transform: scale(1.1); }
#th-btn:active { cursor: grabbing; }
#th-btn.dragging {
  cursor: grabbing;
  transform: scale(1.15);
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.5);
}

#th-btn .badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

#th-panel {
  position: fixed;
  z-index: 99998;
  width: 420px;
  height: 620px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  display: none;
  flex-direction: column;
  overflow: hidden;
}
#th-panel.open { display: flex; }

.th-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}
.th-hdr h2 { font-size: 14px; font-weight: 600; margin: 0; }

.th-cls {
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 4px;
}
.th-cls:hover { background: #f3f4f6; }

.th-tabs {
  display: flex;
  border-bottom: 1px solid #f3f4f6;
  padding: 0 8px;
  flex-shrink: 0;
}
.th-tabs button {
  flex: 1;
  padding: 8px 4px;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.th-tabs button.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}
.th-tabs button:hover:not(.active) { color: #374151; }

.th-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.th-sec { padding: 4px 14px 8px; }
.th-sec-t {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 8px 0 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.th-cnt {
  font-size: 10px;
  background: #eef2ff;
  color: #4f46e5;
  padding: 1px 5px;
  border-radius: 6px;
}

.th-i {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  transition: background 0.1s;
}
.th-i:hover { background: #f9fafb; }
.th-i .nm {
  font-size: 12px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.th-i .ds {
  font-size: 10px;
  color: #9ca3af;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-tg {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
}
.th-tg.mcp { background: #dbeafe; color: #1d4ed8; }
.th-tg.denied { background: #fee2e2; color: #dc2626; }
.th-tg.skl { background: #dcfce7; color: #16a34a; }

.th-empty {
  padding: 30px 14px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

.th-mcp-section {
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}
.th-mcp-section:last-child { border-bottom: none; }
.th-mcp-section > .th-sec-t {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 14px 4px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.th-mcp-scroll {
  overflow-y: auto;
  max-height: 130px;
}
.th-mcp-hint {
  padding: 12px 14px;
  color: #9ca3af;
  font-size: 11px;
  text-align: center;
}

.th-ftr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
  flex-shrink: 0;
}

.th-btn-s {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}
.th-btn-s:hover { opacity: 0.85; }
.th-rst { color: #6b7280; background: #fff; border: 1px solid #e5e7eb; }
.th-apl { color: #fff; background: #4f46e5; }
`,j="/api/tohelper";async function L(t){return(await fetch(`${j}${t}`)).json()}async function $(t,e){return(await fetch(`${j}${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:e?JSON.stringify(e):void 0})).json()}const f={getTools:()=>L("/tools"),getSkills:()=>L("/skills"),getMcpServers:()=>L("/mcp/servers"),addMcpServer:t=>$("/mcp/add",t),addMcpBatch:t=>$("/mcp/add-batch",t),removeMcpServer:t=>$("/mcp/remove",{serverName:t}),denyTools:t=>$("/mcp/deny",{names:t}),resetDeny:()=>$("/mcp/reset"),getStatus:()=>L("/status")};function l(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}let g={ok:!1,builtin:[],mcp:[]};async function I(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{g=await f.getTools(),O(t)}catch(e){t.innerHTML=`<div class="th-empty">加载失败: ${l(e.message)}</div>`}}function O(t){let e="";if(g.builtin.length){e+=`<div class="th-sec"><div class="th-sec-t">内置工具 <span class="th-cnt">${g.builtin.length}</span></div></div>`;for(const s of g.builtin)e+=`<div class="th-i">
        <span style="color:#d1d5db;font-size:10px">🔒</span>
        <span class="nm">${l(s.name)}</span>
        <span class="ds">${l(s.description.slice(0,60))}</span>
      </div>`}if(g.mcp.length){e+=`<div class="th-sec"><div class="th-sec-t">MCP 工具 <span class="th-cnt">${g.mcp.length}</span></div></div>`;for(const s of g.mcp)e+=`<div class="th-i">
        <span class="nm">${l(s.name)}</span>
        <span class="th-tg ${s.denied?"denied":"mcp"}">${s.denied?"已禁用":"MCP"}</span>
      </div>`}e||(e='<div class="th-empty">暂无工具（等待 Agent 创建）</div>'),t.innerHTML=e}let B={ok:!1,builtin:[],mcp:[]},z=[],E=new Set,m=new Set,T=!1;async function k(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{const[e,s]=await Promise.all([f.getTools(),f.getMcpServers()]);B=e,z=s.servers,E=new Set(s.denied),m=new Set(E),P(t)}catch{t.innerHTML='<div class="th-empty">加载 MCP 数据失败</div>'}}function P(t){let e="";e+=`<div class="th-mcp-section">
    <div class="th-sec-t">已连接 <span class="th-cnt">${z.length}</span></div>
    <div class="th-mcp-scroll">`,z.length||(e+='<div class="th-mcp-hint">暂无已连接的 MCP 服务</div>');for(const n of z)e+=`<div class="th-i">
      <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></span>
      <span class="nm">${l(n.serverName)}</span>
      <span class="ds">${n.toolCount} 个工具 | ${l(n.transport)}</span>
      <button class="th-btn-s th-rst th-rm-srv" data-srv="${l(n.serverName)}" style="padding:2px 6px;font-size:10px">断开</button>
    </div>`;e+="</div></div>";const s=B.mcp||[];e+=`<div class="th-mcp-section">
    <div class="th-sec-t">MCP 工具 <span class="th-cnt">${s.length}</span></div>
    <div class="th-mcp-scroll">`,s.length||(e+='<div class="th-mcp-hint">连接 MCP 服务后，工具将显示在此处</div>');for(const n of s){const v=!m.has(n.name),a=n.name.replace(/^mcp__[^_]+__/,"");e+=`<label class="th-i" style="cursor:pointer">
      <input type="checkbox" ${v?"checked":""} data-tool="${l(n.name)}" style="width:14px;height:14px;accent-color:#4f46e5">
      <span class="nm" title="${l(n.name)}">${l(a)}</span>
      <span class="ds">${l((n.description||"").slice(0,40))}</span>
    </label>`}e+="</div>",s.length&&(e+=`<div class="th-ftr" style="border-top:none;padding:6px 14px">
      <button class="th-btn-s th-rst" id="th-mcp-reset">全部启用</button>
      <button class="th-btn-s th-apl" id="th-mcp-apply">应用选择</button>
    </div>`),e+="</div>",e+=`<div class="th-mcp-section">
    <div class="th-sec-t" style="justify-content:space-between">
      添加服务
      <button class="th-btn-s" id="th-toggle-mode" style="font-size:10px;padding:2px 8px;background:#f3f4f6;color:#374151">${T?"简单模式":"JSON 配置"}</button>
    </div>
    <div class="th-mcp-scroll">`,T?e+=`<div style="display:flex;flex-direction:column;gap:6px;padding:4px 10px">
      <textarea id="th-json-input" rows="6" placeholder='粘贴 JSON 配置，例如：
{
  "mcpServers": {
    "my-server": {
      "type": "streamablehttp",
      "url": "https://...",
      "headers": {
        "Authorization": "Bearer ..."
      }
    }
  }
}' style="padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;font-family:monospace;resize:none;height:100%;min-height:80px;line-height:1.4"></textarea>
      <div id="th-json-error" style="color:#dc2626;font-size:10px;display:none"></div>
      <button class="th-btn-s th-apl" id="th-json-add" style="align-self:flex-end">连接</button>
    </div>`:e+=`<div style="display:flex;flex-direction:column;gap:5px;padding:4px 10px">
      <input id="th-srv-name" placeholder="服务名称" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <select id="th-srv-transport" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
        <option value="streamable-http">HTTP (streamable)</option>
        <option value="stdio">stdio (本地命令)</option>
      </select>
      <input id="th-srv-url" placeholder="URL（如 https://mcp.example.com）" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <input id="th-srv-headers" placeholder='Headers（可选）: {"Authorization":"Bearer ..."}' style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <button class="th-btn-s th-apl" id="th-srv-add" style="align-self:flex-end">连接</button>
    </div>`,e+="</div></div>",t.innerHTML=e,A(t)}function A(t){var e,s,n,v,a;(e=t.querySelector("#th-toggle-mode"))==null||e.addEventListener("click",()=>{T=!T,P(t)}),t.querySelectorAll("input[data-tool]").forEach(o=>{o.addEventListener("change",()=>{o.checked?m.delete(o.dataset.tool):m.add(o.dataset.tool)})}),(s=t.querySelector("#th-mcp-reset"))==null||s.addEventListener("click",async()=>{await f.resetDeny(),m.clear(),E.clear(),k(t)}),(n=t.querySelector("#th-mcp-apply"))==null||n.addEventListener("click",async()=>{await f.denyTools([...m]),E=new Set(m),k(t)}),t.querySelectorAll(".th-rm-srv").forEach(o=>{o.addEventListener("click",async()=>{await f.removeMcpServer(o.dataset.srv),k(t)})}),(v=t.querySelector("#th-json-add"))==null||v.addEventListener("click",async()=>{const o=t.querySelector("#th-json-input"),r=t.querySelector("#th-json-error");if(!o)return;const p=o.value.trim();if(p)try{const d=JSON.parse(p),b=d.mcpServers?d:{mcpServers:d};r.style.display="none";const x=await f.addMcpBatch(b);if(!x.ok){r.textContent="连接失败",r.style.display="block";return}const u=x.results.filter(h=>!h.ok);u.length?(r.textContent=u.map(h=>`${h.serverName}: ${h.error}`).join("; "),r.style.display="block"):o.value="",setTimeout(()=>k(t),1500)}catch(d){r.textContent=`JSON 格式错误: ${d.message}`,r.style.display="block"}}),(a=t.querySelector("#th-srv-add"))==null||a.addEventListener("click",async()=>{const o=t.querySelector("#th-srv-name"),r=t.querySelector("#th-srv-transport"),p=t.querySelector("#th-srv-url"),d=t.querySelector("#th-srv-headers");if(!o||!p)return;const b=o.value.trim(),x=(r==null?void 0:r.value)||"streamable-http",u=p.value.trim();if(!b||!u)return;let h;const H=d==null?void 0:d.value.trim();if(H)try{h=JSON.parse(H)}catch{alert("Headers JSON 格式错误");return}const q=x==="stdio"?{serverName:b,transport:x,command:u}:{serverName:b,transport:x,url:u,headers:h},M=await f.addMcpServer(q);M.ok?setTimeout(()=>k(t),1500):alert(M.error||"连接失败")})}let C=[];async function J(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{C=(await f.getSkills()).skills,R(t)}catch{t.innerHTML='<div class="th-empty">暂无可用技能</div>'}}function R(t){if(!C.length){t.innerHTML='<div class="th-empty">暂无可用技能</div>';return}let e=`<div class="th-sec"><div class="th-sec-t">技能列表 <span class="th-cnt">${C.length}</span></div></div>`;for(const s of C){const n=s.modelInvocable?"模型":"用户";e+=`<div class="th-i">
      <span class="th-tg skl">${n}</span>
      <span class="nm">${l(s.name)}</span>
      <span class="ds">${l(s.description.slice(0,50))}</span>
    </div>`}t.innerHTML=e}(function(){if(document.getElementById("th-root"))return;const e=document.createElement("style");e.textContent=N,document.head.appendChild(e);const s=document.createElement("div");s.id="th-root",s.innerHTML=`
    <button id="th-btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    </button>
    <div id="th-panel">
      <div class="th-hdr">
        <h2>tohelper</h2>
        <button class="th-cls" id="th-cls">×</button>
      </div>
      <div class="th-tabs">
        <button class="active" data-tab="tools">工具</button>
        <button data-tab="mcp">MCP</button>
        <button data-tab="skills">技能</button>
      </div>
      <div class="th-body" id="th-body"></div>
    </div>
  `,document.body.appendChild(s);let n=!1,v="tools";const a=document.getElementById("th-btn"),o=document.getElementById("th-panel"),r=document.getElementById("th-body");let p=!1,d=!1,b=0,x=0,u=0,h=0;function H(){const i=a.getBoundingClientRect();return{x:i.left,y:i.top}}a.addEventListener("pointerdown",i=>{p=!0,d=!1,b=i.clientX,x=i.clientY;const c=H();u=c.x,h=c.y,a.classList.add("dragging"),a.setPointerCapture(i.pointerId),i.preventDefault()}),document.addEventListener("pointermove",i=>{if(!p)return;const c=i.clientX-b,S=i.clientY-x;(Math.abs(c)>3||Math.abs(S)>3)&&(d=!0);const y=u+c,w=h+S,X=window.innerWidth-44,Y=window.innerHeight-44,_=Math.max(0,Math.min(X,y)),D=Math.max(0,Math.min(Y,w));a.style.left=`${_}px`,a.style.top=`${D}px`,a.style.right="auto",a.style.bottom="auto"}),document.addEventListener("pointerup",i=>{p&&(p=!1,a.classList.remove("dragging"),d?n&&q():(n=!n,o.classList.toggle("open",n),n&&(q(),M())))});function q(){const i=a.getBoundingClientRect(),c=420,S=620;let y=i.top-S-12,w=i.right-c;y<8&&(y=i.bottom+12),w<8&&(w=8),w+c>window.innerWidth-8&&(w=window.innerWidth-c-8),y+S>window.innerHeight-8&&(y=window.innerHeight-S-8),o.style.top=`${y}px`,o.style.left=`${w}px`,o.style.right="auto",o.style.bottom="auto"}document.getElementById("th-cls").addEventListener("click",()=>{n=!1,o.classList.remove("open")}),s.querySelectorAll(".th-tabs button").forEach(i=>{i.addEventListener("click",()=>{v=i.dataset.tab,s.querySelectorAll(".th-tabs button").forEach(c=>c.classList.remove("active")),i.classList.add("active"),M()})});function M(){switch(v){case"tools":I(r);break;case"mcp":k(r);break;case"skills":J(r);break}}})()})();
