<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Queda de la instalación de Laravel y del panel de Filament que ya no existe.
 *
 * HOY NO SE USA PARA ENTRAR AL PANEL: ese vive en el frontend y se abre con una
 * contraseña compartida que el servidor de Next cambia por el token de esta
 * API (ver la ruta /api/admin-auth del frontend). El modelo y su tabla se
 * conservan porque son los que espera la configuración de auth de Laravel, y
 * porque el día que haga falta más de un administrador este es el punto de
 * partida.
 */
#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
