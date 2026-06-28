<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * 基础模型 - 统一日期格式
 */
abstract class BaseModel extends Model
{
    /**
     * 日期序列化格式
     * @var string
     */
    protected $dateFormat = 'Y-m-d H:i:s';

    /**
     * 序列化日期为字符串
     *
     * @param  \DateTimeInterface  $date
     * @return string
     */
    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d H:i:s');
    }
}
