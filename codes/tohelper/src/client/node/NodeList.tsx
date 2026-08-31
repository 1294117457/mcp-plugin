import type { NodeConfig } from '../../types'

interface Props {
  nodes: NodeConfig[]
  equippedNodeIds: string[]
  loading: boolean
  onEdit: (node: NodeConfig) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onEquip: (nodeId: string, equipped: boolean) => void
}

export function NodeList({ nodes, equippedNodeIds, loading, onEdit, onCreate, onDelete, onEquip }: Props) {
  if (loading) return <div className="th-empty">加载中...</div>

  return (
    <div className="th-node-list">
      <div className="th-node-list-hdr">
        <p className="th-hint">Node 通过编排 Task 实现复杂工作流</p>
        <button className="th-btn-create" onClick={onCreate}>+ 创建 Node</button>
      </div>
      {nodes.length === 0 ? (
        <div className="th-empty">暂无 Node</div>
      ) : (
        <div className="th-node-items">
          {nodes.map(node => {
            const equipped = equippedNodeIds.includes(node.id)
            return (
              <div key={node.id} className="th-node-card">
                <div className="th-node-card-header">
                  <h3 className="th-node-name">{node.name}</h3>
                  <span className={`th-node-badge ${node.mode}`}>{node.mode}</span>
                </div>
                <p className="th-node-desc">{node.description}</p>
                <div className="th-node-meta">
                  <span className="th-node-meta-item">{node.tasks.length} Tasks</span>
                  <span className="th-node-meta-item">{node.llm.model}</span>
                </div>
                <div className="th-node-actions">
                  <button className={`th-btn ${equipped ? 'th-btn-success' : 'th-btn-secondary'}`} onClick={() => onEquip(node.id, equipped)}>
                    {equipped ? '\u2713 已装配' : '装配'}
                  </button>
                  <button className="th-btn th-btn-secondary" onClick={() => onEdit(node)}>编辑</button>
                  <button className="th-btn th-btn-danger" onClick={() => { if (confirm(`确定删除 "${node.name}"？`)) onDelete(node.id) }}>删除</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
