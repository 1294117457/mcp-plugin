(function(){"use strict";const D=`
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
`,R="/api/tohelper";async function N(t){return(await fetch(`${R}${t}`)).json()}async function M(t,e){return(await fetch(`${R}${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:e?JSON.stringify(e):void 0})).json()}const w={getTools:()=>N("/tools"),getSkills:()=>N("/skills"),getMcpServers:()=>N("/mcp/servers"),addMcpServer:t=>M("/mcp/add",t),addMcpBatch:t=>M("/mcp/add-batch",t),removeMcpServer:t=>M("/mcp/remove",{serverName:t}),denyTools:t=>M("/mcp/deny",{names:t}),resetDeny:()=>M("/mcp/reset"),getStatus:()=>N("/status")};function c(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}let B={ok:!1,builtin:[],mcp:[]},$="all",z=new Set,T=null;async function W(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{B=await w.getTools(),I(t)}catch(e){t.innerHTML=`<div class="th-empty">加载失败: ${c(e.message)}</div>`}}function F(t){const e=t.match(/^mcp__([^_]+)__/);return e?e[1]:"unknown"}function G(t){const e=new Map;for(const o of t){const l=F(o.name);e.has(l)||e.set(l,[]),e.get(l).push(o)}return e}function X(t,e,o){const l=t.description||"暂无描述";return`<div class="th-i-wrap${o?" expanded":""}" data-tool-id="${c(t.name)}">
    <div class="th-i clickable" title="${c(l)}">
      ${t.denied!==void 0?'<span class="th-tg mcp">MCP</span>':'<span style="color:#d1d5db;font-size:10px;flex-shrink:0">&#128274;</span>'}
      <span class="nm">${c(e)}</span>
      <span class="ds">${c(l.slice(0,40))}${l.length>40?"...":""}</span>
    </div>
    <div class="th-i-detail">
      <div class="detail-label">描述</div>
      <div class="detail-desc">${c(l)}</div>
      <div class="detail-label">完整名称</div>
      <div><span class="detail-name">${c(t.name)}</span></div>
    </div>
  </div>`}function I(t){const e=B.builtin,o=B.mcp.filter(n=>!n.denied),l=e.length,x=o.length,g=l+x,s=$==="all"||$==="builtin",a=$==="all"||$==="mcp";let i='<div class="th-tools-body">';if(i+=`<div class="th-tools-filter">
    <button class="${$==="all"?"active":""}" data-filter="all">
      使用中 <span class="n">${g}</span>
    </button>
    <button class="${$==="builtin"?"active":""}" data-filter="builtin">
      内置 <span class="n">${l}</span>
    </button>
    <button class="${$==="mcp"?"active":""}" data-filter="mcp">
      MCP <span class="n">${x}</span>
    </button>
  </div>`,i+='<div class="th-tools-scroll">',s&&l>0){const n=z.has("builtin");i+=`<div class="th-collapse-group">
      <div class="th-collapse-header${n?" collapsed":""}" data-srv="builtin">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">内置工具</span>
        <span class="th-cnt">${l}</span>
      </div>
      <div class="th-collapse-body${n?" collapsed":""}">`;for(const r of e)i+=X(r,r.name,T===r.name);i+="</div></div>"}if(a&&x>0){const r=[...G(o).entries()].sort((u,d)=>d[1].length-u[1].length);for(const[u,d]of r){const p=z.has(u);i+=`<div class="th-collapse-group">
        <div class="th-collapse-header${p?" collapsed":""}" data-srv="${c(u)}">
          <span class="arrow">&#9660;</span>
          <span class="srv-name">${c(u)}</span>
          <span class="th-cnt">${d.length}</span>
        </div>
        <div class="th-collapse-body${p?" collapsed":""}">`;for(const f of d){const S=f.name.replace(/^mcp__[^_]+__/,"");i+=X(f,S,T===f.name)}i+="</div></div>"}}g||(i+='<div class="th-empty">暂无工具（等待 Agent 创建）</div>'),i+="</div></div>",t.innerHTML=i,U(t)}function U(t){t.querySelectorAll(".th-tools-filter button").forEach(e=>{e.addEventListener("click",()=>{$=e.dataset.filter,I(t)})}),t.querySelectorAll(".th-collapse-header[data-srv]").forEach(e=>{e.addEventListener("click",()=>{const o=e.dataset.srv;z.has(o)?z.delete(o):z.add(o),I(t)})}),t.querySelectorAll(".th-i-wrap[data-tool-id]").forEach(e=>{const o=e.querySelector(".th-i");o==null||o.addEventListener("click",()=>{var x;const l=e.dataset.toolId;T===l?(T=null,e.classList.remove("expanded")):((x=t.querySelector(".th-i-wrap.expanded"))==null||x.classList.remove("expanded"),T=l,e.classList.add("expanded"))})})}function K(t,e){let o=`<div class="th-mcp-section" id="th-mcp-servers">
    <div class="th-sec-t">已连接 <span class="th-cnt">${t.length}</span></div>
    <div class="th-mcp-scroll">`;t.length||(o+='<div class="th-mcp-hint">暂无已连接的 MCP 服务</div>');for(const l of t){const x=e===l.serverName;o+=`<div class="th-i server-item clickable${x?" selected":""}" data-srv="${c(l.serverName)}">
      <span class="dot"></span>
      <span class="nm">${c(l.serverName)}</span>
      <span class="ds">${l.toolCount} 个工具 | ${c(l.transport)}</span>
      <button class="th-btn-s th-rst th-rm-srv" data-srv="${c(l.serverName)}" style="padding:2px 6px;font-size:10px;flex-shrink:0">断开</button>
    </div>`}return o+="</div></div>",o}function Q(t,e,o,l,x,g){const s=new Map;for(const d of t){const p=d.name.match(/^mcp__([^_]+)__/),f=p?p[1]:"unknown";s.has(f)||s.set(f,[]),s.get(f).push(d)}const a=[...s.entries()].sort((d,p)=>p[1].length-d[1].length),i=t.length,n=t.filter(d=>!o.has(d.name)).length;let r=`<div class="th-mcp-section flexible" id="th-mcp-tools">
    <div class="th-sec-t">
      MCP 工具
      <span class="th-cnt">${n}/${i}</span>
      ${l?`<span style="font-size:10px;color:#6b7280;font-weight:400;margin-left:4px">— ${c(l)}</span>`:'<span style="font-size:10px;color:#9ca3af;font-weight:400;margin-left:4px">全部</span>'}
    </div>`;r+=`<div class="th-mcp-filter-bar">
    <span class="th-mcp-filter-tag${!l?" active":""}" data-filter="">全部 <span class="cnt">${n}/${i}</span></span>`;for(const d of e){const p=s.get(d.serverName)??[],f=p.length;if(f===0)continue;const S=p.filter(k=>!o.has(k.name)).length;r+=`<span class="th-mcp-filter-tag${l===d.serverName?" active":""}" data-filter="${c(d.serverName)}">${c(d.serverName)} <span class="cnt">${S}/${f}</span></span>`}r+="</div>",r+='<div class="th-mcp-scroll">',a.length||(r+='<div class="th-mcp-hint">连接 MCP 服务后，工具将显示在此处</div>');for(const[d,p]of a){const f=g.has(d);if(l&&l!==d)continue;const k=p.filter(m=>!o.has(m.name)).length;r+=`<div class="th-collapse-group">
      <div class="th-collapse-header${f?" collapsed":""}" data-srv="${c(d)}">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">${c(d)}</span>
        <span class="th-cnt">${k}/${p.length}</span>
      </div>
      <div class="th-collapse-body${f?" collapsed":""}" style="max-height:${f?0:p.length*56+8}px">`;for(const m of p){const h=!o.has(m.name),b=!h,y=m.name.replace(/^mcp__[^_]+__/,""),v=m.description||"暂无描述",J=x===m.name;r+=`<div class="th-i-wrap${J?" expanded":""}" data-tool-id="${c(m.name)}">
        <label class="th-i${b?" disabled":""}" style="cursor:pointer" title="${c(v)}">
          <input type="checkbox" ${h?"checked":""} data-tool="${c(m.name)}" style="width:13px;height:13px;accent-color:#4f46e5;flex-shrink:0">
          <span class="nm" title="${c(m.name)}">${c(y)}</span>
          <span class="ds">${c(v.slice(0,28))}${v.length>28?"...":""}</span>
        </label>
        <div class="th-i-detail">
          <div class="detail-label">描述</div>
          <div class="detail-desc">${c(v)}</div>
          <div class="detail-label">完整名称</div>
          <div><span class="detail-name">${c(m.name)}</span></div>
        </div>
      </div>`}r+="</div></div>"}return r+="</div>",t.length&&(r+=`<div class="th-ftr" style="border-top:none;padding:6px 14px">
      <button class="th-btn-s th-rst" id="th-mcp-reset">全部启用</button>
      <button class="th-btn-s th-apl" id="th-mcp-apply">应用选择</button>
    </div>`),r+="</div>",r}function V(t){let e=`<div class="th-mcp-section add-section" id="th-mcp-add">
    <div class="th-sec-t" style="justify-content:space-between">
      添加服务
      <button class="th-btn-s" id="th-toggle-mode" style="font-size:10px;padding:2px 8px;background:#f3f4f6;color:#374151">${t?"简单模式":"JSON 配置"}</button>
    </div>
    <div class="th-mcp-scroll">`;return t?e+=`<div style="display:flex;flex-direction:column;gap:6px;padding:4px 10px 8px">
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
    </div>`:e+=`<div style="display:flex;flex-direction:column;gap:5px;padding:4px 10px 8px">
      <input id="th-srv-name" placeholder="服务名称" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <select id="th-srv-transport" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
        <option value="streamable-http">HTTP (streamable)</option>
        <option value="stdio">stdio (本地命令)</option>
      </select>
      <input id="th-srv-url" placeholder="URL（如 https://mcp.example.com）" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <input id="th-srv-headers" placeholder='Headers（可选）: {"Authorization":"Bearer ..."}' style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <button class="th-btn-s th-apl" id="th-srv-add" style="align-self:flex-end">连接</button>
    </div>`,e+="</div></div>",e}let Y={ok:!1,builtin:[],mcp:[]},P=[],_=new Set,E=new Set,O=!1,q=null,C=new Set,A=null;async function L(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{const[e,o]=await Promise.all([w.getTools(),w.getMcpServers()]);Y=e,P=o.servers,_=new Set(o.denied),E=new Set(_),H(t)}catch{t.innerHTML='<div class="th-empty">加载 MCP 数据失败</div>'}}function H(t){const e=Y.mcp||[];let o='<div class="th-mcp-body">';o+=K(P,q),o+=Q(e,P,E,q,A,C),o+=V(O),o+="</div>",t.innerHTML=o,Z(t)}function Z(t){var e,o,l,x,g;(e=t.querySelector("#th-toggle-mode"))==null||e.addEventListener("click",()=>{O=!O,H(t)}),t.querySelectorAll(".th-mcp-filter-tag[data-filter]").forEach(s=>{s.addEventListener("click",()=>{q=s.dataset.filter||null,H(t)})}),t.querySelectorAll(".th-i.server-item").forEach(s=>{s.addEventListener("click",a=>{if(a.target.closest(".th-rm-srv"))return;const n=s.dataset.srv;q=q===n?null:n,H(t)})}),t.querySelectorAll(".th-collapse-header[data-srv]").forEach(s=>{s.addEventListener("click",()=>{const a=s.dataset.srv;C.has(a)?C.delete(a):C.add(a);const i=s.nextElementSibling,n=C.has(a);s.classList.toggle("collapsed",n),i.classList.toggle("collapsed",n),i.style.maxHeight=n?"0px":`${i.querySelectorAll(".th-i-wrap").length*56+8}px`})}),t.querySelectorAll(".th-i-wrap[data-tool-id]").forEach(s=>{const a=s.querySelector(".nm");a==null||a.addEventListener("click",i=>{var r;i.preventDefault(),i.stopPropagation();const n=s.dataset.toolId;A===n?(A=null,s.classList.remove("expanded")):((r=t.querySelector(".th-i-wrap.expanded"))==null||r.classList.remove("expanded"),A=n,s.classList.add("expanded"))})}),t.querySelectorAll("input[data-tool]").forEach(s=>{s.addEventListener("change",()=>{s.checked?E.delete(s.dataset.tool):E.add(s.dataset.tool)})}),(o=t.querySelector("#th-mcp-reset"))==null||o.addEventListener("click",async()=>{await w.resetDeny(),E.clear(),_.clear(),L(t)}),(l=t.querySelector("#th-mcp-apply"))==null||l.addEventListener("click",async()=>{await w.denyTools([...E]),_=new Set(E),L(t)}),t.querySelectorAll(".th-rm-srv").forEach(s=>{s.addEventListener("click",async()=>{await w.removeMcpServer(s.dataset.srv),L(t)})}),(x=t.querySelector("#th-json-add"))==null||x.addEventListener("click",async()=>{const s=t.querySelector("#th-json-input"),a=t.querySelector("#th-json-error");if(!s)return;const i=s.value.trim();if(i)try{const n=JSON.parse(i),r=n.mcpServers?n:{mcpServers:n};a.style.display="none";const u=await w.addMcpBatch(r);if(!u.ok){a.textContent="连接失败",a.style.display="block";return}const d=u.results.filter(p=>!p.ok);d.length?(a.textContent=d.map(p=>`${p.serverName}: ${p.error}`).join("; "),a.style.display="block"):s.value="",setTimeout(()=>L(t),1500)}catch(n){a.textContent=`JSON 格式错误: ${n.message}`,a.style.display="block"}}),(g=t.querySelector("#th-srv-add"))==null||g.addEventListener("click",async()=>{const s=t.querySelector("#th-srv-name"),a=t.querySelector("#th-srv-transport"),i=t.querySelector("#th-srv-url"),n=t.querySelector("#th-srv-headers");if(!s||!i)return;const r=s.value.trim(),u=(a==null?void 0:a.value)||"streamable-http",d=i.value.trim();if(!r||!d)return;let p;const f=n==null?void 0:n.value.trim();if(f)try{p=JSON.parse(f)}catch{alert("Headers JSON 格式错误");return}const S=u==="stdio"?{serverName:r,transport:u,command:d}:{serverName:r,transport:u,url:d,headers:p},k=await w.addMcpServer(S);k.ok?setTimeout(()=>L(t),1500):alert(k.error||"连接失败")})}let j=[];async function tt(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{j=(await w.getSkills()).skills,et(t)}catch{t.innerHTML='<div class="th-empty">暂无可用技能</div>'}}function et(t){if(!j.length){t.innerHTML='<div class="th-empty">暂无可用技能</div>';return}let e=`<div class="th-sec"><div class="th-sec-t">技能列表 <span class="th-cnt">${j.length}</span></div></div>`;for(const o of j){const l=o.modelInvocable?"模型":"用户";e+=`<div class="th-i">
      <span class="th-tg skl">${l}</span>
      <span class="nm">${c(o.name)}</span>
      <span class="ds">${c(o.description.slice(0,50))}</span>
    </div>`}t.innerHTML=e}(function(){if(document.getElementById("th-root"))return;const e=document.createElement("style");e.textContent=D,document.head.appendChild(e);const o=document.createElement("div");o.id="th-root",o.innerHTML=`
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
  `,document.body.appendChild(o);let l=!1,x="tools",g=700;const s=document.getElementById("th-btn"),a=document.getElementById("th-panel"),i=document.getElementById("th-body");let n=!1,r=!1,u=0,d=0,p=0,f=0;function S(){const h=s.getBoundingClientRect();return{x:h.left,y:h.top}}s.addEventListener("pointerdown",h=>{n=!0,r=!1,u=h.clientX,d=h.clientY;const b=S();p=b.x,f=b.y,s.classList.add("dragging"),s.setPointerCapture(h.pointerId),h.preventDefault()}),document.addEventListener("pointermove",h=>{if(!n)return;const b=h.clientX-u,y=h.clientY-d;(Math.abs(b)>3||Math.abs(y)>3)&&(r=!0);const v=p+b,J=f+y,st=window.innerWidth-44,ot=window.innerHeight-44,lt=Math.max(0,Math.min(st,v)),at=Math.max(0,Math.min(ot,J));s.style.left=`${lt}px`,s.style.top=`${at}px`,s.style.right="auto",s.style.bottom="auto"}),document.addEventListener("pointerup",h=>{n&&(n=!1,s.classList.remove("dragging"),r?l&&k():(l=!l,a.classList.toggle("open",l),l&&(k(),m())))});function k(){const h=s.getBoundingClientRect(),b=420;g=700;let y=h.top-g-12,v=h.right-b;y<8&&(y=h.bottom+12),v<8&&(v=8),v+b>window.innerWidth-8&&(v=window.innerWidth-b-8),y+g>window.innerHeight-8&&(y=window.innerHeight-g-8),a.style.top=`${y}px`,a.style.left=`${v}px`,a.style.right="auto",a.style.bottom="auto"}document.getElementById("th-cls").addEventListener("click",()=>{l=!1,a.classList.remove("open")}),o.querySelectorAll(".th-tabs button").forEach(h=>{h.addEventListener("click",()=>{x=h.dataset.tab,o.querySelectorAll(".th-tabs button").forEach(b=>b.classList.remove("active")),h.classList.add("active"),m()})});function m(){switch(x){case"tools":W(i);break;case"mcp":L(i);break;case"skills":tt(i);break}}})()})();
