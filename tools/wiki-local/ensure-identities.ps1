[CmdletBinding()]
param(
  [switch]$IncludeTokens,
  [switch]$PassThru
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

$identities = @(
  @{ name = 'Codex'; email = 'codex@three-quarters.local' },
  @{ name = 'Gemini'; email = 'gemini@three-quarters.local' },
  @{ name = 'Claude Opus'; email = 'claude.opus@three-quarters.local' }
)

$identityJson = $identities | ConvertTo-Json -Depth 10 -Compress
$includeTokensJson = if ($IncludeTokens) { 'true' } else { 'false' }
$js = @'
const crypto = require('crypto');
const path = require('path');
const { nanoid } = require('nanoid');
const { DateTime } = require('luxon');

const identities = __IDENTITIES_JSON__;
const includeTokens = __INCLUDE_TOKENS__;

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

  const adminGroup = await WIKI.models.groups.query().findOne({ name: 'Administrators' });
  if (!adminGroup) {
    throw new Error('Administrators group not found.');
  }

  for (const identity of identities) {
    const normalizedEmail = identity.email.toLowerCase();
    let user = await WIKI.models.users.query().findOne({ email: normalizedEmail });
    let action = 'updated';

    if (!user) {
      action = 'created';
      user = await WIKI.models.users.query().insertAndFetch({
        providerKey: 'local',
        providerId: '',
        email: normalizedEmail,
        name: identity.name,
        password: crypto.randomBytes(24).toString('hex'),
        localeCode: WIKI.config.lang.code || 'en',
        defaultEditor: 'markdown',
        tfaIsActive: false,
        isSystem: false,
        isActive: true,
        isVerified: true
      });
    } else {
      user = await WIKI.models.users.query().patchAndFetchById(user.id, {
        name: identity.name,
        providerKey: 'local',
        providerId: user.providerId || '',
        localeCode: user.localeCode || WIKI.config.lang.code || 'en',
        defaultEditor: user.defaultEditor || 'markdown',
        isSystem: false,
        isActive: true,
        isVerified: true
      });
    }

    const groupRows = await user.$relatedQuery('groups').select('groups.id');
    const hasAdmin = groupRows.some(grp => grp.id === adminGroup.id);
    if (!hasAdmin) {
      await user.$relatedQuery('groups').relate(adminGroup.id);
    }

    let token = null;
    if (includeTokens) {
      const out = await WIKI.models.users.refreshToken(user);
      token = out.token;
    }

    console.log('IDENTITY_JSON=' + JSON.stringify({
      action,
      id: user.id,
      name: user.name,
      email: user.email,
      token
    }));
  }

  await WIKI.models.knex.destroy();
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
'@

$js = $js.Replace('__IDENTITIES_JSON__', $identityJson)
$js = $js.Replace('__INCLUDE_TOKENS__', $includeTokensJson)

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

$results = $output |
  ForEach-Object { "$_" } |
  Where-Object { $_ -like 'IDENTITY_JSON=*' } |
  ForEach-Object {
    $json = $_.Substring(14) | ConvertFrom-Json
    [pscustomobject]@{
      Action = $json.action
      Id = [int]$json.id
      Name = $json.name
      Email = $json.email
      Token = $json.token
    }
  }

if (-not $results) {
  $rawOutput = ($output | ForEach-Object { "$_" }) -join [Environment]::NewLine
  throw "Failed to create or update the AI editor identities.`n$rawOutput"
}

if ($PassThru) {
  $results
} else {
  $results | Select-Object Action, Id, Name, Email | Format-Table -AutoSize
}
