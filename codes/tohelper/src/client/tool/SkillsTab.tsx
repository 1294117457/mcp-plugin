import type { ToolPanelData } from './ToolPanel'

export function SkillsTab({ data }: { data: ToolPanelData }) {
  if (data.loading) return <div className="th-empty">加载中...</div>
  if (!data.skills.length) return <div className="th-empty">暂无可用技能</div>

  return (
    <div>
      <div className="th-sec">
        <div className="th-sec-t">技能列表 <span className="th-cnt">{data.skills.length}</span></div>
      </div>
      {data.skills.map(s => (
        <div key={s.name} className="th-i">
          <span className="th-tg skl">{s.modelInvocable ? '模型' : '用户'}</span>
          <span className="nm">{s.name}</span>
          <span className="ds">{s.description.slice(0, 50)}</span>
        </div>
      ))}
    </div>
  )
}
