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
        <p className="th-hint">创建 Node 后，可在"工具"面板中装配使用</p>
        <button className="th-btn-create" onClick={onCreate}>+ 创建节点</button>
      </div>
      
      {nodes.length === 0 ? (
        <div className="th-empty">暂无节点，点击上方按钮创建</div>
      ) : (
        <div className="th-node-items">
          {nodes.map(node => {
            const equipped = equippedNodeIds.includes(node.id)
            return (
              <div key={node.id} className="th-node-card">
                <div className="th-node-card-header">
                  <h3 className="th-node-name">{node.name}</h3>
                  <span className={`th-node-badge ${node.executionMode || 'direct'}`}>
                    {node.executionMode || 'direct'}
                  </span>
                </div>
                
                <p className="th-node-desc">{node.description}</p>
                
                <div className="th-node-meta">
                  {(node.executionMode === 'pipeline' || node.tasks) && (
                    <span className="th-node-meta-item">
                      📋 {node.tasks?.length || 0} Tasks
                    </span>
                  )}
                  {node.tools && node.tools.length > 0 && (
                    <span className="th-node-meta-item">
                      🔧 {node.tools.length} Tools
                    </span>
                  )}
                  {node.llm && (
                    <span className="th-node-meta-item">
                      🤖 {node.llm.model}
                    </span>
                  )}
                </div>
                
                <div className="th-node-actions">
                  <button
                    className={`th-btn ${equipped ? 'th-btn-success' : 'th-btn-secondary'}`}
                    onClick={() => onEquip(node.id, equipped)}
                  >
                    {equipped ? '✓ 已装配' : '装配'}
                  </button>
                  <button
                    className="th-btn th-btn-secondary"
                    onClick={() => onEdit(node)}
                  >
                    编辑
                  </button>
                  <button
                    className="th-btn th-btn-danger"
                    onClick={() => {
                      if (confirm(`确定删除节点 "${node.name}"？`)) {
                        onDelete(node.id)
                      }
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

