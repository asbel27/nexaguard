Add-Type -AssemblyName System.Drawing

$w = 1200
$h = 630
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1. Dark radial cybernetic background
$ptStart = New-Object System.Drawing.PointF 0, 0
$ptEnd = New-Object System.Drawing.PointF $w, $h
$cBg1 = [System.Drawing.Color]::FromArgb(255, 15, 25, 65)
$cBg2 = [System.Drawing.Color]::FromArgb(255, 4, 7, 18)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $ptStart, $ptEnd, $cBg1, $cBg2
$g.FillRectangle($bgBrush, 0, 0, $w, $h)

# 2. Cyber grid
$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(18, 107, 140, 255)), 1
for ($x = 0; $x -lt $w; $x += 40) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
for ($y = 0; $y -lt $h; $y += 40) { $g.DrawLine($gridPen, 0, $y, $w, $y) }

# 3. Ambient lighting glows
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(200, 100, 800, 430)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(40, 0, 240, 255)
$pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 240, 255))
$g.FillPath($pgb, $glowPath)

$goldGlow = New-Object System.Drawing.Drawing2D.GraphicsPath
$goldGlow.AddEllipse(250, 120, 450, 350)
$goldPgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $goldGlow
$goldPgb.CenterColor = [System.Drawing.Color]::FromArgb(35, 255, 207, 51)
$goldPgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 207, 51))
$g.FillPath($goldPgb, $goldGlow)

# Frame border
$borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(50, 0, 240, 255)), 2
$g.DrawRectangle($borderPen, 1, 1, ($w - 2), ($h - 2))

# -------------------------------------------------------------
# 4. OFFICIAL SHIELD (Left of center lockup)
# -------------------------------------------------------------
$shieldCenterX = 295
$shieldCenterY = 280
$shieldScale = 4.4

$sP1 = New-Object System.Drawing.PointF ($shieldCenterX), ($shieldCenterY - 26 * $shieldScale)
$sP2 = New-Object System.Drawing.PointF ($shieldCenterX + 22 * $shieldScale), ($shieldCenterY - 19 * $shieldScale)
$sP3 = New-Object System.Drawing.PointF ($shieldCenterX + 22 * $shieldScale), ($shieldCenterY - 1 * $shieldScale)
$sBC1 = New-Object System.Drawing.PointF ($shieldCenterX + 22 * $shieldScale), ($shieldCenterY + 10 * $shieldScale)
$sP4 = New-Object System.Drawing.PointF ($shieldCenterX + 13 * $shieldScale), ($shieldCenterY + 13.5 * $shieldScale)
$sP5 = New-Object System.Drawing.PointF ($shieldCenterX), ($shieldCenterY + 26 * $shieldScale)
$sBC2 = New-Object System.Drawing.PointF ($shieldCenterX - 22 * $shieldScale), ($shieldCenterY + 10 * $shieldScale)
$sP6 = New-Object System.Drawing.PointF ($shieldCenterX - 13 * $shieldScale), ($shieldCenterY + 13.5 * $shieldScale)
$sP7 = New-Object System.Drawing.PointF ($shieldCenterX - 22 * $shieldScale), ($shieldCenterY - 1 * $shieldScale)
$sP8 = New-Object System.Drawing.PointF ($shieldCenterX - 22 * $shieldScale), ($shieldCenterY - 19 * $shieldScale)

$sBigPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$sBigPath.AddLine($sP1, $sP2)
$sBigPath.AddLine($sP2, $sP3)
$sBigPath.AddBezier($sP3, $sBC1, $sP4, $sP5)
$sBigPath.AddBezier($sP5, $sP6, $sBC2, $sP7)
$sBigPath.AddLine($sP7, $sP8)
$sBigPath.CloseFigure()

$cShTop = [System.Drawing.Color]::FromArgb(250, 21, 33, 79)
$cShBot = [System.Drawing.Color]::FromArgb(250, 11, 18, 53)
$shBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($sP1, $sP5, $cShTop, $cShBot)
$g.FillPath($shBrush, $sBigPath)

$cGold = [System.Drawing.Color]::FromArgb(255, 255, 207, 51)
$cCyan = [System.Drawing.Color]::FromArgb(255, 107, 140, 255)
$shBorder = [System.Drawing.Drawing2D.LinearGradientBrush]::new($sP1, $sP5, $cGold, $cCyan)
$shPen = [System.Drawing.Pen]::new($shBorder, [float](3.2 * $shieldScale))
$shPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$g.DrawPath($shPen, $sBigPath)

# N inside shield
$nBigPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 234, 240, 255)), (4.4 * $shieldScale)
$nBigPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$nBigPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$nBigPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$np1X = $shieldCenterX - 10 * $shieldScale
$np1Y = $shieldCenterY + 10 * $shieldScale
$np2X = $shieldCenterX - 10 * $shieldScale
$np2Y = $shieldCenterY - 10 * $shieldScale
$np3X = $shieldCenterX + 10 * $shieldScale
$np3Y = $shieldCenterY + 10 * $shieldScale
$np4X = $shieldCenterX + 10 * $shieldScale
$np4Y = $shieldCenterY - 10 * $shieldScale

$g.DrawLine($nBigPen, $np1X, $np1Y, $np2X, $np2Y)
$g.DrawLine($nBigPen, $np2X, $np2Y, $np3X, $np3Y)
$g.DrawLine($nBigPen, $np3X, $np3Y, $np4X, $np4Y)

# 4 Gold & Cyan nodes
$nodeBR = 4.3 * $shieldScale
$bGoldBr = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 207, 51))
$bDarkPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 11, 18, 53)), (2.2 * $shieldScale)

$bNodes = @(
    @($np2X, $np2Y),
    @($np1X, $np1Y),
    @($np3X, $np3Y),
    @($np4X, $np4Y)
)
foreach ($bn in $bNodes) {
    $bx = $bn[0] - $nodeBR
    $by = $bn[1] - $nodeBR
    $g.FillEllipse($bGoldBr, $bx, $by, ($nodeBR * 2), ($nodeBR * 2))
    $g.DrawEllipse($bDarkPen, $bx, $by, ($nodeBR * 2), ($nodeBR * 2))
}

# -------------------------------------------------------------
# 5. EXACT OFFICIAL TYPOGRAPHY "NEXA" (White) + "GUARD" (Gold)
# -------------------------------------------------------------
$fontLogo = New-Object System.Drawing.Font "Arial Black", 82, ([System.Drawing.FontStyle]::Bold)
$brWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 234, 240, 255))
$brGoldText = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 207, 51))

$textStartX = 445
$textStartY = 215
$g.DrawString("NEXA", $fontLogo, $brWhite, $textStartX, $textStartY)
$g.DrawString("GUARD", $fontLogo, $brGoldText, ($textStartX + 305), $textStartY)

# Subtitle under NEXAGUARD
$fontTagline = New-Object System.Drawing.Font "Segoe UI", 16, ([System.Drawing.FontStyle]::Bold)
$brCyanText = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
$g.DrawString("REPARACION · MANTENIMIENTO · SEGURIDAD WORDPRESS", $fontTagline, $brCyanText, $textStartX, ($textStartY + 120))

# Bottom Domain & 24/7 Badge
$fontBottom = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Bold)
$brMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 160, 180, 220))
$g.DrawString("nexaguards.com  |  Soporte Tecnico Forense 24/7", $fontBottom, $brMuted, $textStartX, ($textStartY + 155))

$out1 = "C:\Users\DEVX\NEXAGUARD\nexaguard\public\brand\nexaguard-preview.png"
$out2 = "C:\Users\DEVX\NEXAGUARD\nexaguard\public\brand\og-image.png"

$bmp.Save($out1, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save($out2, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Host "Created nexaguard-preview.png and updated og-image.png successfully!"
