Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Background Gradient
    $ptStart = New-Object System.Drawing.PointF 0, 0
    $ptEnd = New-Object System.Drawing.PointF $size, $size
    $cTop = [System.Drawing.Color]::FromArgb(255, 12, 22, 60)
    $cBottom = [System.Drawing.Color]::FromArgb(255, 4, 8, 22)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $ptStart, $ptEnd, $cTop, $cBottom
    
    # Rounded rect path
    $r = $size * 0.18
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $rect = New-Object System.Drawing.RectangleF 0, 0, $size, $size
    $path.AddArc($rect.X, $rect.Y, ($r * 2), ($r * 2), 180, 90)
    $path.AddArc(($rect.Right - $r * 2), $rect.Y, ($r * 2), ($r * 2), 270, 90)
    $path.AddArc(($rect.Right - $r * 2), ($rect.Bottom - $r * 2), ($r * 2), ($r * 2), 0, 90)
    $path.AddArc($rect.X, ($rect.Bottom - $r * 2), ($r * 2), ($r * 2), 90, 90)
    $path.CloseFigure()

    $g.FillPath($bgBrush, $path)

    # Outer border
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(100, 0, 240, 255)), ($size * 0.015)
    $g.DrawPath($borderPen, $path)

    # Concentric ambient circles
    $center = $size / 2
    $dashPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(35, 0, 240, 255)), 1
    $dashPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $g.DrawEllipse($dashPen, ($center - $size * 0.38), ($center - $size * 0.38), ($size * 0.76), ($size * 0.76))

    # Shield geometry
    $scale = $size / 64.0
    $shieldPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    
    $p1 = New-Object System.Drawing.PointF (32 * $scale), (6 * $scale)
    $p2 = New-Object System.Drawing.PointF (54 * $scale), (13 * $scale)
    $p3 = New-Object System.Drawing.PointF (54 * $scale), (31 * $scale)
    $bControl1 = New-Object System.Drawing.PointF (54 * $scale), (42 * $scale)
    $p4 = New-Object System.Drawing.PointF (45 * $scale), (45.5 * $scale)
    $p5 = New-Object System.Drawing.PointF (32 * $scale), (58 * $scale)
    $bControl2 = New-Object System.Drawing.PointF (10 * $scale), (42 * $scale)
    $p6 = New-Object System.Drawing.PointF (19 * $scale), (45.5 * $scale)
    $p7 = New-Object System.Drawing.PointF (10 * $scale), (31 * $scale)
    $p8 = New-Object System.Drawing.PointF (10 * $scale), (13 * $scale)

    $shieldPath.AddLine($p1, $p2)
    $shieldPath.AddLine($p2, $p3)
    $shieldPath.AddBezier($p3, $bControl1, $p4, $p5)
    $shieldPath.AddBezier($p5, $p6, $bControl2, $p7)
    $shieldPath.AddLine($p7, $p8)
    $shieldPath.CloseFigure()

    # Shield fill
    $cShieldTop = [System.Drawing.Color]::FromArgb(255, 21, 33, 85)
    $cShieldBot = [System.Drawing.Color]::FromArgb(255, 8, 15, 42)
    $shieldFill = New-Object System.Drawing.Drawing2D.LinearGradientBrush $p1, $p5, $cShieldTop, $cShieldBot
    $g.FillPath($shieldFill, $shieldPath)

    # Shield border gradient pen
    $cBorderGold = [System.Drawing.Color]::FromArgb(255, 255, 207, 51)
    $cBorderCyan = [System.Drawing.Color]::FromArgb(255, 0, 240, 255)
    $shieldBorder = New-Object System.Drawing.Drawing2D.LinearGradientBrush $p1, $p5, $cBorderGold, $cBorderCyan
    $shieldPen = New-Object System.Drawing.Pen $shieldBorder, (3.2 * $scale)
    $shieldPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPath($shieldPen, $shieldPath)

    # Circuit track "N"
    $cWhite = [System.Drawing.Color]::FromArgb(255, 240, 245, 255)
    $nPen = New-Object System.Drawing.Pen $cWhite, (4.4 * $scale)
    $nPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $nPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $nPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $np1 = New-Object System.Drawing.PointF (22 * $scale), (42 * $scale)
    $np2 = New-Object System.Drawing.PointF (22 * $scale), (22 * $scale)
    $np3 = New-Object System.Drawing.PointF (42 * $scale), (42 * $scale)
    $np4 = New-Object System.Drawing.PointF (42 * $scale), (22 * $scale)

    $g.DrawLine($nPen, $np1, $np2)
    $g.DrawLine($nPen, $np2, $np3)
    $g.DrawLine($nPen, $np3, $np4)

    # Circuit node circles
    $goldBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 207, 51))
    $cyanBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
    $darkPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 8, 15, 42)), (1.8 * $scale)

    $nodeR = 4.2 * $scale
    $nodes = @(
        @{ x = $np2.X; y = $np2.Y; brush = $goldBrush },
        @{ x = $np1.X; y = $np1.Y; brush = $cyanBrush },
        @{ x = $np3.X; y = $np3.Y; brush = $goldBrush },
        @{ x = $np4.X; y = $np4.Y; brush = $cyanBrush }
    )

    foreach ($n in $nodes) {
        $nx = $n.x - $nodeR
        $ny = $n.y - $nodeR
        $g.FillEllipse($n.brush, $nx, $ny, ($nodeR * 2), ($nodeR * 2))
        $g.DrawEllipse($darkPen, $nx, $ny, ($nodeR * 2), ($nodeR * 2))
    }

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated: $outPath ($size x $size)"
}

Generate-Icon 256 "C:\Users\DEVX\NEXAGUARD\nexaguard\wp-org-assets\icon-256x256.png"
Generate-Icon 128 "C:\Users\DEVX\NEXAGUARD\nexaguard\wp-org-assets\icon-128x128.png"

