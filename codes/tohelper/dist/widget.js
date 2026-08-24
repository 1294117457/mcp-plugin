(function(){"use strict";const J=`
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
  height: 700px;
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
  padding: 0;
}

.th-empty {
  padding: 30px 14px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

/* --- MCP Tab --- */
.th-mcp-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.th-mcp-section {
  flex-shrink: 0;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
}
.th-mcp-section:last-child { border-bottom: none; }
.th-mcp-section.flexible {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
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
  cursor: pointer;
  user-select: none;
}
.th-mcp-section > .th-sec-t:hover { color: #374151; }
.th-mcp-section > .th-sec-t.selected { color: #4f46e5; }
.th-mcp-scroll {
  overflow-y: auto;
  max-height: 200px;
}
.th-mcp-section.flexible .th-mcp-scroll {
  flex: 1;
  max-height: none;
  min-height: 0;
  overflow-y: auto;
}
.th-mcp-hint {
  padding: 12px 14px;
  color: #9ca3af;
  font-size: 11px;
  text-align: center;
}
.th-mcp-filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px 6px;
  flex-shrink: 0;
}
.th-mcp-filter-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.th-mcp-filter-tag:hover { background: #e5e7eb; }
.th-mcp-filter-tag.active {
  background: #eef2ff;
  color: #4f46e5;
  border-color: #c7d2fe;
}
.th-mcp-filter-tag .cnt {
  display: inline-block;
  background: rgba(79,70,229,0.12);
  border-radius: 6px;
  padding: 0 4px;
  margin-left: 3px;
  font-size: 9px;
}

/* --- Tools Tab --- */
.th-tools-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.th-tools-filter {
  display: flex;
  gap: 6px;
  padding: 10px 14px 6px;
  flex-shrink: 0;
}
.th-tools-filter button {
  flex: 1;
  padding: 6px 4px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.th-tools-filter button:hover { border-color: #c7d2fe; color: #4f46e5; }
.th-tools-filter button.active {
  background: #eef2ff;
  border-color: #a5b4fc;
  color: #4f46e5;
}
.th-tools-filter button .n {
  background: rgba(79,70,229,0.1);
  border-radius: 6px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
}
.th-tools-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0 8px;
}

/* --- Collapsible Group (shared by tools & mcp tabs) --- */
.th-collapse-group {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #f3f4f6;
}
.th-collapse-group:last-child { border-bottom: none; }
.th-collapse-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  cursor: pointer;
  user-select: none;
  background: #fafbfc;
  flex-shrink: 0;
  transition: background 0.1s;
}
.th-collapse-header:hover { background: #f0f2f7; }
.th-collapse-header .arrow {
  font-size: 10px;
  color: #9ca3af;
  width: 14px;
  text-align: center;
  transition: transform 0.2s;
  flex-shrink: 0;
}
.th-collapse-header.collapsed .arrow { transform: rotate(-90deg); }
.th-collapse-header .th-cnt {
  font-size: 10px;
  background: #eef2ff;
  color: #4f46e5;
  padding: 1px 5px;
  border-radius: 6px;
}
.th-collapse-header .srv-name {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.th-collapse-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: max-height 0.2s ease;
  max-height: 9999px;
}
.th-collapse-body.collapsed { max-height: 0; }

/* --- Common Item Styles --- */
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
.th-i.clickable { cursor: pointer; }
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
.th-i.disabled {
  background: #fafafa;
  opacity: 0.6;
}
.th-i.disabled .nm {
  text-decoration: line-through;
  color: #9ca3af;
}
.th-i.server-item {
  padding: 6px 14px;
  gap: 10px;
}
.th-i.server-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
}

.th-tg {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
  flex-shrink: 0;
}
.th-tg.mcp { background: #dbeafe; color: #1d4ed8; }
.th-tg.denied { background: #fee2e2; color: #dc2626; }
.th-tg.skl { background: #dcfce7; color: #16a34a; }

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
`,B="/api/tohelper";async function H(t){return(await fetch(`${B}${t}`)).json()}async function L(t,e){return(await fetch(`${B}${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:e?JSON.stringify(e):void 0})).json()}const m={getTools:()=>H("/tools"),getSkills:()=>H("/skills"),getMcpServers:()=>H("/mcp/servers"),addMcpServer:t=>L("/mcp/add",t),addMcpBatch:t=>L("/mcp/add-batch",t),removeMcpServer:t=>L("/mcp/remove",{serverName:t}),denyTools:t=>L("/mcp/deny",{names:t}),resetDeny:()=>L("/mcp/reset"),getStatus:()=>H("/status")};function i(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}let S={ok:!1,builtin:[],mcp:[]},v="all",E=new Set;async function R(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{S=await m.getTools(),P(t)}catch(e){t.innerHTML=`<div class="th-empty">加载失败: ${i(e.message)}</div>`}}function X(t){const e=t.match(/^mcp__([^_]+)__/);return e?e[1]:"unknown"}function Y(t){const e=new Map;for(const l of t){const r=X(l.name);e.has(r)||e.set(r,[]),e.get(r).push(l)}return e}function P(t){const e=S.builtin.length,l=S.mcp.length,r=v==="all"||v==="builtin",x=v==="all"||v==="mcp";let c='<div class="th-tools-body">';if(c+=`<div class="th-tools-filter">
    <button class="${v==="all"?"active":""}" data-filter="all">
      全部 <span class="n">${e+l}</span>
    </button>
    <button class="${v==="builtin"?"active":""}" data-filter="builtin">
      内置 <span class="n">${e}</span>
    </button>
    <button class="${v==="mcp"?"active":""}" data-filter="mcp">
      MCP <span class="n">${l}</span>
    </button>
  </div>`,c+='<div class="th-tools-scroll">',r&&e>0){const s=E.has("builtin");c+=`<div class="th-collapse-group">
      <div class="th-collapse-header${s?" collapsed":""}" data-srv="builtin">
        <span class="arrow">&#9660;</span>
        <span>内置工具</span>
        <span class="th-cnt">${e}</span>
      </div>
      <div class="th-collapse-body${s?" collapsed":""}" style="max-height:${s?0:S.builtin.length*40+8}px">`;for(const a of S.builtin)c+=`<div class="th-i">
        <span style="color:#d1d5db;font-size:10px;flex-shrink:0">&#128274;</span>
        <span class="nm">${i(a.name)}</span>
        <span class="ds">${i(a.description.slice(0,60))}</span>
      </div>`;c+="</div></div>"}if(x&&l>0){const a=[...Y(S.mcp).entries()].sort((o,n)=>n[1].length-o[1].length);for(const[o,n]of a){const d=E.has(o);c+=`<div class="th-collapse-group">
        <div class="th-collapse-header${d?" collapsed":""}" data-srv="${i(o)}">
          <span class="arrow">&#9660;</span>
          <span class="srv-name">${i(o)}</span>
          <span class="th-cnt">${n.length}</span>
        </div>
        <div class="th-collapse-body${d?" collapsed":""}" style="max-height:${d?0:n.length*40+8}px">`;for(const f of n){const h=f.name.replace(/^mcp__[^_]+__/,"");c+=`<div class="th-i${f.denied?" disabled":""}">
          <span class="nm">${i(h)}</span>
          <span class="th-tg ${f.denied?"denied":"mcp"}">${f.denied?"已禁用":"MCP"}</span>
        </div>`}c+="</div></div>"}}!e&&!l&&(c+='<div class="th-empty">暂无工具（等待 Agent 创建）</div>'),c+="</div></div>",t.innerHTML=c,D(t)}function D(t){t.querySelectorAll(".th-tools-filter button").forEach(e=>{e.addEventListener("click",()=>{v=e.dataset.filter,P(t)})}),t.querySelectorAll(".th-collapse-header[data-srv]").forEach(e=>{e.addEventListener("click",()=>{const l=e.dataset.srv;E.has(l)?E.delete(l):E.add(l);const r=e.nextElementSibling,x=E.has(l);e.classList.toggle("collapsed",x),r.classList.toggle("collapsed",x),r.style.maxHeight=x?"0px":`${r.querySelectorAll(".th-i").length*40+8}px`})})}let I={ok:!1,builtin:[],mcp:[]},z=[],N=new Set,w=new Set,_=!1,b=null,T=new Set;async function M(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{const[e,l]=await Promise.all([m.getTools(),m.getMcpServers()]);I=e,z=l.servers,N=new Set(l.denied),w=new Set(N),A(t)}catch{t.innerHTML='<div class="th-empty">加载 MCP 数据失败</div>'}}function A(t){var a;let e="";e+='<div class="th-mcp-body">',e+=`<div class="th-mcp-section" id="th-mcp-servers">
    <div class="th-sec-t">已连接 <span class="th-cnt">${z.length}</span></div>
    <div class="th-mcp-scroll">`,z.length||(e+='<div class="th-mcp-hint">暂无已连接的 MCP 服务</div>');for(const o of z){const n=b===o.serverName;e+=`<div class="th-i server-item clickable${n?" selected":""}" data-srv="${i(o.serverName)}">
      <span class="dot"></span>
      <span class="nm">${i(o.serverName)}</span>
      <span class="ds">${o.toolCount} 个工具 | ${i(o.transport)}</span>
      <button class="th-btn-s th-rst th-rm-srv" data-srv="${i(o.serverName)}" style="padding:2px 6px;font-size:10px;flex-shrink:0">断开</button>
    </div>`}e+="</div></div>";const l=I.mcp||[],r=new Map;for(const o of l){const n=o.name.match(/^mcp__([^_]+)__/),d=n?n[1]:"unknown";r.has(d)||r.set(d,[]),r.get(d).push(o)}const x=[...r.entries()].sort((o,n)=>n[1].length-o[1].length),c=!b,s=l.length;e+=`<div class="th-mcp-section flexible" id="th-mcp-tools">
    <div class="th-sec-t">
      MCP 工具
      <span class="th-cnt">${s}</span>
      ${b?`<span style="font-size:10px;color:#6b7280;font-weight:400;margin-left:4px">— ${i(b)}</span>`:'<span style="font-size:10px;color:#9ca3af;font-weight:400;margin-left:4px">全部</span>'}
    </div>`,e+=`<div class="th-mcp-filter-bar">
    <span class="th-mcp-filter-tag${c?" active":""}" data-filter="">全部 <span class="cnt">${s}</span></span>`;for(const o of z){const n=((a=r.get(o.serverName))==null?void 0:a.length)??0;n!==0&&(e+=`<span class="th-mcp-filter-tag${b===o.serverName?" active":""}" data-filter="${i(o.serverName)}">${i(o.serverName)} <span class="cnt">${n}</span></span>`)}e+="</div>",e+='<div class="th-mcp-scroll">',x.length||(e+='<div class="th-mcp-hint">连接 MCP 服务后，工具将显示在此处</div>');for(const[o,n]of x){const d=T.has(o);if(!(b&&b!==o)){e+=`<div class="th-collapse-group">
      <div class="th-collapse-header${d?" collapsed":""}" data-srv="${i(o)}">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">${i(o)}</span>
        <span class="th-cnt">${n.length}</span>
      </div>
      <div class="th-collapse-body${d?" collapsed":""}" style="max-height:${d?0:n.length*36+8}px">`;for(const h of n){const u=!w.has(h.name),k=!u,C=h.name.replace(/^mcp__[^_]+__/,"");e+=`<label class="th-i${k?" disabled":""}" style="cursor:pointer">
        <input type="checkbox" ${u?"checked":""} data-tool="${i(h.name)}" style="width:13px;height:13px;accent-color:#4f46e5;flex-shrink:0">
        <span class="nm" title="${i(h.name)}">${i(C)}</span>
        <span class="ds">${i((h.description||"").slice(0,28))}</span>
      </label>`}e+="</div></div>"}}e+="</div>",l.length&&(e+=`<div class="th-ftr" style="border-top:none;padding:6px 14px">
      <button class="th-btn-s th-rst" id="th-mcp-reset">全部启用</button>
      <button class="th-btn-s th-apl" id="th-mcp-apply">应用选择</button>
    </div>`),e+="</div>",e+=`<div class="th-mcp-section" id="th-mcp-add">
    <div class="th-sec-t" style="justify-content:space-between">
      添加服务
      <button class="th-btn-s" id="th-toggle-mode" style="font-size:10px;padding:2px 8px;background:#f3f4f6;color:#374151">${_?"简单模式":"JSON 配置"}</button>
    </div>
    <div class="th-mcp-scroll">`,_?e+=`<div style="display:flex;flex-direction:column;gap:6px;padding:4px 10px">
      <textarea id="th-json-input" rows="12" placeholder='粘贴 JSON 配置，例如：
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
}' style="padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;font-family:monospace;resize:none;line-height:1.4;height:192px"></textarea>
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
    </div>`,e+="</div></div></div>",t.innerHTML=e,W(t)}function W(t){var e,l,r,x,c;(e=t.querySelector("#th-toggle-mode"))==null||e.addEventListener("click",()=>{_=!_,A(t)}),t.querySelectorAll(".th-mcp-filter-tag[data-filter]").forEach(s=>{s.addEventListener("click",()=>{b=s.dataset.filter||null,A(t)})}),t.querySelectorAll(".th-i.server-item").forEach(s=>{s.addEventListener("click",a=>{if(a.target.closest(".th-rm-srv"))return;const n=s.dataset.srv;b=b===n?null:n,A(t)})}),t.querySelectorAll(".th-collapse-header[data-srv]").forEach(s=>{s.addEventListener("click",()=>{const a=s.dataset.srv;T.has(a)?T.delete(a):T.add(a);const o=s.nextElementSibling,n=T.has(a);s.classList.toggle("collapsed",n),o.classList.toggle("collapsed",n),o.style.maxHeight=n?"0px":`${o.querySelectorAll(".th-i").length*36+8}px`})}),t.querySelectorAll("input[data-tool]").forEach(s=>{s.addEventListener("change",()=>{s.checked?w.delete(s.dataset.tool):w.add(s.dataset.tool)})}),(l=t.querySelector("#th-mcp-reset"))==null||l.addEventListener("click",async()=>{await m.resetDeny(),w.clear(),N.clear(),M(t)}),(r=t.querySelector("#th-mcp-apply"))==null||r.addEventListener("click",async()=>{await m.denyTools([...w]),N=new Set(w),M(t)}),t.querySelectorAll(".th-rm-srv").forEach(s=>{s.addEventListener("click",async()=>{await m.removeMcpServer(s.dataset.srv),M(t)})}),(x=t.querySelector("#th-json-add"))==null||x.addEventListener("click",async()=>{const s=t.querySelector("#th-json-input"),a=t.querySelector("#th-json-error");if(!s)return;const o=s.value.trim();if(o)try{const n=JSON.parse(o),d=n.mcpServers?n:{mcpServers:n};a.style.display="none";const f=await m.addMcpBatch(d);if(!f.ok){a.textContent="连接失败",a.style.display="block";return}const h=f.results.filter(u=>!u.ok);h.length?(a.textContent=h.map(u=>`${u.serverName}: ${u.error}`).join("; "),a.style.display="block"):s.value="",setTimeout(()=>M(t),1500)}catch(n){a.textContent=`JSON 格式错误: ${n.message}`,a.style.display="block"}}),(c=t.querySelector("#th-srv-add"))==null||c.addEventListener("click",async()=>{const s=t.querySelector("#th-srv-name"),a=t.querySelector("#th-srv-transport"),o=t.querySelector("#th-srv-url"),n=t.querySelector("#th-srv-headers");if(!s||!o)return;const d=s.value.trim(),f=(a==null?void 0:a.value)||"streamable-http",h=o.value.trim();if(!d||!h)return;let u;const k=n==null?void 0:n.value.trim();if(k)try{u=JSON.parse(k)}catch{alert("Headers JSON 格式错误");return}const C=f==="stdio"?{serverName:d,transport:f,command:h}:{serverName:d,transport:f,url:h,headers:u},q=await m.addMcpServer(C);q.ok?setTimeout(()=>M(t),1500):alert(q.error||"连接失败")})}let j=[];async function F(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{j=(await m.getSkills()).skills,G(t)}catch{t.innerHTML='<div class="th-empty">暂无可用技能</div>'}}function G(t){if(!j.length){t.innerHTML='<div class="th-empty">暂无可用技能</div>';return}let e=`<div class="th-sec"><div class="th-sec-t">技能列表 <span class="th-cnt">${j.length}</span></div></div>`;for(const l of j){const r=l.modelInvocable?"模型":"用户";e+=`<div class="th-i">
      <span class="th-tg skl">${r}</span>
      <span class="nm">${i(l.name)}</span>
      <span class="ds">${i(l.description.slice(0,50))}</span>
    </div>`}t.innerHTML=e}(function(){if(document.getElementById("th-root"))return;const e=document.createElement("style");e.textContent=J,document.head.appendChild(e);const l=document.createElement("div");l.id="th-root",l.innerHTML=`
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
  `,document.body.appendChild(l);let r=!1,x="tools",c=700;const s=document.getElementById("th-btn"),a=document.getElementById("th-panel"),o=document.getElementById("th-body");let n=!1,d=!1,f=0,h=0,u=0,k=0;function C(){const p=s.getBoundingClientRect();return{x:p.left,y:p.top}}s.addEventListener("pointerdown",p=>{n=!0,d=!1,f=p.clientX,h=p.clientY;const g=C();u=g.x,k=g.y,s.classList.add("dragging"),s.setPointerCapture(p.pointerId),p.preventDefault()}),document.addEventListener("pointermove",p=>{if(!n)return;const g=p.clientX-f,y=p.clientY-h;(Math.abs(g)>3||Math.abs(y)>3)&&(d=!0);const $=u+g,U=k+y,K=window.innerWidth-44,Q=window.innerHeight-44,V=Math.max(0,Math.min(K,$)),Z=Math.max(0,Math.min(Q,U));s.style.left=`${V}px`,s.style.top=`${Z}px`,s.style.right="auto",s.style.bottom="auto"}),document.addEventListener("pointerup",p=>{n&&(n=!1,s.classList.remove("dragging"),d?r&&q():(r=!r,a.classList.toggle("open",r),r&&(q(),O())))});function q(){const p=s.getBoundingClientRect(),g=420;c=700;let y=p.top-c-12,$=p.right-g;y<8&&(y=p.bottom+12),$<8&&($=8),$+g>window.innerWidth-8&&($=window.innerWidth-g-8),y+c>window.innerHeight-8&&(y=window.innerHeight-c-8),a.style.top=`${y}px`,a.style.left=`${$}px`,a.style.right="auto",a.style.bottom="auto"}document.getElementById("th-cls").addEventListener("click",()=>{r=!1,a.classList.remove("open")}),l.querySelectorAll(".th-tabs button").forEach(p=>{p.addEventListener("click",()=>{x=p.dataset.tab,l.querySelectorAll(".th-tabs button").forEach(g=>g.classList.remove("active")),p.classList.add("active"),O()})});function O(){switch(x){case"tools":R(o);break;case"mcp":M(o);break;case"skills":F(o);break}}})()})();
