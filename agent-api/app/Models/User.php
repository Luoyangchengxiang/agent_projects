<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'permissions',
        'last_login_at',
        'last_login_ip',
        'mascot_model_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'last_login_at' => 'datetime',
            'permissions' => 'array',
        ];
    }

    /**
     * 是否为管理员
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * 是否为 VIP 用户
     */
    public function isVip(): bool
    {
        return $this->role === 'vip';
    }

    /**
     * 是否为普通用户
     */
    public function isUser(): bool
    {
        return $this->role === 'user';
    }

    /**
     * 是否被禁用
     */
    public function isDisabled(): bool
    {
        return $this->status === 'disabled';
    }

    /**
     * 是否活跃
     */
    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    /**
     * 检查是否有某个权限
     */
    public function hasPermission(string $permission): bool
    {
        // 管理员拥有所有权限
        if ($this->isAdmin()) {
            return true;
        }

        // 检查 permissions 字段
        $permissions = $this->permissions ?? [];
        return in_array($permission, $permissions);
    }

    /**
     * 检查是否可以查看完整执行结果
     */
    public function canViewFullExecution(): bool
    {
        return $this->isAdmin() || $this->isVip();
    }

    /**
     * 检查是否可以查看执行结果摘要
     */
    public function canViewExecutionSummary(): bool
    {
        return true; // 所有用户都可以查看摘要
    }

    /**
     * 检查是否可以管理用户
     */
    public function canManageUsers(): bool
    {
        return $this->isAdmin();
    }

    /**
     * 获取角色显示名称
     */
    public function getRoleNameAttribute(): string
    {
        return match($this->role) {
            'admin' => '管理员',
            'vip' => 'VIP 用户',
            'user' => '普通用户',
            default => '未知'
        };
    }
}
