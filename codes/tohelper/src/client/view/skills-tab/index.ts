import { api, type SkillItem } from '../../api'
import { esc } from '../../utils'

let skills: SkillItem[] = []

export async function loadSkills(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="th-empty">加载中...</div>'
  try {
    const data = await api.getSkills()
    skills = data.skills
    render(container)
  } catch {
    container.innerHTML = '<div class="th-empty">暂无可用技能</div>'
  }
}

function render(container: HTMLElement): void {
  if (!skills.length) {
    container.innerHTML = '<div class="th-empty">暂无可用技能</div>'
    return
  }

  let html = `<div class="th-sec"><div class="th-sec-t">技能列表 <span class="th-cnt">${skills.length}</span></div></div>`

  for (const s of skills) {
    const badge = s.modelInvocable ? '模型' : '用户'
    html += `<div class="th-i">
      <span class="th-tg skl">${badge}</span>
      <span class="nm">${esc(s.name)}</span>
      <span class="ds">${esc(s.description.slice(0, 50))}</span>
    </div>`
  }

  container.innerHTML = html
}
