# Genera los iconos PWA a partir de assets-source/app-icon.png (1024x1024).
# Uso:  powershell -ExecutionPolicy Bypass -File scripts/generate-pwa-icons.ps1
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root "assets-source\app-icon.png"
$outDir = Join-Path $root "public\icons"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$src = [System.Drawing.Image]::FromFile($source)
$bg = [System.Drawing.ColorTranslator]::FromHtml("#0b1020")

function New-Icon {
    param(
        [int]$Size,
        [string]$Name,
        [double]$Scale = 1.0,   # tamaño del dibujo respecto al lienzo
        [bool]$FillBackground = $false
    )
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = "HighQuality"
    $g.InterpolationMode = "HighQualityBicubic"
    $g.PixelOffsetMode = "HighQuality"
    if ($FillBackground) { $g.Clear($bg) } else { $g.Clear([System.Drawing.Color]::Transparent) }
    $drawSize = [int]($Size * $Scale)
    $offset = [int](($Size - $drawSize) / 2)
    $g.DrawImage($src, $offset, $offset, $drawSize, $drawSize)
    $g.Dispose()
    $path = Join-Path $outDir $Name
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "OK $Name ($Size x $Size)"
}

# Iconos normales (esquinas redondeadas transparentes, como el original)
New-Icon -Size 192 -Name "icon-192.png"
New-Icon -Size 512 -Name "icon-512.png"
# Maskable: fondo completo + dibujo dentro de la "zona segura" (80 %)
New-Icon -Size 192 -Name "maskable-192.png" -Scale 0.74 -FillBackground $true
New-Icon -Size 512 -Name "maskable-512.png" -Scale 0.74 -FillBackground $true
# iOS: sin transparencia (iOS pone fondo negro si hay transparencia)
New-Icon -Size 180 -Name "apple-touch-icon.png" -Scale 0.86 -FillBackground $true
# Favicon
New-Icon -Size 64 -Name "favicon-64.png"

$src.Dispose()
