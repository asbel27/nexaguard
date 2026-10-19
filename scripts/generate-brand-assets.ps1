Add-Type -AssemblyName System.Drawing

$outDir = "C:\Users\DEVX\NEXAGUARD\nexaguard\public\brand"
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

# -------------------------------------------------------------
# 1. GENERATE OG-IMAGE.PNG (1200 x 630) for WhatsApp & Social Media
# -------------------------------------------------------------
$w = 1200
$h = 630
$bmpOg = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmpOg)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background gradient
$ptStart = New-Object System.Drawing.PointF 0, 0
$ptEnd = New-Object System.Drawing.PointF $w, $h
$cBg1 = [System.Drawing.Color]::FromArgb(255, 7, 12, 34)
$cBg2 = [System.Drawing.Color]::FromArgb(255, 3, 6, 16)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $ptStart, $ptEnd, $cBg1, $cBg2
$g.FillRectangle($bgBrush, 0, 0, $w, $h)

# Cyber grid
$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(16, 107, 140, 255)), 1
for ($x = 0; $x -lt $w; $x += 40) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
for ($y = 0; $y -lt $h; $y += 40) { $g.DrawLine($gridPen, 0, $y, $w, $y) }

# Ambient glows
$cyanGlowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$cyanGlowPath.AddEllipse(650, -80, 600, 600)
$cyanPgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $cyanGlowPath
$cyanPgb.CenterColor = [System.Drawing.Color]::FromArgb(38, 0, 240, 255)
$cyanPgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 240, 255))
$g.FillPath($cyanPgb, $cyanGlowPath)

$goldGlowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$goldGlowPath.AddEllipse(40, 200, 500, 500)
$goldPgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $goldGlowPath
$goldPgb.CenterColor = [System.Drawing.Color]::FromArgb(24, 255, 207, 51)
$goldPgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 207, 51))
$g.FillPath($goldPgb, $goldGlowPath)

# Outer border
$borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(50, 0, 240, 255)), 2
$g.DrawRectangle($borderPen, 1, 1, ($w - 2), ($h - 2))

# Fonts
$fontBadge = New-Object System.Drawing.Font "Segoe UI", 11, ([System.Drawing.FontStyle]::Bold)
$fontH1 = New-Object System.Drawing.Font "Segoe UI", 38, ([System.Drawing.FontStyle]::Bold)
$fontTag = New-Object System.Drawing.Font "Segoe UI", 17, ([System.Drawing.FontStyle]::Bold)
$fontDesc = New-Object System.Drawing.Font "Segoe UI", 14, ([System.Drawing.FontStyle]::Regular)
$fontPill = New-Object System.Drawing.Font "Segoe UI", 12, ([System.Drawing.FontStyle]::Bold)
$fontUrl = New-Object System.Drawing.Font "Consolas", 13, ([System.Drawing.FontStyle]::Bold)

$brWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$brGold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 207, 51))
$brCyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
$brMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 160, 180, 220))

# Top Pill Badge
$badgeRect = New-Object System.Drawing.RectangleF 70, 55, 360, 34
$badgeBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 12, 24, 60))
$badgePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 0, 240, 255)), 1.2
$bPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$br_r = 17
$bPath.AddArc($badgeRect.X, $badgeRect.Y, ($br_r*2), ($br_r*2), 180, 90)
$bPath.AddArc(($badgeRect.Right - $br_r*2), $badgeRect.Y, ($br_r*2), ($br_r*2), 270, 90)
$bPath.AddArc(($badgeRect.Right - $br_r*2), ($badgeRect.Bottom - $br_r*2), ($br_r*2), ($br_r*2), 0, 90)
$bPath.AddArc($badgeRect.X, ($badgeRect.Bottom - $br_r*2), ($br_r*2), ($br_r*2), 90, 90)
$bPath.CloseFigure()
$g.FillPath($badgeBg, $bPath)
$g.DrawPath($badgePen, $bPath)
$g.DrawString("ESCANER FORENSE & BLINDAJE WAF", $fontBadge, $brCyan, 88, 62)

# Title: NexaGuard Security
$g.DrawString("NexaGuard", $fontH1, $brWhite, 68, 105)
$g.DrawString(" Security", $fontH1, $brGold, 320, 105)

# Subtitle
$g.DrawString("Ciberseguridad y Desinfeccion de WordPress", $fontTag, $brCyan, 72, 175)

# Description
$descLine1 = "Auditoria forense remota, erradicacion de webshells, eliminacion"
$descLine2 = "de inyecciones de casino/spam y blindaje WAF perimetral continuo."
$g.DrawString($descLine1, $fontDesc, $brMuted, 72, 218)
$g.DrawString($descLine2, $fontDesc, $brMuted, 72, 242)

# Feature chips
$chips = @(
    "Erradicacion de Malware y Backdoors",
    "Validacion con Hashes de WordPress.org",
    "Limpieza de Inyecciones SEO / Casino",
    "Boveda 0440 y Hardening Perimetral"
)
$chipY = 295
foreach ($chip in $chips) {
    $cRect = New-Object System.Drawing.RectangleF 72, $chipY, 490, 38
    $cBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(140, 15, 26, 68))
    $cPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(90, 107, 140, 255)), 1
    
    $cpPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $cpr = 8
    $cpPath.AddArc($cRect.X, $cRect.Y, ($cpr*2), ($cpr*2), 180, 90)
    $cpPath.AddArc(($cRect.Right - $cpr*2), $cRect.Y, ($cpr*2), ($cpr*2), 270, 90)
    $cpPath.AddArc(($cRect.Right - $cpr*2), ($cRect.Bottom - $cpr*2), ($cpr*2), ($cpr*2), 0, 90)
    $cpPath.AddArc($cRect.X, ($cRect.Bottom - $cpr*2), ($cpr*2), ($cpr*2), 90, 90)
    $cpPath.CloseFigure()
    $g.FillPath($cBg, $cpPath)
    $g.DrawPath($cPen, $cpPath)

    $g.DrawString(">>", $fontPill, $brGold, 86, ($chipY + 9))
    $g.DrawString($chip, $fontPill, $brWhite, 120, ($chipY + 9))
    $chipY += 48
}

# Bottom domain bar
$g.DrawString("nexaguards.com | Ciberseguridad de Grado Forense", $fontUrl, $brCyan, 72, 555)

# -------------------------------------------------------------
# RIGHT SIDE: HERO SHIELD WITH GLOWING NODES (Size ~320px)
# -------------------------------------------------------------
$shieldCenterX = 900
$shieldCenterY = 315
$shieldScale = 5.2

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

$cShTop = [System.Drawing.Color]::FromArgb(250, 20, 32, 80)
$cShBot = [System.Drawing.Color]::FromArgb(250, 7, 13, 36)
$shBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($sP1, $sP5, $cShTop, $cShBot)
$g.FillPath($shBrush, $sBigPath)

$cGold = [System.Drawing.Color]::FromArgb(255, 255, 207, 51)
$cCyan = [System.Drawing.Color]::FromArgb(255, 0, 240, 255)
$shBorder = [System.Drawing.Drawing2D.LinearGradientBrush]::new($sP1, $sP5, $cGold, $cCyan)
$shPen = [System.Drawing.Pen]::new($shBorder, [float](3.2 * $shieldScale))
$shPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$g.DrawPath($shPen, $sBigPath)

$nBigPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 245, 248, 255)), (4.4 * $shieldScale)
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

$nodeBR = 4.4 * $shieldScale
$bGoldBr = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 207, 51))
$bCyanBr = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
$bDarkPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 7, 13, 36)), (1.8 * $shieldScale)

$bigNodes = @(
    @{ x = $np2X; y = $np2Y; br = $bGoldBr },
    @{ x = $np1X; y = $np1Y; br = $bCyanBr },
    @{ x = $np3X; y = $np3Y; br = $bGoldBr },
    @{ x = $np4X; y = $np4Y; br = $bCyanBr }
)
foreach ($bn in $bigNodes) {
    $bx = $bn.x - $nodeBR
    $by = $bn.y - $nodeBR
    $g.FillEllipse($bn.br, $bx, $by, ($nodeBR * 2), ($nodeBR * 2))
    $g.DrawEllipse($bDarkPen, $bx, $by, ($nodeBR * 2), ($nodeBR * 2))
}

$ogPath = Join-Path $outDir "og-image.png"
$bmpOg.Save($ogPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmpOg.Dispose()
Write-Host "Success: Generated og-image.png"

# -------------------------------------------------------------
# 2. GENERATE SQUARE APP ICON & WHATSAPP THUMBNAIL (512 x 512)
# -------------------------------------------------------------
$sqSize = 512
$bmpSq = New-Object System.Drawing.Bitmap $sqSize, $sqSize
$gSq = [System.Drawing.Graphics]::FromImage($bmpSq)
$gSq.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gSq.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gSq.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$sqBgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.PointF 0, 0), (New-Object System.Drawing.PointF $sqSize, $sqSize), ([System.Drawing.Color]::FromArgb(255, 12, 22, 60)), ([System.Drawing.Color]::FromArgb(255, 4, 8, 22))
$rSq = $sqSize * 0.18
$sqPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$sqRect = New-Object System.Drawing.RectangleF 0, 0, $sqSize, $sqSize
$sqPath.AddArc($sqRect.X, $sqRect.Y, ($rSq * 2), ($rSq * 2), 180, 90)
$sqPath.AddArc(($sqRect.Right - $rSq * 2), $sqRect.Y, ($rSq * 2), ($rSq * 2), 270, 90)
$sqPath.AddArc(($sqRect.Right - $rSq * 2), ($sqRect.Bottom - $rSq * 2), ($rSq * 2), ($rSq * 2), 0, 90)
$sqPath.AddArc($sqRect.X, ($sqRect.Bottom - $rSq * 2), ($rSq * 2), ($rSq * 2), 90, 90)
$sqPath.CloseFigure()
$gSq.FillPath($sqBgBrush, $sqPath)

$sqBorderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 0, 240, 255)), ($sqSize * 0.015)
$gSq.DrawPath($sqBorderPen, $sqPath)

$sqCenter = $sqSize / 2
$dashPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, 0, 240, 255)), 1.5
$dashPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
$gSq.DrawEllipse($dashPen, ($sqCenter - $sqSize * 0.38), ($sqCenter - $sqSize * 0.38), ($sqSize * 0.76), ($sqSize * 0.76))

$scaleSq = $sqSize / 64.0
$shSqPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$sqP1 = New-Object System.Drawing.PointF (32 * $scaleSq), (6 * $scaleSq)
$sqP2 = New-Object System.Drawing.PointF (54 * $scaleSq), (13 * $scaleSq)
$sqP3 = New-Object System.Drawing.PointF (54 * $scaleSq), (31 * $scaleSq)
$sqBC1 = New-Object System.Drawing.PointF (54 * $scaleSq), (42 * $scaleSq)
$sqP4 = New-Object System.Drawing.PointF (45 * $scaleSq), (45.5 * $scaleSq)
$sqP5 = New-Object System.Drawing.PointF (32 * $scaleSq), (58 * $scaleSq)
$sqBC2 = New-Object System.Drawing.PointF (10 * $scaleSq), (42 * $scaleSq)
$sqP6 = New-Object System.Drawing.PointF (19 * $scaleSq), (45.5 * $scaleSq)
$sqP7 = New-Object System.Drawing.PointF (10 * $scaleSq), (31 * $scaleSq)
$sqP8 = New-Object System.Drawing.PointF (10 * $scaleSq), (13 * $scaleSq)

$shSqPath.AddLine($sqP1, $sqP2)
$shSqPath.AddLine($sqP2, $sqP3)
$shSqPath.AddBezier($sqP3, $sqBC1, $sqP4, $sqP5)
$shSqPath.AddBezier($sqP5, $sqP6, $sqBC2, $sqP7)
$shSqPath.AddLine($sqP7, $sqP8)
$shSqPath.CloseFigure()

$sqShFill = [System.Drawing.Drawing2D.LinearGradientBrush]::new($sqP1, $sqP5, [System.Drawing.Color]::FromArgb(255, 21, 33, 85), [System.Drawing.Color]::FromArgb(255, 8, 15, 42))
$gSq.FillPath($sqShFill, $shSqPath)

$sqGold = [System.Drawing.Color]::FromArgb(255, 255, 207, 51)
$sqCyan = [System.Drawing.Color]::FromArgb(255, 0, 240, 255)
$sqShBorder = [System.Drawing.Drawing2D.LinearGradientBrush]::new($sqP1, $sqP5, $sqGold, $sqCyan)
$sqShPen = [System.Drawing.Pen]::new($sqShBorder, [float](3.2 * $scaleSq))
$sqShPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$gSq.DrawPath($sqShPen, $shSqPath)

$sqNPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 240, 245, 255)), (4.4 * $scaleSq)
$sqNPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$sqNPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$sqNPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$sqNp1 = New-Object System.Drawing.PointF (22 * $scaleSq), (42 * $scaleSq)
$sqNp2 = New-Object System.Drawing.PointF (22 * $scaleSq), (22 * $scaleSq)
$sqNp3 = New-Object System.Drawing.PointF (42 * $scaleSq), (42 * $scaleSq)
$sqNp4 = New-Object System.Drawing.PointF (42 * $scaleSq), (22 * $scaleSq)

$gSq.DrawLine($sqNPen, $sqNp1, $sqNp2)
$gSq.DrawLine($sqNPen, $sqNp2, $sqNp3)
$gSq.DrawLine($sqNPen, $sqNp3, $sqNp4)

$sqNodeR = 4.2 * $scaleSq
$sqGoldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 207, 51))
$sqCyanBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
$sqDarkPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 8, 15, 42)), (1.8 * $scaleSq)

$sqNodes = @(
    @{ x = $sqNp2.X; y = $sqNp2.Y; brush = $sqGoldBrush },
    @{ x = $sqNp1.X; y = $sqNp1.Y; brush = $sqCyanBrush },
    @{ x = $sqNp3.X; y = $sqNp3.Y; brush = $sqGoldBrush },
    @{ x = $sqNp4.X; y = $sqNp4.Y; brush = $sqCyanBrush }
)
foreach ($n in $sqNodes) {
    $nx = $n.x - $sqNodeR
    $ny = $n.y - $sqNodeR
    $gSq.FillEllipse($n.brush, $nx, $ny, ($sqNodeR * 2), ($sqNodeR * 2))
    $gSq.DrawEllipse($sqDarkPen, $nx, $ny, ($sqNodeR * 2), ($sqNodeR * 2))
}

$sqPathOut = Join-Path $outDir "og-square.png"
$bmpSq.Save($sqPathOut, [System.Drawing.Imaging.ImageFormat]::Png)

# Apple touch icon 180x180
$bmp180 = New-Object System.Drawing.Bitmap $bmpSq, 180, 180
$bmp180.Save((Join-Path $outDir "apple-touch-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp180.Dispose()

# Favicon 32x32
$bmp32 = New-Object System.Drawing.Bitmap $bmpSq, 32, 32
$bmp32.Save((Join-Path $outDir "favicon-32x32.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp32.Dispose()

$gSq.Dispose()
$bmpSq.Dispose()
Write-Host "Success: Generated og-square.png, apple-touch-icon.png, favicon-32x32.png"
