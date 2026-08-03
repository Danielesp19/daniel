<?php

namespace App\Filament\Resources;

use App\Filament\Resources\HeroResource\Pages;
use App\Models\Hero;
use App\Support\ImageOptimizer;
use Filament\Forms\Components\FileUpload;
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
use Livewire\Features\SupportFileUploads\TemporaryUploadedFile;

class HeroResource extends Resource
{
    protected static ?string $model = Hero::class;

    protected static ?string $navigationIcon = 'heroicon-o-photo';

    protected static ?string $navigationLabel = 'Portada';

    protected static ?string $modelLabel = 'Portada';

    protected static ?string $pluralModelLabel = 'Portadas';

    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form->schema([
            TextInput::make('etiqueta')
                ->label('Etiqueta')
                ->helperText('La línea pequeña sobre el título. Ej: "Tostado por lote · Bogotá".')
                ->nullable()
                ->maxLength(255),

            TextInput::make('titulo')->label('Título')->required()->maxLength(255),

            Textarea::make('subtitulo')->label('Subtítulo')->rows(3)->nullable()->columnSpanFull(),

            TextInput::make('cta_texto')->label('Texto del botón')->placeholder('Ver el catálogo')->nullable(),
            TextInput::make('cta_url')->label('Enlace del botón')->placeholder('#catalogo')->nullable(),

            FileUpload::make('imagen')
                ->label('Imagen de fondo')
                ->helperText('Opcional. Si la subes, reemplaza al video que trae el sitio por defecto.')
                ->image()
                ->disk('public')
                ->directory('hero')
                ->saveUploadedFileUsing(
                    fn (TemporaryUploadedFile $archivo) => ImageOptimizer::store($archivo, 'hero'),
                )
                ->columnSpanFull(),

            Toggle::make('activo')->label('Activa')->default(true),
            TextInput::make('orden')->label('Orden')->numeric()->default(0)->minValue(0),
        ])->columns(2);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('orden')
            ->columns([
                TextColumn::make('titulo')->label('Título')->weight('bold'),
                TextColumn::make('etiqueta')->label('Etiqueta')->toggleable(),
                IconColumn::make('activo')->label('Activa')->boolean(),
            ])
            ->actions([EditAction::make(), DeleteAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListHeros::route('/'),
            'create' => Pages\CreateHero::route('/create'),
            'edit' => Pages\EditHero::route('/{record}/edit'),
        ];
    }
}
