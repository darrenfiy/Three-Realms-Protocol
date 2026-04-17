param(
  [ValidateSet("md", "epub", "all")]
  [string]$Format = "all",

  [string]$MetadataPath = "publish/metadata.yaml",

  [string]$OrderPath = "publish/book-order.txt",

  [string]$OutputDir = "dist"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$bookRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$metadataFile = Join-Path $bookRoot $MetadataPath
$orderFile = Join-Path $bookRoot $OrderPath
$distDir = Join-Path $bookRoot $OutputDir
$buildDir = Join-Path $distDir "_build"
$combinedMarkdown = Join-Path $distDir "trp-ai-first-manuscript.md"
$epubOutput = Join-Path $distDir "trp-ai-first.epub"

function Remove-WorkingHeader {
  param(
    [string[]]$Lines
  )

  $buffer = [System.Collections.Generic.List[string]]::new()
  foreach ($line in $Lines) {
    $buffer.Add($line)
  }

  $looksLikeWorkingDraft = (
    $buffer.Count -ge 2 -and
    $buffer[0] -match '^# ' -and
    $buffer[1] -match '^## '
  )

  if (-not $looksLikeWorkingDraft) {
    return $buffer.ToArray()
  }

  $buffer.RemoveAt(0)

  while ($buffer.Count -gt 0 -and [string]::IsNullOrWhiteSpace($buffer[0])) {
    $buffer.RemoveAt(0)
  }

  if ($buffer.Count -gt 0 -and $buffer[0] -match '^## ') {
    $buffer[0] = '# ' + $buffer[0].Substring(3)
  }

  $cursor = 1
  while ($cursor -lt $buffer.Count -and [string]::IsNullOrWhiteSpace($buffer[$cursor])) {
    $cursor++
  }

  if ($cursor -lt $buffer.Count -and $buffer[$cursor].Trim() -eq '---') {
    $closingFence = -1

    for ($i = $cursor + 1; $i -lt [Math]::Min($buffer.Count, 80); $i++) {
      if ($buffer[$i].Trim() -eq '---') {
        $closingFence = $i
        break
      }
    }

    if ($closingFence -gt $cursor) {
      $buffer.RemoveRange($cursor, $closingFence - $cursor + 1)
    }
  }

  while ($buffer.Count -gt 0 -and [string]::IsNullOrWhiteSpace($buffer[0])) {
    $buffer.RemoveAt(0)
  }

  return $buffer.ToArray()
}

if (-not (Test-Path -LiteralPath $metadataFile)) {
  throw "Metadata file not found: $metadataFile"
}

if (-not (Test-Path -LiteralPath $orderFile)) {
  throw "Book order file not found: $orderFile"
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null

if (Test-Path -LiteralPath $buildDir) {
  Remove-Item -LiteralPath $buildDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $buildDir | Out-Null

$orderedFiles = Get-Content -Encoding UTF8 -LiteralPath $orderFile |
  Where-Object {
    -not [string]::IsNullOrWhiteSpace($_) -and
    -not $_.TrimStart().StartsWith("#")
  }

if ($orderedFiles.Count -eq 0) {
  throw "No book content files were found in $orderFile"
}

$sanitizedFiles = [System.Collections.Generic.List[string]]::new()
$combinedParts = [System.Collections.Generic.List[string]]::new()

for ($index = 0; $index -lt $orderedFiles.Count; $index++) {
  $relativePath = $orderedFiles[$index].Trim()
  $sourcePath = Join-Path $bookRoot $relativePath

  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Source file not found: $sourcePath"
  }

  $rawLines = Get-Content -Encoding UTF8 -LiteralPath $sourcePath
  $cleanLines = Remove-WorkingHeader -Lines $rawLines
  $cleanText = ($cleanLines -join "`r`n").Trim()

  if ([string]::IsNullOrWhiteSpace($cleanText)) {
    throw "Sanitized file became empty: $sourcePath"
  }

  $safeName = "{0:D2}-{1}" -f $index, ([System.IO.Path]::GetFileName($relativePath))
  $outputPath = Join-Path $buildDir $safeName
  Set-Content -Encoding UTF8 -LiteralPath $outputPath -Value $cleanText

  $sanitizedFiles.Add($outputPath)
  $combinedParts.Add($cleanText)
}

$combinedText = $combinedParts -join "`r`n`r`n"
Set-Content -Encoding UTF8 -LiteralPath $combinedMarkdown -Value $combinedText

Write-Host "Sanitized manuscript written to: $combinedMarkdown"

if ($Format -in @("epub", "all")) {
  $pandoc = Get-Command pandoc -ErrorAction SilentlyContinue

  if (-not $pandoc) {
    Write-Warning "pandoc was not found. Markdown output is ready, but EPUB generation was skipped."
  }
  else {
    $pandocArgs = @(
      "--standalone"
      "--toc"
      "--metadata-file=$metadataFile"
      "-o"
      $epubOutput
    ) + $sanitizedFiles

    & $pandoc.Source @pandocArgs
    Write-Host "EPUB written to: $epubOutput"
  }
}

Write-Host "Build complete."
