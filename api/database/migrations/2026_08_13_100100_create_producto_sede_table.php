<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * El inventario real: cuántas bolsas hay de cada producto en cada sede.
     *
     * A partir de aquí ESTA es la fuente de verdad del stock. `productos.stock`
     * sigue existiendo pero pasa a ser la suma de estas filas, recalculada por
     * el modelo en cada movimiento — ver Producto::recalcularTotal().
     */
    public function up(): void
    {
        Schema::create('producto_sede', function (Blueprint $table) {
            $table->id();
            $table->foreignId('producto_id')->constrained('productos')->cascadeOnDelete();
            $table->foreignId('sede_id')->constrained('sedes')->cascadeOnDelete();

            // En bolsas, como en el resto del proyecto: es la unidad con la que
            // cuenta quien está parado frente al estante.
            $table->unsignedInteger('stock')->default(0);

            $table->timestamps();

            // Una sola fila por producto y sede. Sin esto, dos ajustes
            // simultáneos podrían crear filas paralelas y el total quedaría
            // contando bolsas que no existen.
            $table->unique(['producto_id', 'sede_id']);
            $table->index('sede_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('producto_sede');
    }
};
