# 知识图谱模块

## 概述

知识图谱模块提供 Agent、工具、任务之间的关系可视化，支持 ECharts 和 G6 两种渲染引擎。

## 数据库设计

```sql
-- 图节点
CREATE TABLE graph_nodes (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,        -- agent/tool/task/concept
    description TEXT,
    properties JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 图边（关系）
CREATE TABLE graph_edges (
    id BIGSERIAL PRIMARY KEY,
    source_id BIGINT REFERENCES graph_nodes(id) ON DELETE CASCADE,
    target_id BIGINT REFERENCES graph_nodes(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,        -- depends_on/uses/creates
    weight FLOAT DEFAULT 1.0,
    properties JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_edges_source ON graph_edges(source_id);
CREATE INDEX idx_edges_target ON graph_edges(target_id);
CREATE INDEX idx_nodes_type ON graph_nodes(type);
```

## 后端 API

```php
// routes/api.php
Route::prefix('graph')->group(function () {
    Route::get('/', [GraphController::class, 'index']);           // 获取全图
    Route::get('/search', [GraphController::class, 'search']);    // 搜索节点
    Route::post('/nodes', [GraphController::class, 'store']);     // 创建节点
    Route::get('/nodes/{node}', [GraphController::class, 'show']);
    Route::put('/nodes/{node}', [GraphController::class, 'update']);
    Route::delete('/nodes/{node}', [GraphController::class, 'destroy']);
    Route::get('/nodes/{node}/neighbors', [GraphController::class, 'neighbors']);
    Route::post('/edges', [GraphController::class, 'storeEdge']); // 创建边
    Route::delete('/edges/{edge}', [GraphController::class, 'destroyEdge']);
});
```

### index — 获取全图数据

```php
public function index(Request $request)
{
    $nodes = GraphNode::all();
    $edges = GraphEdge::with(['source', 'target'])->get();

    return response()->json([
        'success' => true,
        'data' => [
            'nodes' => $nodes,
            'edges' => $edges,
        ],
    ]);
}
```

### search — 搜索节点

```php
public function search(Request $request)
{
    $keyword = $request->input('keyword', '');

    $nodes = GraphNode::where('name', 'like', "%{$keyword}%")
        ->orWhere('description', 'like', "%{$keyword}%")
        ->limit(50)
        ->get();

    return response()->json([
        'success' => true,
        'data' => $nodes,
    ]);
}
```

## 前端实现

### 双引擎切换

```jsx
// pages/KnowledgeGraph.jsx
const [renderer, setRenderer] = useState('echarts')

// 工具栏切换
<Dropdown menu={{ items: [
  { key: 'echarts', label: 'ECharts' },
  { key: 'g6', label: 'G6 图谱' },
], onClick: ({ key }) => setRenderer(key) }}>
  <Button>切换渲染器</Button>
</Dropdown>

// 渲染
{renderer === 'echarts'
  ? <EChartsGraph data={graphData} />
  : <G6Graph data={graphData} />
}
```

### ECharts 渲染

```jsx
// 使用 ECharts graph 类型
const option = {
  series: [{
    type: 'graph',
    layout: 'force',
    data: nodes.map(n => ({
      name: n.name,
      id: String(n.id),
      symbolSize: 30,
      category: n.type,
    })),
    links: edges.map(e => ({
      source: String(e.source_id),
      target: String(e.target_id),
    })),
    force: { repulsion: 200 },
    categories: [
      { name: 'agent' },
      { name: 'tool' },
      { name: 'task' },
    ],
  }],
}
```

### G6 渲染

```jsx
// components/G6Graph.jsx
import G6 from '@antv/g6'

useEffect(() => {
  const graph = new G6.Graph({
    container: containerRef.current,
    width: 800,
    height: 600,
    modes: { default: ['drag-canvas', 'zoom-canvas'] },
    layout: { type: 'force' },
  })

  graph.data({ nodes, edges })
  graph.render()

  return () => graph.destroy()
}, [nodes, edges])
```

### 常量定义

```javascript
// constants/graphConstants.js
export const NODE_TYPES = {
  agent: { color: '#1677ff', label: 'Agent' },
  tool: { color: '#52c41a', label: '工具' },
  task: { color: '#faad14', label: '任务' },
  concept: { color: '#722ed1', label: '概念' },
}

export const EDGE_TYPES = {
  depends_on: { color: '#ff4d4f', label: '依赖' },
  uses: { color: '#1677ff', label: '使用' },
  creates: { color: '#52c41a', label: '创建' },
}
```

## XSS 防护

Tooltip 中显示用户数据时必须转义：

```javascript
// utils/htmlUtils.js
export function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 使用
tooltip: escapeHtml(node.name)
```

## 测试

```javascript
// tests/constants/graphConstants.test.js
describe('graphConstants', () => {
  it('NODE_TYPES 包含所有类型', () => {
    expect(NODE_TYPES).toHaveProperty('agent')
    expect(NODE_TYPES).toHaveProperty('tool')
    expect(NODE_TYPES).toHaveProperty('task')
    expect(NODE_TYPES).toHaveProperty('concept')
  })

  it('每个节点类型有 color 和 label', () => {
    Object.values(NODE_TYPES).forEach(type => {
      expect(type).toHaveProperty('color')
      expect(type).toHaveProperty('label')
    })
  })
})
```
