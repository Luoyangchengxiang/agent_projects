<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('remember_tokens', function (Blueprint $table) {
            $table->string('token_prefix', 30)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('remember_tokens', function (Blueprint $table) {
            $table->string('token_prefix', 10)->change();
        });
    }
};
