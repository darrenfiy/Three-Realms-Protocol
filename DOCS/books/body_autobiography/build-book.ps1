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
$combinedMarkdown = Join-Path $distDir "protocol-body-autobiography-manuscript.md"
$epubOutput = Join-Path $distDir "protocol-body-autobiography.epub"

function Find-Pandoc {
  $command = Get-Command pandoc -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidatePaths = @(
    (Join-Path $env:LOCALAPPDATA "Pandoc\pandoc.exe"),
    (Join-Path $env:ProgramFiles "Pandoc\pandoc.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Pandoc\pandoc.exe")
  ) | Where-Object { $_ }

  foreach ($candidate in $candidatePaths) {
    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  $registryRoots = @(
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall",
    "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
  )

  foreach ($root in $registryRoots) {
    $pandocEntry = Get-ChildItem $root -ErrorAction SilentlyContinue |
      ForEach-Object { Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue } |
      Where-Object { $_.DisplayName -like "*Pandoc*" } |
      Select-Object -First 1

    if ($pandocEntry -and $pandocEntry.InstallLocation) {
      $candidate = Join-Path $pandocEntry.InstallLocation "pandoc.exe"
      if (Test-Path -LiteralPath $candidate) {
        return $candidate
      }
    }
  }

  return $null
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

$preparedFiles = [System.Collections.Generic.List[string]]::new()
$combinedParts = [System.Collections.Generic.List[string]]::new()

for ($index = 0; $index -lt $orderedFiles.Count; $index++) {
  $relativePath = $orderedFiles[$index].Trim()
  $sourcePath = Join-Path $bookRoot $relativePath

  if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Source file not found: $sourcePath"
  }

  $rawText = Get-Content -Encoding UTF8 -LiteralPath $sourcePath -Raw
  $cleanText = $rawText.Trim()

  if ([string]::IsNullOrWhiteSpace($cleanText)) {
    throw "Source file is empty after trimming: $sourcePath"
  }

  $safeName = "{0:D2}-{1}" -f $index, ([System.IO.Path]::GetFileName($relativePath))
  $outputPath = Join-Path $buildDir $safeName
  Set-Content -Encoding UTF8 -LiteralPath $outputPath -Value $cleanText

  $preparedFiles.Add($outputPath)
  $combinedParts.Add($cleanText)
}

$combinedText = $combinedParts -join "`r`n`r`n"
Set-Content -Encoding UTF8 -LiteralPath $combinedMarkdown -Value $combinedText

Write-Host "Combined manuscript written to: $combinedMarkdown"

if ($Format -in @("epub", "all")) {
  $pandoc = Find-Pandoc

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
    ) + $preparedFiles

    Push-Location $bookRoot
    try {
      & $pandoc @pandocArgs
    }
    finally {
      Pop-Location
    }

    if ($LASTEXITCODE -ne 0) {
      throw "pandoc failed with exit code $LASTEXITCODE"
    }

    if (-not (Test-Path -LiteralPath $epubOutput)) {
      throw "pandoc finished without producing EPUB: $epubOutput"
    }

    Write-Host "EPUB written to: $epubOutput"
  }
}

Write-Host "Build complete."
