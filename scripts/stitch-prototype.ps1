param([Parameter(Mandatory=$true)][string]$Viewport)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskFramesPath = Join-Path $taskRoot "artifacts/prototype/strips-$Viewport/frames.json"
$taskFrames = Get-Content -LiteralPath $taskFramesPath -Raw | ConvertFrom-Json
$taskFirst = [System.Drawing.Image]::FromFile($taskFrames[0].file)
$taskScale = $taskFirst.Height / $taskFrames[0].h
$taskWidth = $taskFirst.Width
$taskHeight = [int][Math]::Ceiling($taskFrames[-1].total * $taskScale)
$taskFirst.Dispose()
$taskBitmap = [System.Drawing.Bitmap]::new($taskWidth, $taskHeight)
$taskGraphics = [System.Drawing.Graphics]::FromImage($taskBitmap)
try {
  $taskGraphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#f4f0e7'))
  foreach ($taskFrame in $taskFrames) {
    $taskImage = [System.Drawing.Image]::FromFile($taskFrame.file)
    try {
      if ($taskImage.Width -ne $taskWidth) { throw 'Viewport changed during screenshot capture' }
      $taskCrop = if ($taskFrame.y -lt 1) { 0 } else { [int][Math]::Ceiling(($taskFrame.header + 1) * $taskScale) }
      $taskY = [int][Math]::Round($taskFrame.y * $taskScale) + $taskCrop
      $taskDrawHeight = [Math]::Min($taskImage.Height - $taskCrop, $taskHeight - $taskY)
      $taskSource = [System.Drawing.Rectangle]::new(0, $taskCrop, $taskWidth, $taskDrawHeight)
      $taskDestination = [System.Drawing.Rectangle]::new(0, $taskY, $taskWidth, $taskDrawHeight)
      $taskGraphics.DrawImage($taskImage, $taskDestination, $taskSource, [System.Drawing.GraphicsUnit]::Pixel)
    } finally { $taskImage.Dispose() }
  }
  $taskOutput = Join-Path $taskRoot "artifacts/prototype/page-$Viewport.png"
  $taskBitmap.Save($taskOutput, [System.Drawing.Imaging.ImageFormat]::Png)
  [pscustomobject]@{Path=$taskOutput;Width=$taskWidth;Height=$taskHeight;Frames=$taskFrames.Count}
} finally { $taskGraphics.Dispose(); $taskBitmap.Dispose() }
