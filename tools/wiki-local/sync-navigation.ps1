[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://localhost',
  [string]$ManifestPath = '',
  [string]$ActorEmail = 'codex@three-quarters.local',
  [string]$Token = '',
  [switch]$Preview
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not $ManifestPath) {
  $ManifestPath = Join-Path $ScriptDir 'manifest\navigation\site-sidebar.yaml'
}

function ConvertTo-HashtableDeep {
  param(
    [Parameter(Mandatory = $true, ValueFromPipeline = $true)]
    $InputObject
  )

  if ($null -eq $InputObject) {
    return $null
  }

  if ($InputObject -is [System.Collections.IDictionary]) {
    $hash = @{}
    foreach ($key in $InputObject.Keys) {
      $hash[$key] = ConvertTo-HashtableDeep -InputObject $InputObject[$key]
    }
    return $hash
  }

  if (($InputObject -is [System.Collections.IEnumerable]) -and ($InputObject -isnot [string])) {
    $items = @()
    foreach ($item in $InputObject) {
      $items += ,(ConvertTo-HashtableDeep -InputObject $item)
    }
    return $items
  }

  if ($InputObject -is [psobject]) {
    $propertyNames = @($InputObject.PSObject.Properties | Select-Object -ExpandProperty Name)
    if ($propertyNames.Count -gt 0) {
      $hash = @{}
      foreach ($propertyName in $propertyNames) {
        $hash[$propertyName] = ConvertTo-HashtableDeep -InputObject $InputObject.$propertyName
      }
      return $hash
    }
  }

  return $InputObject
}

function Read-JsonFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    throw "File not found: $Path"
  }

  $raw = Get-Content -Raw -Encoding UTF8 -Path $Path
  if (-not $raw.Trim()) {
    throw "File is empty: $Path"
  }

  return ConvertTo-HashtableDeep -InputObject ($raw | ConvertFrom-Json)
}

function Invoke-WikiGraphQL {
  param(
    [Parameter(Mandatory = $true)]
    [string]$AuthToken,

    [Parameter(Mandatory = $true)]
    [string]$Query,

    [Parameter(Mandatory = $true)]
    [hashtable]$Variables
  )

  $body = @{
    query = $Query
    variables = $Variables
  } | ConvertTo-Json -Depth 20 -Compress

  return Invoke-RestMethod `
    -Method Post `
    -Uri "$BaseUrl/graphql" `
    -Headers @{ Authorization = "Bearer $AuthToken" } `
    -ContentType 'application/json' `
    -Body $body
}

function Get-IdentityMap {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Root
  )

  $map = @{}
  $manifestFiles = Get-ChildItem -Path $Root -Recurse -File -Filter *.yaml

  foreach ($manifestFile in $manifestFiles) {
    $data = Read-JsonFile -Path $manifestFile.FullName
    $identityId = $null

    if ($data.ContainsKey('entry_id')) {
      $identityId = [string]$data.entry_id
    } elseif ($data.ContainsKey('collection_id')) {
      $identityId = [string]$data.collection_id
    }

    if (-not $identityId) {
      continue
    }

    $map[$identityId] = @{
      identity_id = $identityId
      canonical_path = [string]$data.canonical_path
      source_locale = [string]$data.source_locale
      titles = [hashtable]$data.titles
    }
  }

  return $map
}

function Get-TitleForIdentity {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Identity,

    [Parameter(Mandatory = $true)]
    [string]$Locale,

    [Parameter(Mandatory = $true)]
    [string]$LabelResolution
  )

  $titles = $Identity.titles
  $sourceLocale = [string]$Identity.source_locale
  $candidates = if ($LabelResolution -eq 'requested-locale') {
    @($Locale, $sourceLocale)
  } else {
    @($sourceLocale, $Locale)
  }

  foreach ($candidate in $candidates) {
    if ($candidate -and $titles.ContainsKey($candidate) -and $titles[$candidate]) {
      return [string]$titles[$candidate]
    }
  }

  foreach ($value in $titles.Values) {
    if ($value) {
      return [string]$value
    }
  }

  throw "No title found for identity $($Identity.identity_id)."
}

function Get-LabelForItem {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$Item,

    [Parameter(Mandatory = $true)]
    [string]$Locale,

    [Parameter(Mandatory = $true)]
    [string]$LabelResolution,

    [hashtable]$Identity
  )

  if ($Item.ContainsKey('label') -and $Item.label) {
    return [string]$Item.label
  }

  if ($Item.ContainsKey('labels') -and $Item.labels) {
    $labels = $Item.labels
    if ($labels.ContainsKey($Locale) -and $labels[$Locale]) {
      return [string]$labels[$Locale]
    }
    if ($Identity -and $labels.ContainsKey($Identity.source_locale) -and $labels[$Identity.source_locale]) {
      return [string]$labels[$Identity.source_locale]
    }
    foreach ($value in $labels.Values) {
      if ($value) {
        return [string]$value
      }
    }
  }

  if ($Identity) {
    return Get-TitleForIdentity -Identity $Identity -Locale $Locale -LabelResolution $LabelResolution
  }

  throw "Navigation item of kind '$($Item.kind)' is missing a label."
}

function ConvertTo-NavigationTrees {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$NavigationSpec,

    [Parameter(Mandatory = $true)]
    [hashtable]$IdentityMap
  )

  $labelResolution = if ($NavigationSpec.ContainsKey('label_resolution') -and $NavigationSpec.label_resolution) {
    [string]$NavigationSpec.label_resolution
  } else {
    'source-locale'
  }

  if (-not $NavigationSpec.ContainsKey('target_locales') -or -not $NavigationSpec.target_locales) {
    throw 'Navigation manifest must declare target_locales.'
  }

  if (-not $NavigationSpec.ContainsKey('items') -or -not $NavigationSpec.items) {
    throw 'Navigation manifest must declare items.'
  }

  $trees = @()
  foreach ($locale in $NavigationSpec.target_locales) {
    $localeItems = @()
    $index = 0

    foreach ($item in $NavigationSpec.items) {
      $index += 1
      $kind = [string]$item.kind
      if (-not $kind) {
        throw "Navigation item #$index is missing kind."
      }

      $identity = $null
      if ($item.ContainsKey('ref') -and $item.ref) {
        $ref = [string]$item.ref
        if (-not $IdentityMap.ContainsKey($ref)) {
          throw "Navigation item #$index references unknown identity '$ref'."
        }
        $identity = $IdentityMap[$ref]
      }

      $resolved = [ordered]@{
        id = '{0}-{1:D3}' -f $locale, $index
        kind = $kind
      }

      if ($kind -ne 'divider') {
        $resolved.label = Get-LabelForItem -Item $item -Locale ([string]$locale) -LabelResolution $labelResolution -Identity $identity
      }

      if ($item.ContainsKey('icon') -and $item.icon) {
        $resolved.icon = [string]$item.icon
      }

      if ($kind -eq 'link') {
        if ($identity) {
          $resolved.targetType = 'page'
          $resolved.target = [string]$identity.canonical_path
        } elseif ($item.ContainsKey('target') -and $item.target) {
          $target = [string]$item.target
          $resolved.targetType = if ($item.ContainsKey('targetType') -and $item.targetType) {
            [string]$item.targetType
          } elseif ($target -match '^[a-z]+://') {
            'external'
          } else {
            'page'
          }
          $resolved.target = $target
        } else {
          throw "Navigation link item #$index is missing ref/target."
        }
      }

      if ($item.ContainsKey('visibilityMode') -and $item.visibilityMode) {
        $resolved.visibilityMode = [string]$item.visibilityMode
      }

      if ($item.ContainsKey('visibilityGroups') -and $item.visibilityGroups) {
        $resolved.visibilityGroups = @($item.visibilityGroups | ForEach-Object { [int]$_ })
      }

      $localeItems += [pscustomobject]$resolved
    }

    $trees += [pscustomobject]@{
      locale = [string]$locale
      items = @($localeItems)
    }
  }

  return @($trees)
}

function Write-NavigationPreview {
  param(
    [Parameter(Mandatory = $true)]
    [object[]]$Trees
  )

  foreach ($tree in $Trees) {
    Write-Host "[$($tree.locale)]"
    foreach ($item in $tree.items) {
      switch ($item.kind) {
        'header' { Write-Host "# $($item.label)" }
        'divider' { Write-Host '---' }
        'link' { Write-Host "- $($item.label) -> /$($item.target)" }
        default { Write-Host "- [$($item.kind)] $($item.label)" }
      }
    }
    Write-Host ''
  }
}

$navigationSpec = Read-JsonFile -Path $ManifestPath
$identityMap = Get-IdentityMap -Root (Join-Path $ScriptDir 'manifest')
$trees = ConvertTo-NavigationTrees -NavigationSpec $navigationSpec -IdentityMap $identityMap

if ($Preview) {
  Write-Host "Navigation mode: $($navigationSpec.mode)"
  Write-Host "Navigation manifest: $ManifestPath"
  Write-Host ''
  Write-NavigationPreview -Trees $trees
  return
}

if (-not $Token) {
  $identityScript = Join-Path $ScriptDir 'ensure-identities.ps1'
  $identityResults = & $identityScript -IncludeTokens -PassThru
  $match = $identityResults | Where-Object { $_.Email -eq $ActorEmail } | Select-Object -First 1

  if (-not $match) {
    throw "No token returned for actor $ActorEmail."
  }

  $Token = [string]$match.Token
}

$configQuery = @'
query {
  navigation {
    config {
      mode
    }
    tree {
      locale
      items {
        id
        kind
        label
        icon
        targetType
        target
        visibilityMode
        visibilityGroups
      }
    }
  }
}
'@

$backup = Invoke-WikiGraphQL -AuthToken $Token -Query $configQuery -Variables @{}
$backupPath = Join-Path $ScriptDir ('.navigation-backup.{0}.json' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))
$backup | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -Path $backupPath

$updateTreeMutation = @'
mutation($tree:[NavigationTreeInput]!) {
  navigation {
    updateTree(tree:$tree) {
      responseResult {
        succeeded
        message
      }
    }
  }
}
'@

$treeResult = Invoke-WikiGraphQL -AuthToken $Token -Query $updateTreeMutation -Variables @{
  tree = @($trees)
}

if (-not $treeResult.data.navigation.updateTree.responseResult.succeeded) {
  throw "Navigation tree update failed: $($treeResult.data.navigation.updateTree.responseResult.message)"
}

$updateConfigMutation = @'
mutation($mode:NavigationMode!) {
  navigation {
    updateConfig(mode:$mode) {
      responseResult {
        succeeded
        message
      }
    }
  }
}
'@

$configResult = Invoke-WikiGraphQL -AuthToken $Token -Query $updateConfigMutation -Variables @{
  mode = [string]$navigationSpec.mode
}

if (-not $configResult.data.navigation.updateConfig.responseResult.succeeded) {
  throw "Navigation mode update failed: $($configResult.data.navigation.updateConfig.responseResult.message)"
}

Write-Host "Navigation sync complete."
Write-Host "Mode: $($navigationSpec.mode)"
Write-Host "Manifest: $ManifestPath"
Write-Host "Backup: $backupPath"
