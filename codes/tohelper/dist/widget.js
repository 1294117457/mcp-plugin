(function(){"use strict";const K=`
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
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  border: none;
  user-select: none;
  touch-action: none;
}
#th-btn canvas {
  border-radius: 12px;
  pointer-events: none;
}
#th-btn:hover { transform: scale(1.05); }
#th-btn:active { cursor: grabbing; }
#th-btn.dragging {
  cursor: grabbing;
  transform: scale(1.1);
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

/* --- Tool detail expand --- */
.th-i-wrap {
  border-bottom: 1px solid transparent;
}
.th-i-wrap.expanded {
  background: #f9fafb;
  border-bottom-color: #f3f4f6;
  border-radius: 6px;
  margin: 2px 6px;
}
.th-i-wrap.expanded > .th-i { background: transparent; }
.th-i-detail {
  display: none;
  padding: 4px 14px 10px 38px;
  font-size: 11px;
  line-height: 1.5;
  color: #4b5563;
  word-break: break-word;
}
.th-i-wrap.expanded .th-i-detail { display: block; }
.th-i-detail .detail-label {
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 2px;
}
.th-i-detail .detail-desc {
  color: #374151;
  margin-bottom: 6px;
}
.th-i-detail .detail-name {
  font-family: monospace;
  font-size: 10px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
}

/* --- Collapsible Group (shared) --- */
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
`+`
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
`+`
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
  max-height: 130px;
}
.th-mcp-section:last-child { border-bottom: none; }
.th-mcp-section.flexible {
  flex: 1;
  min-height: 120px;
  max-height: none;
  overflow: hidden;
}
.th-mcp-section.add-section {
  max-height: 220px;
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
  flex: 1;
  min-height: 0;
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
`,U="/api/tohelper";async function I(e){return(await fetch(`${U}${e}`)).json()}async function C(e,s){return(await fetch(`${U}${e}`,{method:"POST",headers:{"Content-Type":"application/json"},body:s?JSON.stringify(s):void 0})).json()}const L={getTools:()=>I("/tools"),getSkills:()=>I("/skills"),getMcpServers:()=>I("/mcp/servers"),addMcpServer:e=>C("/mcp/add",e),addMcpBatch:e=>C("/mcp/add-batch",e),removeMcpServer:e=>C("/mcp/remove",{serverName:e}),denyTools:e=>C("/mcp/deny",{names:e}),resetDeny:()=>C("/mcp/reset"),getStatus:()=>I("/status")};function p(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}let J={ok:!1,builtin:[],mcp:[]},A="all",q=new Set,_=null;async function Q(e){e.innerHTML='<div class="th-empty">加载中...</div>';try{J=await L.getTools(),W(e)}catch(s){e.innerHTML=`<div class="th-empty">加载失败: ${p(s.message)}</div>`}}function ee(e){const s=e.match(/^mcp__([^_]+)__/);return s?s[1]:"unknown"}function te(e){const s=new Map;for(const n of e){const o=ee(n.name);s.has(o)||s.set(o,[]),s.get(o).push(n)}return s}function G(e,s,n){const o=e.description||"暂无描述";return`<div class="th-i-wrap${n?" expanded":""}" data-tool-id="${p(e.name)}">
    <div class="th-i clickable" title="${p(o)}">
      ${e.denied!==void 0?'<span class="th-tg mcp">MCP</span>':'<span style="color:#d1d5db;font-size:10px;flex-shrink:0">&#128274;</span>'}
      <span class="nm">${p(s)}</span>
      <span class="ds">${p(o.slice(0,40))}${o.length>40?"...":""}</span>
    </div>
    <div class="th-i-detail">
      <div class="detail-label">描述</div>
      <div class="detail-desc">${p(o)}</div>
      <div class="detail-label">完整名称</div>
      <div><span class="detail-name">${p(e.name)}</span></div>
    </div>
  </div>`}function W(e){const s=J.builtin,n=J.mcp.filter(l=>!l.denied),o=s.length,r=n.length,x=o+r,t=A==="all"||A==="builtin",i=A==="all"||A==="mcp";let d='<div class="th-tools-body">';if(d+=`<div class="th-tools-filter">
    <button class="${A==="all"?"active":""}" data-filter="all">
      使用中 <span class="n">${x}</span>
    </button>
    <button class="${A==="builtin"?"active":""}" data-filter="builtin">
      内置 <span class="n">${o}</span>
    </button>
    <button class="${A==="mcp"?"active":""}" data-filter="mcp">
      MCP <span class="n">${r}</span>
    </button>
  </div>`,d+='<div class="th-tools-scroll">',t&&o>0){const l=q.has("builtin");d+=`<div class="th-collapse-group">
      <div class="th-collapse-header${l?" collapsed":""}" data-srv="builtin">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">内置工具</span>
        <span class="th-cnt">${o}</span>
      </div>
      <div class="th-collapse-body${l?" collapsed":""}">`;for(const a of s)d+=G(a,a.name,_===a.name);d+="</div></div>"}if(i&&r>0){const a=[...te(n).entries()].sort((m,c)=>c[1].length-m[1].length);for(const[m,c]of a){const h=q.has(m);d+=`<div class="th-collapse-group">
        <div class="th-collapse-header${h?" collapsed":""}" data-srv="${p(m)}">
          <span class="arrow">&#9660;</span>
          <span class="srv-name">${p(m)}</span>
          <span class="th-cnt">${c.length}</span>
        </div>
        <div class="th-collapse-body${h?" collapsed":""}">`;for(const u of c){const v=u.name.replace(/^mcp__[^_]+__/,"");d+=G(u,v,_===u.name)}d+="</div></div>"}}x||(d+='<div class="th-empty">暂无工具（等待 Agent 创建）</div>'),d+="</div></div>",e.innerHTML=d,se(e)}function se(e){e.querySelectorAll(".th-tools-filter button").forEach(s=>{s.addEventListener("click",()=>{A=s.dataset.filter,W(e)})}),e.querySelectorAll(".th-collapse-header[data-srv]").forEach(s=>{s.addEventListener("click",()=>{const n=s.dataset.srv;q.has(n)?q.delete(n):q.add(n),W(e)})}),e.querySelectorAll(".th-i-wrap[data-tool-id]").forEach(s=>{const n=s.querySelector(".th-i");n==null||n.addEventListener("click",()=>{var r;const o=s.dataset.toolId;_===o?(_=null,s.classList.remove("expanded")):((r=e.querySelector(".th-i-wrap.expanded"))==null||r.classList.remove("expanded"),_=o,s.classList.add("expanded"))})})}function ne(e,s){let n=`<div class="th-mcp-section" id="th-mcp-servers">
    <div class="th-sec-t">已连接 <span class="th-cnt">${e.length}</span></div>
    <div class="th-mcp-scroll">`;e.length||(n+='<div class="th-mcp-hint">暂无已连接的 MCP 服务</div>');for(const o of e){const r=s===o.serverName;n+=`<div class="th-i server-item clickable${r?" selected":""}" data-srv="${p(o.serverName)}">
      <span class="dot"></span>
      <span class="nm">${p(o.serverName)}</span>
      <span class="ds">${o.toolCount} 个工具 | ${p(o.transport)}</span>
      <button class="th-btn-s th-rst th-rm-srv" data-srv="${p(o.serverName)}" style="padding:2px 6px;font-size:10px;flex-shrink:0">断开</button>
    </div>`}return n+="</div></div>",n}function oe(e,s,n,o,r,x){const t=new Map;for(const c of e){const h=c.name.match(/^mcp__([^_]+)__/),u=h?h[1]:"unknown";t.has(u)||t.set(u,[]),t.get(u).push(c)}const i=[...t.entries()].sort((c,h)=>h[1].length-c[1].length),d=e.length,l=e.filter(c=>!n.has(c.name)).length;let a=`<div class="th-mcp-section flexible" id="th-mcp-tools">
    <div class="th-sec-t">
      MCP 工具
      <span class="th-cnt">${l}/${d}</span>
      ${o?`<span style="font-size:10px;color:#6b7280;font-weight:400;margin-left:4px">— ${p(o)}</span>`:'<span style="font-size:10px;color:#9ca3af;font-weight:400;margin-left:4px">全部</span>'}
    </div>`;a+=`<div class="th-mcp-filter-bar">
    <span class="th-mcp-filter-tag${!o?" active":""}" data-filter="">全部 <span class="cnt">${l}/${d}</span></span>`;for(const c of s){const h=t.get(c.serverName)??[],u=h.length;if(u===0)continue;const v=h.filter(b=>!n.has(b.name)).length;a+=`<span class="th-mcp-filter-tag${o===c.serverName?" active":""}" data-filter="${p(c.serverName)}">${p(c.serverName)} <span class="cnt">${v}/${u}</span></span>`}a+="</div>",a+='<div class="th-mcp-scroll">',i.length||(a+='<div class="th-mcp-hint">连接 MCP 服务后，工具将显示在此处</div>');for(const[c,h]of i){const u=x.has(c);if(o&&o!==c)continue;const b=h.filter(y=>!n.has(y.name)).length;a+=`<div class="th-collapse-group">
      <div class="th-collapse-header${u?" collapsed":""}" data-srv="${p(c)}">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">${p(c)}</span>
        <span class="th-cnt">${b}/${h.length}</span>
      </div>
      <div class="th-collapse-body${u?" collapsed":""}" style="max-height:${u?0:h.length*56+8}px">`;for(const y of h){const $=!n.has(y.name),f=!$,w=y.name.replace(/^mcp__[^_]+__/,""),k=y.description||"暂无描述",E=r===y.name;a+=`<div class="th-i-wrap${E?" expanded":""}" data-tool-id="${p(y.name)}">
        <label class="th-i${f?" disabled":""}" style="cursor:pointer" title="${p(k)}">
          <input type="checkbox" ${$?"checked":""} data-tool="${p(y.name)}" style="width:13px;height:13px;accent-color:#4f46e5;flex-shrink:0">
          <span class="nm" title="${p(y.name)}">${p(w)}</span>
          <span class="ds">${p(k.slice(0,28))}${k.length>28?"...":""}</span>
        </label>
        <div class="th-i-detail">
          <div class="detail-label">描述</div>
          <div class="detail-desc">${p(k)}</div>
          <div class="detail-label">完整名称</div>
          <div><span class="detail-name">${p(y.name)}</span></div>
        </div>
      </div>`}a+="</div></div>"}return a+="</div>",e.length&&(a+=`<div class="th-ftr" style="border-top:none;padding:6px 14px">
      <button class="th-btn-s th-rst" id="th-mcp-reset">全部启用</button>
      <button class="th-btn-s th-apl" id="th-mcp-apply">应用选择</button>
    </div>`),a+="</div>",a}function ae(e){let s=`<div class="th-mcp-section add-section" id="th-mcp-add">
    <div class="th-sec-t" style="justify-content:space-between">
      添加服务
      <button class="th-btn-s" id="th-toggle-mode" style="font-size:10px;padding:2px 8px;background:#f3f4f6;color:#374151">${e?"简单模式":"JSON 配置"}</button>
    </div>
    <div class="th-mcp-scroll">`;return e?s+=`<div style="display:flex;flex-direction:column;gap:6px;padding:4px 10px 8px">
      <textarea id="th-json-input" rows="6" placeholder='粘贴 JSON 配置，例如：
{
  "mcpServers": {
    "my-server": {
      "type": "streamablehttp",
      "url": "https://..."
    }
  }
}' style="padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;font-family:monospace;resize:none;line-height:1.4;height:120px"></textarea>
      <div id="th-json-error" style="color:#dc2626;font-size:10px;display:none"></div>
      <button class="th-btn-s th-apl" id="th-json-add" style="align-self:flex-end">连接</button>
    </div>`:s+=`<div style="display:flex;flex-direction:column;gap:5px;padding:4px 10px 8px">
      <input id="th-srv-name" placeholder="服务名称" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <select id="th-srv-transport" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
        <option value="streamable-http">HTTP (streamable)</option>
        <option value="stdio">stdio (本地命令)</option>
      </select>
      <input id="th-srv-url" placeholder="URL（如 https://mcp.example.com）" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <input id="th-srv-headers" placeholder='Headers（可选）: {"Authorization":"Bearer ..."}' style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <button class="th-btn-s th-apl" id="th-srv-add" style="align-self:flex-end">连接</button>
    </div>`,s+="</div></div>",s}let V={ok:!1,builtin:[],mcp:[]},X=[],B=new Set,T=new Set,Y=!1,N=null,P=new Set,j=null;async function z(e){e.innerHTML='<div class="th-empty">加载中...</div>';try{const[s,n]=await Promise.all([L.getTools(),L.getMcpServers()]);V=s,X=n.servers,B=new Set(n.denied),T=new Set(B),R(e)}catch{e.innerHTML='<div class="th-empty">加载 MCP 数据失败</div>'}}function R(e){const s=V.mcp||[];let n='<div class="th-mcp-body">';n+=ne(X,N),n+=oe(s,X,T,N,j,P),n+=ae(Y),n+="</div>",e.innerHTML=n,le(e)}function le(e){var s,n,o,r,x;(s=e.querySelector("#th-toggle-mode"))==null||s.addEventListener("click",()=>{Y=!Y,R(e)}),e.querySelectorAll(".th-mcp-filter-tag[data-filter]").forEach(t=>{t.addEventListener("click",()=>{N=t.dataset.filter||null,R(e)})}),e.querySelectorAll(".th-i.server-item").forEach(t=>{t.addEventListener("click",i=>{if(i.target.closest(".th-rm-srv"))return;const l=t.dataset.srv;N=N===l?null:l,R(e)})}),e.querySelectorAll(".th-collapse-header[data-srv]").forEach(t=>{t.addEventListener("click",()=>{const i=t.dataset.srv;P.has(i)?P.delete(i):P.add(i);const d=t.nextElementSibling,l=P.has(i);t.classList.toggle("collapsed",l),d.classList.toggle("collapsed",l),d.style.maxHeight=l?"0px":`${d.querySelectorAll(".th-i-wrap").length*56+8}px`})}),e.querySelectorAll(".th-i-wrap[data-tool-id]").forEach(t=>{const i=t.querySelector(".nm");i==null||i.addEventListener("click",d=>{var a;d.preventDefault(),d.stopPropagation();const l=t.dataset.toolId;j===l?(j=null,t.classList.remove("expanded")):((a=e.querySelector(".th-i-wrap.expanded"))==null||a.classList.remove("expanded"),j=l,t.classList.add("expanded"))})}),e.querySelectorAll("input[data-tool]").forEach(t=>{t.addEventListener("change",()=>{t.checked?T.delete(t.dataset.tool):T.add(t.dataset.tool)})}),(n=e.querySelector("#th-mcp-reset"))==null||n.addEventListener("click",async()=>{await L.resetDeny(),T.clear(),B.clear(),z(e)}),(o=e.querySelector("#th-mcp-apply"))==null||o.addEventListener("click",async()=>{await L.denyTools([...T]),B=new Set(T),z(e)}),e.querySelectorAll(".th-rm-srv").forEach(t=>{t.addEventListener("click",async()=>{await L.removeMcpServer(t.dataset.srv),z(e)})}),(r=e.querySelector("#th-json-add"))==null||r.addEventListener("click",async()=>{const t=e.querySelector("#th-json-input"),i=e.querySelector("#th-json-error");if(!t)return;const d=t.value.trim();if(d)try{const l=JSON.parse(d),a=l.mcpServers?l:{mcpServers:l};i.style.display="none";const m=await L.addMcpBatch(a);if(!m.ok){i.textContent="连接失败",i.style.display="block";return}const c=m.results.filter(h=>!h.ok);c.length?(i.textContent=c.map(h=>`${h.serverName}: ${h.error}`).join("; "),i.style.display="block"):t.value="",setTimeout(()=>z(e),1500)}catch(l){i.textContent=`JSON 格式错误: ${l.message}`,i.style.display="block"}}),(x=e.querySelector("#th-srv-add"))==null||x.addEventListener("click",async()=>{const t=e.querySelector("#th-srv-name"),i=e.querySelector("#th-srv-transport"),d=e.querySelector("#th-srv-url"),l=e.querySelector("#th-srv-headers");if(!t||!d)return;const a=t.value.trim(),m=(i==null?void 0:i.value)||"streamable-http",c=d.value.trim();if(!a||!c)return;let h;const u=l==null?void 0:l.value.trim();if(u)try{h=JSON.parse(u)}catch{alert("Headers JSON 格式错误");return}const v=m==="stdio"?{serverName:a,transport:m,command:c}:{serverName:a,transport:m,url:c,headers:h},b=await L.addMcpServer(v);b.ok?setTimeout(()=>z(e),1500):alert(b.error||"连接失败")})}let O=[];async function ie(e){e.innerHTML='<div class="th-empty">加载中...</div>';try{O=(await L.getSkills()).skills,re(e)}catch{e.innerHTML='<div class="th-empty">暂无可用技能</div>'}}function re(e){if(!O.length){e.innerHTML='<div class="th-empty">暂无可用技能</div>';return}let s=`<div class="th-sec"><div class="th-sec-t">技能列表 <span class="th-cnt">${O.length}</span></div></div>`;for(const n of O){const o=n.modelInvocable?"模型":"用户";s+=`<div class="th-i">
      <span class="th-tg skl">${o}</span>
      <span class="nm">${p(n.name)}</span>
      <span class="ds">${p(n.description.slice(0,50))}</span>
    </div>`}e.innerHTML=s}const Z={idle:{name:"test1",loop:!0},open:{name:"test1",loop:!0},walk:{name:"test1",loop:!0},jump:{name:"test1",loop:!1},run:{name:"test1",loop:!0}};async function de(e,s,n){if(typeof spine>"u"||!spine.webgl)throw new Error("spine 3.8 webgl runtime not loaded");const o=window.devicePixelRatio??2,r=document.createElement("canvas");r.width=e*o,r.height=s*o,r.style.width=`${e}px`,r.style.height=`${s}px`;const x=r.getContext("webgl",{alpha:!0,premultipliedAlpha:!1});if(!x)throw new Error("WebGL unavailable");x.enable(x.BLEND),x.blendFunc(x.SRC_ALPHA,x.ONE_MINUS_SRC_ALPHA);const t=new spine.webgl.ManagedWebGLRenderingContext(x),i=spine.webgl.Shader.newTwoColoredTextured(t),d=new spine.webgl.PolygonBatcher(t),l=new spine.webgl.SkeletonRenderer(t),a=new spine.webgl.AssetManager(t,n),m=new spine.webgl.Matrix4;m.ortho2d(0,0,r.width,r.height),x.viewport(0,0,r.width,r.height),a.loadText("skeleton.json"),a.loadTextureAtlas("skeleton.atlas"),await new Promise((g,S)=>{const M=()=>{a.isLoadingComplete()?a.hasErrors()?S(new Error("Spine asset load failed: "+JSON.stringify(a.getErrors()))):g():requestAnimationFrame(M)};M()});const c=a.get("skeleton.atlas"),h=new spine.AtlasAttachmentLoader(c),u=new spine.SkeletonJson(h);u.scale=.18*o;const v=u.readSkeletonData(a.get("skeleton.json")),b=new spine.Skeleton(v);b.setToSetupPose(),b.x=r.width/2,b.y=r.height*.05;const y=new spine.AnimationStateData(v);y.defaultMix=.3;const $=new spine.AnimationState(y),f=v.findAnimation("test1")||v.animations[0];f&&$.setAnimation(0,f.name,!0),b.updateWorldTransform();let w="idle",k=!1,E=Date.now()/1e3,H=0;function F(){if(k)return;const g=Date.now()/1e3,S=Math.min(g-E,.1);E=g,x.clearColor(0,0,0,0),x.clear(x.COLOR_BUFFER_BIT),$.update(S),$.apply(b),b.updateWorldTransform(),i.bind(),i.setUniformi(spine.webgl.Shader.SAMPLER,0),i.setUniform4x4f(spine.webgl.Shader.MVP_MATRIX,m.values),d.begin(i),l.premultipliedAlpha=!1,l.draw(d,b),d.end(),i.unbind(),H=requestAnimationFrame(F)}return H=requestAnimationFrame(F),{canvas:r,setState(g){if(g===w)return;w=g;const S=Z[g];S&&v.findAnimation(S.name)&&$.setAnimation(0,S.name,S.loop)},playOnce(g,S){if(v.findAnimation(g)&&($.setAnimation(0,g,!1),S)){const M=Z[S];M&&v.findAnimation(M.name)&&$.addAnimation(0,M.name,M.loop,0)}},resize(g,S){r.width=g*o,r.height=S*o,r.style.width=`${g}px`,r.style.height=`${S}px`,m.ortho2d(0,0,r.width,r.height),x.viewport(0,0,r.width,r.height),b.x=r.width/2,b.y=r.height*.05},dispose(){var g;k=!0,cancelAnimationFrame(H),$.clearTracks(),$.clearListeners(),a.removeAll(),(g=a.dispose)==null||g.call(a)}}}const ce="/api/tohelper/spine/",D=80;(async function(){if(document.getElementById("th-root"))return;const s=document.createElement("style");s.textContent=K,document.head.appendChild(s);const n=document.createElement("div");n.id="th-root",n.innerHTML=`
    <div id="th-btn"></div>
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
  `,document.body.appendChild(n);let o=!1,r="tools",x=700;const t=document.getElementById("th-btn"),i=document.getElementById("th-panel"),d=document.getElementById("th-body");let l=null;try{l=await de(D,D,ce),t.appendChild(l.canvas)}catch(f){console.warn("[tohelper] Spine load failed, using fallback:",f),t.innerHTML=`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>`}let a=!1,m=!1,c=0,h=0,u=0,v=0;function b(){const f=t.getBoundingClientRect();return{x:f.left,y:f.top}}t.addEventListener("pointerdown",f=>{a=!0,m=!1,c=f.clientX,h=f.clientY;const w=b();u=w.x,v=w.y,t.classList.add("dragging"),t.setPointerCapture(f.pointerId),f.preventDefault()}),document.addEventListener("pointermove",f=>{if(!a)return;const w=f.clientX-c,k=f.clientY-h;(Math.abs(w)>3||Math.abs(k)>3)&&(m=!0);const E=u+w,H=v+k,F=window.innerWidth-D,g=window.innerHeight-D,S=Math.max(0,Math.min(F,E)),M=Math.max(0,Math.min(g,H));t.style.left=`${S}px`,t.style.top=`${M}px`,t.style.right="auto",t.style.bottom="auto"}),document.addEventListener("pointerup",f=>{a&&(a=!1,t.classList.remove("dragging"),m?o&&y():(o=!o,i.classList.toggle("open",o),o?(l==null||l.setState("open"),y(),$()):l==null||l.setState("idle")))});function y(){const f=t.getBoundingClientRect(),w=420;x=700;let k=f.top-x-12,E=f.right-w;k<8&&(k=f.bottom+12),E<8&&(E=8),E+w>window.innerWidth-8&&(E=window.innerWidth-w-8),k+x>window.innerHeight-8&&(k=window.innerHeight-x-8),i.style.top=`${k}px`,i.style.left=`${E}px`,i.style.right="auto",i.style.bottom="auto"}document.getElementById("th-cls").addEventListener("click",()=>{o=!1,i.classList.remove("open"),l==null||l.setState("idle")}),n.querySelectorAll(".th-tabs button").forEach(f=>{f.addEventListener("click",()=>{r=f.dataset.tab,n.querySelectorAll(".th-tabs button").forEach(w=>w.classList.remove("active")),f.classList.add("active"),$()})});function $(){switch(r){case"tools":Q(d);break;case"mcp":z(d);break;case"skills":ie(d);break}}})()})();
