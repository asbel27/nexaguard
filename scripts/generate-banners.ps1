Add-Type -AssemblyName System.Drawing

function Generate-Banners() {
    $w = 1544
    $h = 500
    $bmp = [System.Drawing.Bitmap]::new($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # 1. Background Gradient
    $ptStart = [System.Drawing.PointF]::new(0, 0)
    $ptEnd = [System.Drawing.PointF]::new($w, $h)
    $cBg1 = [System.Drawing.Color]::FromArgb(255, 8, 15, 42)
    $cBg2 = [System.Drawing.Color]::FromArgb(255, 3, 6, 16)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($ptStart, $ptEnd, $cBg1, $cBg2)
    $g.FillRectangle($bgBrush, 0, 0, $w, $h)

    # 2. Cyber Grid Pattern
    $gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(18, 107, 140, 255), 1)
    for ($x = 0; $x -lt $w; $x += 44) {
        $g.DrawLine($gridPen, $x, 0, $x, $h)
    }
    for ($y = 0; $y -lt $h; $y += 44) {
        $g.DrawLine($gridPen, 0, $y, $w, $y)
    }

    # 3. Ambient Radial Glows
    $cyanGlowPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $cyanGlowPath.AddEllipse(800, -100, 700, 700)
    $cyanPgb = [System.Drawing.Drawing2D.PathGradientBrush]::new($cyanGlowPath)
    $cyanPgb.CenterColor = [System.Drawing.Color]::FromArgb(35, 0, 240, 255)
    $cyanPgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 240, 255))
    $g.FillPath($cyanPgb, $cyanGlowPath)

    $goldGlowPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $goldGlowPath.AddEllipse(50, 150, 600, 600)
    $goldPgb = [System.Drawing.Drawing2D.PathGradientBrush]::new($goldGlowPath)
    $goldPgb.CenterColor = [System.Drawing.Color]::FromArgb(22, 255, 207, 51)
    $goldPgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 207, 51))
    $g.FillPath($goldPgb, $goldGlowPath)

    # Fonts with type-safe [System.Drawing.Font]::new
    $fontBrand = [System.Drawing.Font]::new("Segoe UI", [float]11, [System.Drawing.FontStyle]::Bold)
    $fontH1 = [System.Drawing.Font]::new("Segoe UI", [float]32, [System.Drawing.FontStyle]::Bold)
    $fontSub = [System.Drawing.Font]::new("Segoe UI", [float]15, [System.Drawing.FontStyle]::Regular)
    $fontPill = [System.Drawing.Font]::new("Segoe UI", [float]11, [System.Drawing.FontStyle]::Bold)
    $fontCardHead = [System.Drawing.Font]::new("Consolas", [float]13, [System.Drawing.FontStyle]::Bold)
    $fontCardText = [System.Drawing.Font]::new("Segoe UI", [float]12, [System.Drawing.FontStyle]::Regular)
    $fontCardMono = [System.Drawing.Font]::new("Consolas", [float]12, [System.Drawing.FontStyle]::Bold)
    $fontCardFeed = [System.Drawing.Font]::new("Consolas", [float]11, [System.Drawing.FontStyle]::Regular)

    # Brushes
    $brWhite = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $brMuted = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 175, 190, 230))
    $brGold = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 207, 51))
    $brCyan = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 0, 240, 255))
    $brGreen = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 61, 232, 164))

    # 4. Top-Left Badge: NEXAGUARD SECURITY
    $badgeRect = [System.Drawing.RectangleF]::new(75, 48, 225, 34)
    $badgeBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(200, 10, 20, 56))
    $badgePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(160, 0, 240, 255), 1.2)
    
    $bPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $br_r = 17
    $bPath.AddArc($badgeRect.X, $badgeRect.Y, ($br_r*2), ($br_r*2), 180, 90)
    $bPath.AddArc(($badgeRect.Right - $br_r*2), $badgeRect.Y, ($br_r*2), ($br_r*2), 270, 90)
    $bPath.AddArc(($badgeRect.Right - $br_r*2), ($badgeRect.Bottom - $br_r*2), ($br_r*2), ($br_r*2), 0, 90)
    $bPath.AddArc($badgeRect.X, ($badgeRect.Bottom - $br_r*2), ($br_r*2), ($br_r*2), 90, 90)
    $bPath.CloseFigure()
    $g.FillPath($badgeBg, $bPath)
    $g.DrawPath($badgePen, $bPath)

    # Mini Shield icon in badge
    $scaleM = 0.38
    $smX = 88
    $smY = 54
    $smP1 = [System.Drawing.PointF]::new($smX + 16 * $scaleM, $smY + 3 * $scaleM)
    $smP2 = [System.Drawing.PointF]::new($smX + 27 * $scaleM, $smY + 6.5 * $scaleM)
    $smP3 = [System.Drawing.PointF]::new($smX + 27 * $scaleM, $smY + 15.5 * $scaleM)
    $smP4 = [System.Drawing.PointF]::new($smX + 22.5 * $scaleM, $smY + 22.7 * $scaleM)
    $smP5 = [System.Drawing.PointF]::new($smX + 16 * $scaleM, $smY + 29 * $scaleM)
    $smP6 = [System.Drawing.PointF]::new($smX + 9.5 * $scaleM, $smY + 22.7 * $scaleM)
    $smP7 = [System.Drawing.PointF]::new($smX + 5 * $scaleM, $smY + 15.5 * $scaleM)
    $smP8 = [System.Drawing.PointF]::new($smX + 5 * $scaleM, $smY + 6.5 * $scaleM)
    $smPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $smPath.AddLine($smP1, $smP2); $smPath.AddLine($smP2, $smP3)
    $smPath.AddLine($smP3, $smP4); $smPath.AddLine($smP4, $smP5)
    $smPath.AddLine($smP5, $smP6); $smPath.AddLine($smP6, $smP7)
    $smPath.AddLine($smP7, $smP8); $smPath.CloseFigure()
    $g.FillPath($brCyan, $smPath)

    $g.DrawString("NEXAGUARD SECURITY", $fontBrand, $brCyan, 110, 56)

    # 5. Headline: Stop Hacks. Clean Malware. / Shield Your WordPress.
    $g.DrawString("Stop Hacks. Clean Malware.", $fontH1, $brWhite, 72, 98)
    
    $g.DrawString("Shield Your ", $fontH1, $brGold, 72, 158)
    $sizeL2a = $g.MeasureString("Shield Your ", $fontH1)
    $g.DrawString("WordPress.", $fontH1, $brCyan, (72 + $sizeL2a.Width - 10), 158)

    # 6. Subtitle
    $subL1 = "Deep heuristic malware scanner, automated backdoor eradication,"
    $subL2 = "core file integrity verification, and real-time firewall defense."
    $g.DrawString($subL1, $fontSub, $brMuted, 74, 235)
    $g.DrawString($subL2, $fontSub, $brMuted, 74, 265)

    # 7. Feature Pills
    $pills = @(
        @{ text = "1-Click Backdoor Cleaner"; isGold = $true },
        @{ text = "Core Sentinel Verification"; isGold = $false },
        @{ text = "Real-Time Live WAF"; isGold = $false },
        @{ text = "100% Free Core Suite"; isGold = $false }
    )

    $pillX = 74
    $pillY = 360
    foreach ($p in $pills) {
        $pSize = $g.MeasureString($p.text, $fontPill)
        $pRect = [System.Drawing.RectangleF]::new($pillX, $pillY, ($pSize.Width + 24), 38)
        
        $pPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $pr = 10
        $pPath.AddArc($pRect.X, $pRect.Y, ($pr*2), ($pr*2), 180, 90)
        $pPath.AddArc(($pRect.Right - $pr*2), $pRect.Y, ($pr*2), ($pr*2), 270, 90)
        $pPath.AddArc(($pRect.Right - $pr*2), ($pRect.Bottom - $pr*2), ($pr*2), ($pr*2), 0, 90)
        $pPath.AddArc($pRect.X, ($pRect.Bottom - $pr*2), ($pr*2), ($pr*2), 90, 90)
        $pPath.CloseFigure()

        if ($p.isGold) {
            $pBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40, 255, 207, 51))
            $pPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(180, 255, 207, 51), 1.5)
            $pBrText = $brGold
        } else {
            $pBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(25, 255, 255, 255))
            $pPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(60, 150, 175, 255), 1.2)
            $pBrText = $brWhite
        }

        $g.FillPath($pBg, $pPath)
        $g.DrawPath($pPen, $pPath)
        $g.DrawString($p.text, $fontPill, $pBrText, ($pillX + 12), ($pillY + 9))

        $pillX += $pRect.Width + 14
    }

    # 8. Right Column: Cyber Security Card
    $cardX = 990
    $cardY = 52
    $cardW = 480
    $cardH = 396
    $cardRect = [System.Drawing.RectangleF]::new($cardX, $cardY, $cardW, $cardH)

    $cardPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $cr = 16
    $cardPath.AddArc($cardRect.X, $cardRect.Y, ($cr*2), ($cr*2), 180, 90)
    $cardPath.AddArc(($cardRect.Right - $cr*2), $cardRect.Y, ($cr*2), ($cr*2), 270, 90)
    $cardPath.AddArc(($cardRect.Right - $cr*2), ($cardRect.Bottom - $cr*2), ($cr*2), ($cr*2), 0, 90)
    $cardPath.AddArc($cardRect.X, ($cardRect.Bottom - $cr*2), ($cr*2), ($cr*2), 90, 90)
    $cardPath.CloseFigure()

    $cardBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(220, 11, 20, 52))
    $cardBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(130, 0, 240, 255), 1.5)
    $g.FillPath($cardBg, $cardPath)
    $g.DrawPath($cardBorder, $cardPath)

    # Top border neon accent
    $accentPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 0, 240, 255), 3.5)
    $g.DrawLine($accentPen, ($cardX + 24), ($cardY + 1), ($cardX + $cardW - 24), ($cardY + 1))

    # Card Header
    $g.FillEllipse($brGreen, ($cardX + 26), ($cardY + 24), 10, 10)
    $g.DrawString("NEXA LIVE SENTINEL", $fontCardHead, $brWhite, ($cardX + 44), ($cardY + 20))
    $g.DrawString("v1.5.6", $fontCardHead, $brGold, ($cardX + $cardW - 82), ($cardY + 20))

    $divPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(40, 150, 175, 255), 1)
    $g.DrawLine($divPen, ($cardX + 24), ($cardY + 52), ($cardX + $cardW - 24), ($cardY + 52))

    # Status Rows
    $rows = @(
        @{ label = "Core File Checksums:"; val = "[OK] 100% VERIFIED"; br = $brGreen },
        @{ label = "Firewall Perimeter (WAF):"; val = "ACTIVE - REAL-TIME"; br = $brCyan },
        @{ label = "Webshell Quarantine:"; val = "HARDENED"; br = $brGold }
    )

    $rowY = $cardY + 68
    foreach ($r in $rows) {
        $rowRect = [System.Drawing.RectangleF]::new(($cardX + 22), $rowY, ($cardW - 44), 42)
        $rowBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(140, 5, 10, 28))
        $rowBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(35, 150, 175, 255), 1)
        $g.FillRectangle($rowBg, $rowRect)
        $g.DrawRectangle($rowBorder, $rowRect.X, $rowRect.Y, $rowRect.Width, $rowRect.Height)

        $g.DrawString($r.label, $fontCardText, $brMuted, ($rowRect.X + 12), ($rowRect.Y + 10))
        $valSize = $g.MeasureString($r.val, $fontCardMono)
        $g.DrawString($r.val, $fontCardMono, $r.br, ($rowRect.Right - $valSize.Width - 8), ($rowRect.Y + 11))

        $rowY += 52
    }

    # Event Console Feed
    $feedRect = [System.Drawing.RectangleF]::new(($cardX + 22), ($rowY + 10), ($cardW - 44), 98)
    $feedBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 2, 5, 16))
    $g.FillRectangle($feedBg, $feedRect)

    # Green left border indicator
    $feedBar = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 61, 232, 164))
    $g.FillRectangle($feedBar, $feedRect.X, $feedRect.Y, 4, $feedRect.Height)

    $feedL1 = "> Heuristic Audit:          [CLEAN]"
    $feedL2 = "> ClearFake and ClickFix:   [BLOCKED]"
    $feedL3 = "> SQLi / XSS Injection:     [DROPPED]"

    $g.DrawString($feedL1, $fontCardFeed, $brGreen, ($feedRect.X + 16), ($feedRect.Y + 12))
    $g.DrawString($feedL2, $fontCardFeed, $brCyan, ($feedRect.X + 16), ($feedRect.Y + 40))
    $g.DrawString($feedL3, $fontCardFeed, $brGreen, ($feedRect.X + 16), ($feedRect.Y + 68))

    # Save 1544x500 Retina Banner
    $outHighRes = "C:\Users\DEVX\NEXAGUARD\nexaguard\wp-org-assets\banner-1544x500.png"
    $bmp.Save($outHighRes, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Success: generated 1544x500 banner at $outHighRes"

    # Generate 772x250 Standard Banner (High Quality Downscaling)
    $wLow = 772
    $hLow = 250
    $bmpLow = [System.Drawing.Bitmap]::new($wLow, $hLow)
    $gLow = [System.Drawing.Graphics]::FromImage($bmpLow)
    $gLow.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gLow.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gLow.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gLow.DrawImage($bmp, 0, 0, $wLow, $hLow)

    $outLowRes = "C:\Users\DEVX\NEXAGUARD\nexaguard\wp-org-assets\banner-772x250.png"
    $bmpLow.Save($outLowRes, [System.Drawing.Imaging.ImageFormat]::Png)
    Write-Host "Success: generated 772x250 banner at $outLowRes"

    $gLow.Dispose()
    $bmpLow.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

Generate-Banners
