# Minimal static file server for previewing MHBenchCatalog.jsx
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1
$root = $PSScriptRoot
$port = 8000
$prefix = "http://localhost:$port/"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
try { $listener.Start() } catch {
  Write-Host "Could not start on $prefix : $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
Write-Host "Serving $root at $prefix" -ForegroundColor Green
Write-Host "Open:  ${prefix}preview.html" -ForegroundColor Cyan
Write-Host "Press Ctrl+C in this window to stop." -ForegroundColor DarkGray

$types = @{
  ".html"="text/html; charset=utf-8"; ".jsx"="text/javascript; charset=utf-8";
  ".js"="text/javascript; charset=utf-8"; ".css"="text/css; charset=utf-8";
  ".json"="application/json; charset=utf-8"; ".svg"="image/svg+xml";
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
  } catch { break }
  $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath.TrimStart('/'))
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "preview.html" }
  $path = Join-Path $root $rel
  $res = $ctx.Response
  $res.Headers["Cache-Control"] = "no-store"
  if (Test-Path $path -PathType Leaf) {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $ext = [System.IO.Path]::GetExtension($path).ToLower()
    if ($types.ContainsKey($ext)) { $res.ContentType = $types[$ext] }
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $res.StatusCode = 404
    $msg = [System.Text.Encoding]::UTF8.GetBytes("Not found: $rel")
    $res.OutputStream.Write($msg, 0, $msg.Length)
  }
  $res.OutputStream.Close()
}
