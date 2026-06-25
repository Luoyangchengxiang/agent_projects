<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@local'],
            [
                'name' => '管理员',
                'password' => Hash::make('123456'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );
    }
}
