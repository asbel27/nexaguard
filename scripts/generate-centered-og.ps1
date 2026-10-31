Add-Type -AssemblyName System.Drawing

$w = 1200
$h = 630
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# 1. Dark cybernetic gradient background
$ptStart = New-Object System.Drawing.PointF 0, 0
$ptEnd = New-Object System.Drawing.PointF $w, $h
$cBg1 = [System.Drawing.Color]::FromArgb(255, 7, 12, 34)
$cBg2 = [System.Drawing.Color]::FromArgb(255, 3, 6, 16)
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $ptStart, $ptEnd, $cBg1, $cBg2
$g.FillRectangle($bgBrush, 0, 0, $w, $h)

# 2. Cyber grid
$gridPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(18, 107, 140, 255)), 1
for ($x = 0; $x -lt $w; $x += 40) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
for ($y = 0; $y -lt $h; $y += 40) { $g.DrawLine($gridPen, 0, $y, $w, $y) }

# 3. Ambient Center Glow
$glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glowPath.AddEllipse(($w/2 - 380), ($h/2 - 280), 760, 560)
$pgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $glowPath
$pgb.CenterColor = [System.Drawing.Color]::FromArgb(45, 0, 240, 255)
$pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 240, 255))
$g.FillPath($pgb, $glowPath)

$goldGlow = New-Object System.Drawing.Drawing2D.GraphicsPath
$goldGlow.AddEllipse(($w/2 - 220), 40, 440, 320)
$goldPgb = New-Object System.Drawing.Drawing2D.PathGradientBrush $goldGlow
$goldPgb.CenterColor = [System.Drawing.Color]::FromArgb(40, 255, 207, 51)
$goldPgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 207, 51))
$g.FillPath($goldPgb, $goldGlow)

# 4. Outer border
$borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 0, 240, 255)), 2
$g.DrawRectangle($borderPen, 1, 1, ($w - 2), ($h - 2))

# 5. DRAW CENTERED SHIELD LOGO (Scale 3.5, centered at X = 600, Y = 155)
$scX = 600
$scY = 155
$sc = 3.5

$sPts = @(
    (New-Object System.Drawing.PointF ($scX), ($scY - 26 * $sc)),
    (New-Object System.Drawing.PointF ($scX + 22 * $sc), ($scY - 19 * $sc)),
    (New-Object System.Drawing.PointF ($scX + 22 * $sc), ($scY - 1 * $sc)),
    (New-Object System.Drawing.PointF ($scX + 13 * $sc), ($scY + 13.5 * $sc)),
    (New-Object System.Drawing.PointF ($scX), ($scY + 26 * $sc)),
    (New-Object System.Drawing.PointF ($scX - 13 * $sc), ($scY + 13.5 * $sc)),
    (New-Object System.Drawing.PointF ($scX - 22 * $sc), ($scY - 1 * $sc)),
    (New-Object System.Drawing.PointF ($scX - 22 * $sc), ($scY - 19 * $sc))
)
$sPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$sPath.AddPolygon($sPts)
$sBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 15, 24, 60))
$g.FillPath($sBg, $sPath)
$sBorderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 207, 51)), (4 * $sc / 3)
$g.DrawPath($sBorderPen, $sPath)

# Draw 'N' inside shield
$nPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 234, 240, 255)), (4.5 * $sc / 3)
$nPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$nPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($nPen, ($scX - 10 * $sc), ($scY + 10 * $sc), ($scX - 10 * $sc), ($scY - 10 * $sc))
$g.DrawLine($nPen, ($scX - 10 * $sc), ($scY - 10 * $sc), ($scX + 10 * $sc), ($scY + 10 * $sc))
$g.DrawLine($nPen, ($scX + 10 * $sc), ($scY + 10 * $sc), ($scX + 10 * $sc), ($scY - 10 * $sc))

# Draw 4 golden nodes
$nodeBr = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 207, 51))
$nodePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 11, 18, 53)), 2
$nr = 4.5 * $sc / 3
$pOff = 10 * $sc

$g.FillEllipse($nodeBr, ($scX - $pOff - $nr), ($scY - $pOff - $nr), ($nr * 2), ($nr * 2))
$g.DrawEllipse($nodePen, ($scX - $pOff - $nr), ($scY - $pOff - $nr), ($nr * 2), ($nr * 2))

$g.FillEllipse($nodeBr, ($scX - $pOff - $nr), ($scY + $pOff - $nr), ($nr * 2), ($nr * 2))
$g.DrawEllipse($nodePen, ($scX - $pOff - $nr), ($scY + $pOff - $nr), ($nr * 2), ($nr * 2))

$g.FillEllipse($nodeBr, ($scX + $pOff - $nr), ($scY - $pOff - $nr), ($nr * 2), ($nr * 2))
$g.DrawEllipse($nodePen, ($scX + $pOff - $nr), ($scY - $pOff - $nr), ($nr * 2), ($nr * 2))

$g.FillEllipse($nodeBr, ($scX + $pOff - $nr), ($scY + $pOff - $nr), ($nr * 2), ($nr * 2))
$g.DrawEllipse($nodePen, ($scX + $pOff - $nr), ($scY + $pOff - $nr), ($nr * 2), ($nr * 2))

# 6. CENTERED TYPOGRAPHY
$fontTitle = New-Object System.Drawing.Font "Segoe UI", 48, ([System.Drawing.FontStyle]::Bold)
$fontSub = New-Object System.Drawing.Font "Segoe UI", 21, ([System.Drawing.FontStyle]::Bold)
$fontDesc = New-Object System.Drawing.Font "Segoe UI", 16, ([System.Drawing.FontStyle]::Regular)

$brWhite = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$brGold = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 207, 51))
$brCyan = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
$brMuted = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 185, 205, 245))

$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center

# Brand Title
$g.DrawString("NEXAGUARD", $fontTitle, $brWhite, 600, 275, $sf)

# Tagline with Cyan & Gold
$g.DrawString("REPARACION DE ERRORES · MANTENIMIENTO · SEGURIDAD", $fontSub, $brCyan, 600, 360, $sf)

# Clear Description
$g.DrawString("Soporte tecnico experto para WordPress y WooCommerce. Desinfeccion de malware,", $fontDesc, $brMuted, 600, 415, $sf)
$g.DrawString("solucion de pantalla blanca, caidas de servidor y mantenimiento preventivo continuo 24/7.", $fontDesc, $brMuted, 600, 448, $sf)

# Feature Badges Pill Row
$pillRect = New-Object System.Drawing.RectangleF 220, 515, 760, 46
$pillBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(190, 15, 26, 68))
$pillBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(140, 255, 207, 51)), 1.5
$pPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$pr = 22
$pPath.AddArc($pillRect.X, $pillRect.Y, ($pr*2), ($pr*2), 180, 90)
$pPath.AddArc(($pillRect.Right - $pr*2), $pillRect.Y, ($pr*2), ($pr*2), 270, 90)
$pPath.AddArc(($pillRect.Right - $pr*2), ($pillRect.Bottom - $pr*2), ($pr*2), ($pr*2), 0, 90)
$pPath.AddArc($pillRect.X, ($pillRect.Bottom - $pr*2), ($pr*2), ($pr*2), 90, 90)
$pPath.CloseFigure()
$g.FillPath($pillBg, $pPath)
$g.DrawPath($pillBorder, $pPath)

$fontPillText = New-Object System.Drawing.Font "Segoe UI", 13, ([System.Drawing.FontStyle]::Bold)
$g.DrawString("nexaguards.com  |  Atendemos Emergencias y Mantenimiento 24/7", $fontPillText, $brGold, 600, 528, $sf)

$outPath = "C:\Users\DEVX\NEXAGUARD\nexaguard\public\brand\og-image.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
Write-Host "Generated centered og-image.png successfully!"
