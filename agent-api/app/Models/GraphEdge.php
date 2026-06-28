<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GraphEdge extends BaseModel
{
    protected $fillable = [
        'source_id',
        'target_id',
        'relation_type',
        'label',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    /**
     * 关联源节点
     */
    public function source(): BelongsTo
    {
        return $this->belongsTo(GraphNode::class, 'source_id');
    }

    /**
     * 关联目标节点
     */
    public function target(): BelongsTo
    {
        return $this->belongsTo(GraphNode::class, 'target_id');
    }

    /**
     * 获取关系类型中文名
     */
    public function getRelationLabelAttribute(): string
    {
        return match ($this->relation_type) {
            'contains' => '包含',
            'uses' => '使用',
            'produces' => '产出',
            'depends_on' => '依赖',
            'collaborates' => '协作',
            default => $this->relation_type,
        };
    }
}
