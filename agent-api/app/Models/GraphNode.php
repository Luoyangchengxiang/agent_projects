<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class GraphNode extends Model
{
    protected $fillable = [
        'type',
        'name',
        'description',
        'metadata',
        'agent_id',
        'created_by',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * 关联 Agent
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }

    /**
     * 关联创建者
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * 作为源节点的边（出边）
     */
    public function outgoingEdges()
    {
        return $this->hasMany(GraphEdge::class, 'source_id');
    }

    /**
     * 作为目标节点的边（入边）
     */
    public function incomingEdges()
    {
        return $this->hasMany(GraphEdge::class, 'target_id');
    }

    /**
     * 获取所有连接的节点
     */
    public function connectedNodes()
    {
        $outgoing = $this->outgoingEdges()->with('target')->get()->pluck('target');
        $incoming = $this->incomingEdges()->with('source')->get()->pluck('source');
        
        return $outgoing->merge($incoming);
    }

    /**
     * 获取类型中文名
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'agent_group' => '智能体组',
            'agent' => '智能体',
            'knowledge' => '知识库',
            'skill' => '技能',
            'output' => '产出物',
            default => $this->type,
        };
    }
}
