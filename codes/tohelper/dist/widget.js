(function(){"use strict";const Y=`
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
`,J="/api/tohelper";async function _(t){return(await fetch(`${J}${t}`)).json()}async function z(t,e){return(await fetch(`${J}${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:e?JSON.stringify(e):void 0})).json()}const y={getTools:()=>_("/tools"),getSkills:()=>_("/skills"),getMcpServers:()=>_("/mcp/servers"),addMcpServer:t=>z("/mcp/add",t),addMcpBatch:t=>z("/mcp/add-batch",t),removeMcpServer:t=>z("/mcp/remove",{serverName:t}),denyTools:t=>z("/mcp/deny",{names:t}),resetDeny:()=>z("/mcp/reset"),getStatus:()=>_("/status")};function d(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}let P={ok:!1,builtin:[],mcp:[]},w="all",T=new Set,q=null;async function D(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{P=await y.getTools(),O(t)}catch(e){t.innerHTML=`<div class="th-empty">加载失败: ${d(e.message)}</div>`}}function W(t){const e=t.match(/^mcp__([^_]+)__/);return e?e[1]:"unknown"}function F(t){const e=new Map;for(const l of t){const n=W(l.name);e.has(n)||e.set(n,[]),e.get(n).push(l)}return e}function R(t,e,l){const n=t.description||"暂无描述";return`<div class="th-i-wrap${l?" expanded":""}" data-tool-id="${d(t.name)}">
    <div class="th-i clickable" title="${d(n)}">
      ${t.denied!==void 0?'<span class="th-tg mcp">MCP</span>':'<span style="color:#d1d5db;font-size:10px;flex-shrink:0">&#128274;</span>'}
      <span class="nm">${d(e)}</span>
      <span class="ds">${d(n.slice(0,40))}${n.length>40?"...":""}</span>
    </div>
    <div class="th-i-detail">
      <div class="detail-label">描述</div>
      <div class="detail-desc">${d(n)}</div>
      <div class="detail-label">完整名称</div>
      <div><span class="detail-name">${d(t.name)}</span></div>
    </div>
  </div>`}function O(t){const e=P.builtin,l=P.mcp.filter(a=>!a.denied),n=e.length,x=l.length,u=n+x,o=w==="all"||w==="builtin",i=w==="all"||w==="mcp";let s='<div class="th-tools-body">';if(s+=`<div class="th-tools-filter">
    <button class="${w==="all"?"active":""}" data-filter="all">
      使用中 <span class="n">${u}</span>
    </button>
    <button class="${w==="builtin"?"active":""}" data-filter="builtin">
      内置 <span class="n">${n}</span>
    </button>
    <button class="${w==="mcp"?"active":""}" data-filter="mcp">
      MCP <span class="n">${x}</span>
    </button>
  </div>`,s+='<div class="th-tools-scroll">',o&&n>0){const a=T.has("builtin");s+=`<div class="th-collapse-group">
      <div class="th-collapse-header${a?" collapsed":""}" data-srv="builtin">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">内置工具</span>
        <span class="th-cnt">${n}</span>
      </div>
      <div class="th-collapse-body${a?" collapsed":""}">`;for(const r of e)s+=R(r,r.name,q===r.name);s+="</div></div>"}if(i&&x>0){const r=[...F(l).entries()].sort((h,f)=>f[1].length-h[1].length);for(const[h,f]of r){const c=T.has(h);s+=`<div class="th-collapse-group">
        <div class="th-collapse-header${c?" collapsed":""}" data-srv="${d(h)}">
          <span class="arrow">&#9660;</span>
          <span class="srv-name">${d(h)}</span>
          <span class="th-cnt">${f.length}</span>
        </div>
        <div class="th-collapse-body${c?" collapsed":""}">`;for(const v of f){const $=v.name.replace(/^mcp__[^_]+__/,"");s+=R(v,$,q===v.name)}s+="</div></div>"}}u||(s+='<div class="th-empty">暂无工具（等待 Agent 创建）</div>'),s+="</div></div>",t.innerHTML=s,G(t)}function G(t){t.querySelectorAll(".th-tools-filter button").forEach(e=>{e.addEventListener("click",()=>{w=e.dataset.filter,O(t)})}),t.querySelectorAll(".th-collapse-header[data-srv]").forEach(e=>{e.addEventListener("click",()=>{const l=e.dataset.srv;T.has(l)?T.delete(l):T.add(l),O(t)})}),t.querySelectorAll(".th-i-wrap[data-tool-id]").forEach(e=>{const l=e.querySelector(".th-i");l==null||l.addEventListener("click",()=>{var x;const n=e.dataset.toolId;q===n?(q=null,e.classList.remove("expanded")):((x=t.querySelector(".th-i-wrap.expanded"))==null||x.classList.remove("expanded"),q=n,e.classList.add("expanded"))})})}let X={ok:!1,builtin:[],mcp:[]},C=[],H=new Set,g=new Set,A=!1,m=null,N=new Set,j=null;async function M(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{const[e,l]=await Promise.all([y.getTools(),y.getMcpServers()]);X=e,C=l.servers,H=new Set(l.denied),g=new Set(H),B(t)}catch{t.innerHTML='<div class="th-empty">加载 MCP 数据失败</div>'}}function B(t){let e="";e+='<div class="th-mcp-body">',e+=`<div class="th-mcp-section" id="th-mcp-servers">
    <div class="th-sec-t">已连接 <span class="th-cnt">${C.length}</span></div>
    <div class="th-mcp-scroll">`,C.length||(e+='<div class="th-mcp-hint">暂无已连接的 MCP 服务</div>');for(const s of C){const a=m===s.serverName;e+=`<div class="th-i server-item clickable${a?" selected":""}" data-srv="${d(s.serverName)}">
      <span class="dot"></span>
      <span class="nm">${d(s.serverName)}</span>
      <span class="ds">${s.toolCount} 个工具 | ${d(s.transport)}</span>
      <button class="th-btn-s th-rst th-rm-srv" data-srv="${d(s.serverName)}" style="padding:2px 6px;font-size:10px;flex-shrink:0">断开</button>
    </div>`}e+="</div></div>";const l=X.mcp||[],n=new Map;for(const s of l){const a=s.name.match(/^mcp__([^_]+)__/),r=a?a[1]:"unknown";n.has(r)||n.set(r,[]),n.get(r).push(s)}const x=[...n.entries()].sort((s,a)=>a[1].length-s[1].length),u=!m,o=l.length,i=l.filter(s=>!g.has(s.name)).length;e+=`<div class="th-mcp-section flexible" id="th-mcp-tools">
    <div class="th-sec-t">
      MCP 工具
      <span class="th-cnt">${i}/${o}</span>
      ${m?`<span style="font-size:10px;color:#6b7280;font-weight:400;margin-left:4px">— ${d(m)}</span>`:'<span style="font-size:10px;color:#9ca3af;font-weight:400;margin-left:4px">全部</span>'}
    </div>`,e+=`<div class="th-mcp-filter-bar">
    <span class="th-mcp-filter-tag${u?" active":""}" data-filter="">全部 <span class="cnt">${i}/${o}</span></span>`;for(const s of C){const a=n.get(s.serverName)??[],r=a.length;if(r===0)continue;const h=a.filter(f=>!g.has(f.name)).length;e+=`<span class="th-mcp-filter-tag${m===s.serverName?" active":""}" data-filter="${d(s.serverName)}">${d(s.serverName)} <span class="cnt">${h}/${r}</span></span>`}e+="</div>",e+='<div class="th-mcp-scroll">',x.length||(e+='<div class="th-mcp-hint">连接 MCP 服务后，工具将显示在此处</div>');for(const[s,a]of x){const r=N.has(s);if(m&&m!==s)continue;const f=a.filter(c=>!g.has(c.name)).length;e+=`<div class="th-collapse-group">
      <div class="th-collapse-header${r?" collapsed":""}" data-srv="${d(s)}">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">${d(s)}</span>
        <span class="th-cnt">${f}/${a.length}</span>
      </div>
      <div class="th-collapse-body${r?" collapsed":""}" style="max-height:${r?0:a.length*56+8}px">`;for(const c of a){const v=!g.has(c.name),$=!v,S=c.name.replace(/^mcp__[^_]+__/,""),E=c.description||"暂无描述",p=j===c.name;e+=`<div class="th-i-wrap${p?" expanded":""}" data-tool-id="${d(c.name)}">
        <label class="th-i${$?" disabled":""}" style="cursor:pointer" title="${d(E)}">
          <input type="checkbox" ${v?"checked":""} data-tool="${d(c.name)}" style="width:13px;height:13px;accent-color:#4f46e5;flex-shrink:0">
          <span class="nm" title="${d(c.name)}">${d(S)}</span>
          <span class="ds">${d(E.slice(0,28))}${E.length>28?"...":""}</span>
        </label>
        <div class="th-i-detail">
          <div class="detail-label">描述</div>
          <div class="detail-desc">${d(E)}</div>
          <div class="detail-label">完整名称</div>
          <div><span class="detail-name">${d(c.name)}</span></div>
        </div>
      </div>`}e+="</div></div>"}e+="</div>",l.length&&(e+=`<div class="th-ftr" style="border-top:none;padding:6px 14px">
      <button class="th-btn-s th-rst" id="th-mcp-reset">全部启用</button>
      <button class="th-btn-s th-apl" id="th-mcp-apply">应用选择</button>
    </div>`),e+="</div>",e+=`<div class="th-mcp-section" id="th-mcp-add">
    <div class="th-sec-t" style="justify-content:space-between">
      添加服务
      <button class="th-btn-s" id="th-toggle-mode" style="font-size:10px;padding:2px 8px;background:#f3f4f6;color:#374151">${A?"简单模式":"JSON 配置"}</button>
    </div>
    <div class="th-mcp-scroll">`,A?e+=`<div style="display:flex;flex-direction:column;gap:6px;padding:4px 10px">
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
    </div>`,e+="</div></div></div>",t.innerHTML=e,U(t)}function U(t){var e,l,n,x,u;(e=t.querySelector("#th-toggle-mode"))==null||e.addEventListener("click",()=>{A=!A,B(t)}),t.querySelectorAll(".th-mcp-filter-tag[data-filter]").forEach(o=>{o.addEventListener("click",()=>{m=o.dataset.filter||null,B(t)})}),t.querySelectorAll(".th-i.server-item").forEach(o=>{o.addEventListener("click",i=>{if(i.target.closest(".th-rm-srv"))return;const a=o.dataset.srv;m=m===a?null:a,B(t)})}),t.querySelectorAll(".th-collapse-header[data-srv]").forEach(o=>{o.addEventListener("click",()=>{const i=o.dataset.srv;N.has(i)?N.delete(i):N.add(i);const s=o.nextElementSibling,a=N.has(i);o.classList.toggle("collapsed",a),s.classList.toggle("collapsed",a),s.style.maxHeight=a?"0px":`${s.querySelectorAll(".th-i-wrap").length*56+8}px`})}),t.querySelectorAll(".th-i-wrap[data-tool-id]").forEach(o=>{const i=o.querySelector(".nm");i==null||i.addEventListener("click",s=>{var r;s.preventDefault(),s.stopPropagation();const a=o.dataset.toolId;j===a?(j=null,o.classList.remove("expanded")):((r=t.querySelector(".th-i-wrap.expanded"))==null||r.classList.remove("expanded"),j=a,o.classList.add("expanded"))})}),t.querySelectorAll("input[data-tool]").forEach(o=>{o.addEventListener("change",()=>{o.checked?g.delete(o.dataset.tool):g.add(o.dataset.tool)})}),(l=t.querySelector("#th-mcp-reset"))==null||l.addEventListener("click",async()=>{await y.resetDeny(),g.clear(),H.clear(),M(t)}),(n=t.querySelector("#th-mcp-apply"))==null||n.addEventListener("click",async()=>{await y.denyTools([...g]),H=new Set(g),M(t)}),t.querySelectorAll(".th-rm-srv").forEach(o=>{o.addEventListener("click",async()=>{await y.removeMcpServer(o.dataset.srv),M(t)})}),(x=t.querySelector("#th-json-add"))==null||x.addEventListener("click",async()=>{const o=t.querySelector("#th-json-input"),i=t.querySelector("#th-json-error");if(!o)return;const s=o.value.trim();if(s)try{const a=JSON.parse(s),r=a.mcpServers?a:{mcpServers:a};i.style.display="none";const h=await y.addMcpBatch(r);if(!h.ok){i.textContent="连接失败",i.style.display="block";return}const f=h.results.filter(c=>!c.ok);f.length?(i.textContent=f.map(c=>`${c.serverName}: ${c.error}`).join("; "),i.style.display="block"):o.value="",setTimeout(()=>M(t),1500)}catch(a){i.textContent=`JSON 格式错误: ${a.message}`,i.style.display="block"}}),(u=t.querySelector("#th-srv-add"))==null||u.addEventListener("click",async()=>{const o=t.querySelector("#th-srv-name"),i=t.querySelector("#th-srv-transport"),s=t.querySelector("#th-srv-url"),a=t.querySelector("#th-srv-headers");if(!o||!s)return;const r=o.value.trim(),h=(i==null?void 0:i.value)||"streamable-http",f=s.value.trim();if(!r||!f)return;let c;const v=a==null?void 0:a.value.trim();if(v)try{c=JSON.parse(v)}catch{alert("Headers JSON 格式错误");return}const $=h==="stdio"?{serverName:r,transport:h,command:f}:{serverName:r,transport:h,url:f,headers:c},S=await y.addMcpServer($);S.ok?setTimeout(()=>M(t),1500):alert(S.error||"连接失败")})}let I=[];async function K(t){t.innerHTML='<div class="th-empty">加载中...</div>';try{I=(await y.getSkills()).skills,Q(t)}catch{t.innerHTML='<div class="th-empty">暂无可用技能</div>'}}function Q(t){if(!I.length){t.innerHTML='<div class="th-empty">暂无可用技能</div>';return}let e=`<div class="th-sec"><div class="th-sec-t">技能列表 <span class="th-cnt">${I.length}</span></div></div>`;for(const l of I){const n=l.modelInvocable?"模型":"用户";e+=`<div class="th-i">
      <span class="th-tg skl">${n}</span>
      <span class="nm">${d(l.name)}</span>
      <span class="ds">${d(l.description.slice(0,50))}</span>
    </div>`}t.innerHTML=e}(function(){if(document.getElementById("th-root"))return;const e=document.createElement("style");e.textContent=Y,document.head.appendChild(e);const l=document.createElement("div");l.id="th-root",l.innerHTML=`
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
  `,document.body.appendChild(l);let n=!1,x="tools",u=700;const o=document.getElementById("th-btn"),i=document.getElementById("th-panel"),s=document.getElementById("th-body");let a=!1,r=!1,h=0,f=0,c=0,v=0;function $(){const p=o.getBoundingClientRect();return{x:p.left,y:p.top}}o.addEventListener("pointerdown",p=>{a=!0,r=!1,h=p.clientX,f=p.clientY;const b=$();c=b.x,v=b.y,o.classList.add("dragging"),o.setPointerCapture(p.pointerId),p.preventDefault()}),document.addEventListener("pointermove",p=>{if(!a)return;const b=p.clientX-h,k=p.clientY-f;(Math.abs(b)>3||Math.abs(k)>3)&&(r=!0);const L=c+b,V=v+k,Z=window.innerWidth-44,tt=window.innerHeight-44,et=Math.max(0,Math.min(Z,L)),st=Math.max(0,Math.min(tt,V));o.style.left=`${et}px`,o.style.top=`${st}px`,o.style.right="auto",o.style.bottom="auto"}),document.addEventListener("pointerup",p=>{a&&(a=!1,o.classList.remove("dragging"),r?n&&S():(n=!n,i.classList.toggle("open",n),n&&(S(),E())))});function S(){const p=o.getBoundingClientRect(),b=420;u=700;let k=p.top-u-12,L=p.right-b;k<8&&(k=p.bottom+12),L<8&&(L=8),L+b>window.innerWidth-8&&(L=window.innerWidth-b-8),k+u>window.innerHeight-8&&(k=window.innerHeight-u-8),i.style.top=`${k}px`,i.style.left=`${L}px`,i.style.right="auto",i.style.bottom="auto"}document.getElementById("th-cls").addEventListener("click",()=>{n=!1,i.classList.remove("open")}),l.querySelectorAll(".th-tabs button").forEach(p=>{p.addEventListener("click",()=>{x=p.dataset.tab,l.querySelectorAll(".th-tabs button").forEach(b=>b.classList.remove("active")),p.classList.add("active"),E()})});function E(){switch(x){case"tools":D(s);break;case"mcp":M(s);break;case"skills":K(s);break}}})()})();
