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
