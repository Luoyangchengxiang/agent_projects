<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AgentMetric extends Model
{
    protected $fillable = [
        'agent_id',
        'metric_name',
        'metric_value',
        'tags',
        'recorded_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'metric_value' => 'float',
        'recorded_at' => 'datetime',
    ];

    /**
     * 关联Agent
     */
    public function agent(): BelongsTo
    {
        return $this->belongsTo(Agent::class);
    }
}
