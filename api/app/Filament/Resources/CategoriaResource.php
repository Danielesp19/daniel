<?php

namespace App\Filament\Resources;

use App\Filament\Resources\CategoriaResource\Pages;
use App\Models\Categoria;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Actions\DeleteAction;
use Filament\Tables\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class CategoriaResource extends Resource
{
    protected static ?string $model = Categoria::class;

    protected static ?string $navigationIcon = 'heroicon-o-squares-2x2';

    protected static ?string $navigationLabel = 'Categorías';

    protected static ?string $modelLabel = 'Categoría';

    protected static ?string $pluralModelLabel = 'Categorías';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([
            TextInput::make('nombre')->label('Nombre')->required()->maxLength(255),

            TextInput::make('slug')
                ->label('Slug')
                ->helperText('Se genera solo a partir del nombre. Cámbialo solo si sabes por qué.')
                ->unique(ignoreRecord: true)
                ->maxLength(255),

            Textarea::make('descripcion')
                ->label('Descripción')
                ->helperText('Aparece bajo el título de la categoría en el catálogo.')
                ->rows(2)
                ->nullable()
                ->columnSpanFull(),

            Select::make('modo_vitrina')
                ->label('Cómo se muestra')
                ->options([
                    'grid' => 'Grilla de tarjetas (normal)',
                    'carrusel' => 'Carrusel — una fila que se corre de lado',
                    'vertical' => 'Vitrina vertical — filas grandes alternadas',
                    'horizontal' => 'Vitrina de a uno — se pasa deslizando (para videos)',
                ])
                ->default('grid')
                ->required(),

            TextInput::make('orden')->label('Orden')->numeric()->default(0)->minValue(0),

            Toggle::make('activa')->label('Visible en el catálogo')->default(true),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('orden')
            // Arrastrar la fila cambia el orden de las secciones en el sitio.
            // El número de `orden` sigue existiendo y el chatbot lo puede
            // cambiar por mensaje; esto es la misma operación con el mouse.
            ->reorderable('orden')
            ->columns([
                TextColumn::make('nombre')->label('Nombre')->searchable()->weight('bold'),
                TextColumn::make('modo_vitrina')
                    ->label('Se muestra como')
                    ->badge()
                    ->formatStateUsing(fn (string $state) => match ($state) {
                        'carrusel' => 'Carrusel',
                        'vertical' => 'Destacado + grilla',
                        'horizontal' => 'Tarjetas con video',
                        default => 'Grilla',
                    }),
                TextColumn::make('productos_count')->counts('productos')->label('Productos'),
                IconColumn::make('activa')->label('Visible')->boolean(),
            ])
            ->actions([EditAction::make(), DeleteAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListCategorias::route('/'),
            'create' => Pages\CreateCategoria::route('/create'),
            'edit' => Pages\EditCategoria::route('/{record}/edit'),
        ];
    }
}
