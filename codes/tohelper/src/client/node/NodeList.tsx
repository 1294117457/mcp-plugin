import type { NodeConfig } from '../../types'

interface Props {
  nodes: NodeConfig[]
  loading: boolean
  onEdit: (node: NodeConfig) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export function NodeList({ nodes, loading, onEdit, onCreate, onDelete }: Props) {
  if (loading) return <div className="th-empty">加载中...</div>

  return (
    <div className="th-node-list">
      <button className="th-btn-create" onClick={onCreate}>+ 创建节点</button>
      {nodes.length === 0 && <div className="th-empty">暂无节点，点击上方创建</div>}
      {nodes.map(node => (
        <div key={node.id} className="th-node-card">
          <div className="th-node-card-header">
            <span className="th-node-name">{node.name}</span>
          </div>
          <p className="th-node-desc">{node.description}</p>
          <div className="th-node-meta">
            {node.llm && <span>LLM: {node.llm.model}</span>}
            {node.tools && node.tools.length > 0 && <span>工具: {node.tools.length}个</span>}
          </div>
          <div className="th-node-actions">
            <button onClick={() => onEdit(node)}>编辑</button>
            <button className="th-btn-danger" onClick={() => onDelete(node.id)}>删除</button>
          </div>
        </div>
      ))}
    </div>
  )
}
