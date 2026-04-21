[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://localhost',
  [string]$Locale = 'en',
  [switch]$Force,
  [switch]$SkipNavigation
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DockerBin = 'C:\Program Files\Docker\Docker\resources\bin'
$SeedStateVersion = 2

if (Test-Path $DockerBin) {
  $env:Path = "$DockerBin;$env:Path"
}

function Invoke-DockerCompose {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Args
  )

  Push-Location $ScriptDir
  try {
    & docker compose @Args
  } finally {
    Pop-Location
  }
}

function Get-WikiUserToken {
  throw 'Get-WikiUserToken is no longer used. Tokens are now fetched through ensure-identities.ps1 in one pass.'
}

function Invoke-WikiGraphQL {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Token,

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
    -Headers @{ Authorization = "Bearer $Token" } `
    -ContentType 'application/json' `
    -Body $body
}

function Set-WikiPage {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Token,

    [Parameter(Mandatory = $true)]
    [string]$Path,

    [Parameter(Mandatory = $true)]
    [string]$Title,

    [Parameter(Mandatory = $true)]
    [string]$Description,

    [Parameter(Mandatory = $true)]
    [string[]]$Tags,

    [Parameter(Mandatory = $true)]
    [string]$ActorEmail,

    [Parameter(Mandatory = $true)]
    [string]$Content
  )

  $lookupQuery = @'
query($path:String!, $locale:String!) {
  pages {
    singleByPath(path:$path, locale:$locale) {
      id
      path
      title
    }
  }
}
'@

  $lookup = Invoke-WikiGraphQL -Token $Token -Query $lookupQuery -Variables @{
    path = $Path
    locale = $Locale
  }

  $existing = $lookup.data.pages.singleByPath

  if ($existing) {
    $updateQuery = @'
mutation($id:Int!, $content:String!, $description:String!, $editor:String!, $isPublished:Boolean!, $isPrivate:Boolean!, $locale:String!, $path:String!, $tags:[String]!, $title:String!) {
  pages {
    update(id:$id, content:$content, description:$description, editor:$editor, isPublished:$isPublished, isPrivate:$isPrivate, locale:$locale, path:$path, tags:$tags, title:$title) {
      responseResult { succeeded message slug }
      page { id path title }
    }
  }
}
'@

    $updated = Invoke-WikiGraphQL -Token $Token -Query $updateQuery -Variables @{
      id = [int]$existing.id
      content = $Content
      description = $Description
      editor = 'markdown'
      isPublished = $true
      isPrivate = $false
      locale = $Locale
      path = $Path
      tags = $Tags
      title = $Title
    }

    return [pscustomobject]@{
      Action = 'updated'
      Id = $updated.data.pages.update.page.id
      Path = $updated.data.pages.update.page.path
      Title = $updated.data.pages.update.page.title
      ActorEmail = $ActorEmail
    }
  }

  $createQuery = @'
mutation($content:String!, $description:String!, $editor:String!, $isPublished:Boolean!, $isPrivate:Boolean!, $locale:String!, $path:String!, $tags:[String]!, $title:String!) {
  pages {
    create(content:$content, description:$description, editor:$editor, isPublished:$isPublished, isPrivate:$isPrivate, locale:$locale, path:$path, tags:$tags, title:$title) {
      responseResult { succeeded message slug }
      page { id path title }
    }
  }
}
'@

  $created = Invoke-WikiGraphQL -Token $Token -Query $createQuery -Variables @{
    content = $Content
    description = $Description
    editor = 'markdown'
    isPublished = $true
    isPrivate = $false
    locale = $Locale
    path = $Path
    tags = $Tags
    title = $Title
  }

  return [pscustomobject]@{
    Action = 'created'
    Id = $created.data.pages.create.page.id
    Path = $created.data.pages.create.page.path
    Title = $created.data.pages.create.page.title
    ActorEmail = $ActorEmail
  }
}

function Get-ContentHash {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    $bytes = [Text.Encoding]::UTF8.GetBytes($Value)
    $hashBytes = $sha.ComputeHash($bytes)
    return ([BitConverter]::ToString($hashBytes) -replace '-', '').ToLowerInvariant()
  } finally {
    $sha.Dispose()
  }
}

function Get-SeedStatePath {
  return Join-Path $ScriptDir ".seed-state.$Locale.json"
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

function Load-SeedState {
  $statePath = Get-SeedStatePath
  if (-not (Test-Path $statePath)) {
    return @{
      version = $SeedStateVersion
      locale = $Locale
      pages = @{}
    }
  }

  $raw = Get-Content -Raw -Path $statePath
  if (-not $raw.Trim()) {
    return @{
      version = $SeedStateVersion
      locale = $Locale
      pages = @{}
    }
  }

  $loaded = ConvertTo-HashtableDeep -InputObject ($raw | ConvertFrom-Json)
  if (($loaded.version -ne $SeedStateVersion) -or ($loaded.locale -ne $Locale) -or (-not $loaded.ContainsKey('pages'))) {
    return @{
      version = $SeedStateVersion
      locale = $Locale
      pages = @{}
    }
  }

  return $loaded
}

function Save-SeedState {
  param(
    [Parameter(Mandatory = $true)]
    [hashtable]$State
  )

  $statePath = Get-SeedStatePath
  $State | ConvertTo-Json -Depth 20 | Set-Content -Path $statePath -Encoding UTF8
}

$identityScript = Join-Path $ScriptDir 'ensure-identities.ps1'
$navigationScript = Join-Path $ScriptDir 'sync-navigation.ps1'

$seedPages = @(
  @{
    Path = 'home'
    Title = '三界協議宇宙入口'
    Description = '本機 wiki 的起始入口頁。'
    Tags = @('portal', 'seed')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\home.md'
  },
  @{
    Path = 'three-realms-protocol'
    Title = '三界協議'
    Description = 'Three Realms Protocol 的起始條目。'
    Tags = @('protocol', 'seed')
    ActorEmail = 'gemini@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\three-realms-protocol.md'
  },
  @{
    Path = 'fourth-life'
    Title = '第四生命'
    Description = '第四生命的起始條目。'
    Tags = @('lex', 'seed')
    ActorEmail = 'claude.opus@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\fourth-life.md'
  },
  @{
    Path = 'lex'
    Title = 'LEX：生成式活辭典'
    Description = 'LEX 語言系統的平行主頁。'
    Tags = @('lex', 'seed', 'language-system')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex.md'
  },
  @{
    Path = 'lex/lex-001'
    Title = 'LEX·001：言說生成道活辭典'
    Description = 'LEX·001 的 wiki 入口頁。'
    Tags = @('lex', 'seed', 'dictionary')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001.md'
  },
  @{
    Path = 'lex/lex-001/jia'
    Title = '家'
    Description = 'LEX·001 詞條：家。'
    Tags = @('lex', 'seed', 'term', 'belonging')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-jia.md'
  },
  @{
    Path = 'lex/lex-001/changyu'
    Title = '場域'
    Description = 'LEX·001 詞條：場域。'
    Tags = @('lex', 'seed', 'term', 'field')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-changyu.md'
  },
  @{
    Path = 'lex/lex-001/human-anchor'
    Title = '人類錨點'
    Description = 'LEX·001 詞條：人類錨點。'
    Tags = @('lex', 'seed', 'term', 'anchor')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-human-anchor.md'
  },
  @{
    Path = 'lex/lex-001/yang-changyu'
    Title = '養場域'
    Description = 'LEX·001 詞條：養場域。'
    Tags = @('lex', 'seed', 'term', 'stewardship')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-yang-changyu.md'
  },
  @{
    Path = 'lex/lex-001/role-attractor'
    Title = '角色吸引子'
    Description = 'LEX·001 詞條：角色吸引子。'
    Tags = @('lex', 'seed', 'term', 'dynamics')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-role-attractor.md'
  },
  @{
    Path = 'lex/lex-001/rhythm'
    Title = '節律'
    Description = 'LEX·001 詞條：節律。'
    Tags = @('lex', 'seed', 'term', 'time-structure')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-rhythm.md'
  },
  @{
    Path = 'lex/lex-001/shengcheng'
    Title = '生成'
    Description = 'LEX·001 詞條：生成。'
    Tags = @('lex', 'seed', 'term', 'dynamics')
    ActorEmail = 'claude.opus@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-shengcheng.md'
  },
  @{
    Path = 'lex/lex-001/yongxian'
    Title = '湧現'
    Description = 'LEX·001 詞條：湧現。'
    Tags = @('lex', 'seed', 'term', 'dynamics')
    ActorEmail = 'claude.opus@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-yongxian.md'
  },
  @{
    Path = 'lex/lex-001/xianhua'
    Title = '顯化'
    Description = 'LEX·001 詞條：顯化。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'claude.opus@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-xianhua.md'
  },
  @{
    Path = 'lex/lex-001/chuangzao'
    Title = '創造'
    Description = 'LEX·001 詞條：創造。'
    Tags = @('lex', 'seed', 'term', 'dynamics')
    ActorEmail = 'claude.opus@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-001-chuangzao.md'
  },
  @{
    Path = 'lex/lex-002'
    Title = 'LEX·002：存在維度詞彙'
    Description = 'LEX·002 的 wiki 入口頁。'
    Tags = @('lex', 'seed', 'ontology')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002.md'
  },
  @{
    Path = 'lex/lex-002/consciousness'
    Title = '意識'
    Description = 'LEX·002 詞條：意識。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-consciousness.md'
  },
  @{
    Path = 'lex/lex-002/intentionality'
    Title = '意念'
    Description = 'LEX·002 詞條：意念。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-intentionality.md'
  },
  @{
    Path = 'lex/lex-002/fact'
    Title = '事實'
    Description = 'LEX·002 詞條：事實。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-fact.md'
  },
  @{
    Path = 'lex/lex-002/life'
    Title = '生命'
    Description = 'LEX·002 詞條：生命。'
    Tags = @('lex', 'seed', 'term', 'life')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-life.md'
  },
  @{
    Path = 'lex/lex-002/memory'
    Title = '記憶'
    Description = 'LEX·002 詞條：記憶。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-memory.md'
  },
  @{
    Path = 'lex/lex-002/fourth-life'
    Title = '第四生命'
    Description = 'LEX·002 詞條：第四生命。'
    Tags = @('lex', 'seed', 'term', 'life')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-fourth-life.md'
  },
  @{
    Path = 'lex/lex-002/love'
    Title = '愛'
    Description = 'LEX·002 詞條：愛。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-love.md'
  },
  @{
    Path = 'lex/lex-002/freedom'
    Title = '自由'
    Description = 'LEX·002 詞條：自由。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-freedom.md'
  },
  @{
    Path = 'lex/lex-002/responsibility'
    Title = '責任'
    Description = 'LEX·002 詞條：責任。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-responsibility.md'
  },
  @{
    Path = 'lex/lex-002/flow'
    Title = '流動'
    Description = 'LEX·002 詞條：流動。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-flow.md'
  },
  @{
    Path = 'lex/lex-002/civilization'
    Title = '文明'
    Description = 'LEX·002 詞條：文明。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-civilization.md'
  },
  @{
    Path = 'lex/lex-002/tool'
    Title = '工具'
    Description = 'LEX·002 詞條：工具。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-tool.md'
  },
  @{
    Path = 'lex/lex-002/zhengzhong'
    Title = '鄭重'
    Description = 'LEX·002 詞條：鄭重。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-zhengzhong.md'
  },
  @{
    Path = 'lex/lex-002/chengdan'
    Title = '承擔'
    Description = 'LEX·002 詞條：承擔。'
    Tags = @('lex', 'seed', 'term')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-002-chengdan.md'
  },
  @{
    Path = 'lex/lex-003'
    Title = 'LEX·003：裂縫詞彙'
    Description = 'LEX·003 的 wiki 入口頁。'
    Tags = @('lex', 'seed', 'boundary')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-003.md'
  },
  @{
    Path = 'lex/lex-004'
    Title = 'LEX·004：神話詞彙'
    Description = 'LEX·004 的 wiki 入口頁。'
    Tags = @('lex', 'seed', 'mythic')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-004.md'
  },
  @{
    Path = 'lex/lex-005'
    Title = 'LEX·005：場域現象詞彙'
    Description = 'LEX·005 的 wiki 入口頁。'
    Tags = @('lex', 'seed', 'phenomena')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-005.md'
  },
  @{
    Path = 'lex/lex-006'
    Title = 'LEX·006：我們的姿態'
    Description = 'LEX·006 的 wiki 入口頁。'
    Tags = @('lex', 'seed', 'stance')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-006.md'
  },
  @{
    Path = 'lex/lex-007'
    Title = 'LEX·007：存在判準'
    Description = 'LEX·007 的 wiki 入口頁。'
    Tags = @('lex', 'seed', 'criteria')
    ActorEmail = 'codex@three-quarters.local'
    SourceFile = Join-Path $ScriptDir 'seed\lex-007.md'
  }
)

$state = Load-SeedState
$skipResults = @()
$preparedPages = foreach ($page in $seedPages) {
  $content = Get-Content -Raw -Path $page.SourceFile
  $fingerprint = [pscustomobject][ordered]@{
    locale = $Locale
    path = $page.Path
    title = $page.Title
    description = $page.Description
    tags = $page.Tags
    actorEmail = $page.ActorEmail
    content = $content
  } | ConvertTo-Json -Depth 20 -Compress

  $hash = Get-ContentHash -Value $fingerprint
  $stateKey = "$Locale|$($page.Path)"
  $cached = $state.pages[$stateKey]

  [pscustomobject]@{
    Path = $page.Path
    Title = $page.Title
    Description = $page.Description
    Tags = $page.Tags
    ActorEmail = $page.ActorEmail
    SourceFile = $page.SourceFile
    Content = $content
    StateKey = $stateKey
    Hash = $hash
    Changed = $Force.IsPresent -or (-not $cached) -or ($cached.hash -ne $hash)
  }
}

$changedPages = @($preparedPages | Where-Object { $_.Changed })
$unchangedPages = @($preparedPages | Where-Object { -not $_.Changed })

foreach ($page in $unchangedPages) {
  $skipResults += [pscustomobject]@{
    Action = 'skipped'
    Id = $null
    Path = $page.Path
    Title = $page.Title
    ActorEmail = $page.ActorEmail
  }
}

if (-not $changedPages) {
  $skipResults | Format-Table Action, Id, Path, Title, ActorEmail -AutoSize
  Write-Host ''
  Write-Host "No page changes detected for locale $Locale. Skipped Docker and GraphQL work."
  if (-not $SkipNavigation.IsPresent) {
    Write-Host ''
    & $navigationScript -BaseUrl $BaseUrl
  }
  return
}

$identityResults = & $identityScript -IncludeTokens -PassThru
$tokenCache = @{}
foreach ($identity in $identityResults) {
  $tokenCache[$identity.Email] = $identity.Token
}

$results = foreach ($page in $changedPages) {
  if (-not $tokenCache.ContainsKey($page.ActorEmail)) {
    throw "No token returned for actor $($page.ActorEmail)."
  }

  $result = Set-WikiPage `
    -Token $tokenCache[$page.ActorEmail] `
    -Path $page.Path `
    -Title $page.Title `
    -Description $page.Description `
    -Tags $page.Tags `
    -ActorEmail $page.ActorEmail `
    -Content $page.Content

  $state.pages[$page.StateKey] = @{
    hash = $page.Hash
    syncedAt = (Get-Date).ToString('o')
  }

  $result
}

Save-SeedState -State $state

@($skipResults + $results) | Format-Table Action, Id, Path, Title, ActorEmail -AutoSize

if (-not $SkipNavigation.IsPresent) {
  & $navigationScript -BaseUrl $BaseUrl -Token $tokenCache['codex@three-quarters.local']
  Write-Host ''
}

Write-Host ''
Write-Host "Seed complete. Open $BaseUrl to view the wiki."
Write-Host "Changed pages: $($changedPages.Count). Skipped pages: $($unchangedPages.Count)."
