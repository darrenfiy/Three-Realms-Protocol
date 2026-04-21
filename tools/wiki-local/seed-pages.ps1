[CmdletBinding()]
param(
  [string]$BaseUrl = 'http://localhost',
  [string]$Locale = 'en'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$DockerBin = 'C:\Program Files\Docker\Docker\resources\bin'

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
  param(
    [Parameter(Mandatory = $true)]
    [string]$Email
  )

  $normalizedEmail = $Email.ToLowerInvariant()
  $emailJson = $normalizedEmail | ConvertTo-Json -Compress
  $js = @"
const path = require('path');
const { nanoid } = require('nanoid');
const { DateTime } = require('luxon');

(async () => {
  let WIKI = {
    IS_DEBUG: false,
    IS_MASTER: false,
    ROOTPATH: process.cwd(),
    INSTANCE_ID: nanoid(10),
    SERVERPATH: path.join(process.cwd(), 'server'),
    Error: require('./server/helpers/error'),
    configSvc: require('./server/core/config'),
    startedAt: DateTime.utc()
  };

  global.WIKI = WIKI;

  WIKI.configSvc.init();
  WIKI.logger = require('./server/core/logger').init('SCRIPT');
  WIKI.models = require('./server/core/db').init();

  await WIKI.models.onReady;
  await WIKI.configSvc.loadFromDb();
  await WIKI.configSvc.applyFlags();

  const user = await WIKI.models.users.query().findOne({ email: $emailJson });
  if (!user) {
    throw new Error('User not found for token generation: ' + $emailJson);
  }

  const out = await WIKI.models.users.refreshToken(user);
  console.log('TOKEN=' + out.token);

  await WIKI.models.knex.destroy();
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
"@

  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($js))
  $output = Invoke-DockerCompose -Args @(
    'exec',
    '-T',
    '-w',
    '/wiki',
    'wiki',
    'node',
    '-e',
    "eval(Buffer.from('$encoded','base64').toString())"
  ) 2>&1

  $tokenLine = $output |
    ForEach-Object { "$_" } |
    Where-Object { $_ -like 'TOKEN=*' } |
    Select-Object -Last 1

  if (-not $tokenLine) {
    throw "Failed to generate a token from the local Wiki.js container for $normalizedEmail."
  }

  return $tokenLine.Substring(6)
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
    [string]$SourceFile
  )

  $content = Get-Content -Raw -Path $SourceFile

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
      content = $content
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
    content = $content
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

$identityScript = Join-Path $ScriptDir 'ensure-identities.ps1'
& $identityScript

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

$tokenCache = @{}
$results = foreach ($page in $seedPages) {
  if (-not $tokenCache.ContainsKey($page.ActorEmail)) {
    $tokenCache[$page.ActorEmail] = Get-WikiUserToken -Email $page.ActorEmail
  }
  Set-WikiPage -Token $tokenCache[$page.ActorEmail] @page
}

$results | Format-Table Action, Id, Path, Title, ActorEmail -AutoSize

Write-Host ''
Write-Host "Seed complete. Open $BaseUrl to view the wiki."
