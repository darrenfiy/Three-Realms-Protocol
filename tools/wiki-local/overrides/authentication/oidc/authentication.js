const _ = require('lodash')

/* global WIKI */

// ------------------------------------
// OpenID Connect Account
// ------------------------------------

const OpenIDConnectStrategy = require('passport-openidconnect').Strategy

function parseIdTokenClaims (idToken) {
  if (!idToken || typeof idToken !== 'string') {
    return {}
  }

  try {
    const parts = idToken.split('.')
    if (parts.length < 2) {
      return {}
    }

    const payload = Buffer.from(parts[1], 'base64').toString('utf8')
    return JSON.parse(payload)
  } catch (err) {
    return {}
  }
}

module.exports = {
  init (passport, conf) {
    passport.use(conf.key,
      new OpenIDConnectStrategy({
        authorizationURL: conf.authorizationURL,
        tokenURL: conf.tokenURL,
        clientID: conf.clientId,
        clientSecret: conf.clientSecret,
        issuer: conf.issuer,
        userInfoURL: conf.userInfoURL,
        callbackURL: conf.callbackURL,
        passReqToCallback: true,
        skipUserProfile: conf.skipUserProfile,
        acrValues: conf.acrValues
      }, async (req, iss, uiProfile, idProfile, context, idToken, accessToken, refreshToken, params, cb) => {
        const tokenClaims = parseIdTokenClaims(idToken)
        const rawClaims = _.get(uiProfile, '_json', tokenClaims)
        const profile = Object.assign({}, idProfile || {}, uiProfile || {})
        const picture = _.get(rawClaims, conf.pictureClaim, '')

        try {
          const user = await WIKI.models.users.processProfile({
            providerKey: req.params.strategy,
            profile: {
              ...profile,
              email: _.get(rawClaims, conf.emailClaim, _.get(profile, 'emails[0].value')),
              displayName: _.get(rawClaims, conf.displayNameClaim, profile.displayName || ''),
              picture: picture
            }
          })
          if (conf.mapGroups) {
            const groups = _.get(rawClaims, conf.groupsClaim)
            if (groups && _.isArray(groups)) {
              const currentGroups = (await user.$relatedQuery('groups').select('groups.id')).map(g => g.id)
              const expectedGroups = Object.values(WIKI.auth.groups).filter(g => groups.includes(g.name)).map(g => g.id)
              for (const groupId of _.difference(expectedGroups, currentGroups)) {
                await user.$relatedQuery('groups').relate(groupId)
              }
              for (const groupId of _.difference(currentGroups, expectedGroups)) {
                await user.$relatedQuery('groups').unrelate().where('groupId', groupId)
              }
            }
          }
          cb(null, user)
        } catch (err) {
          cb(err, null)
        }
      })
    )
  },
  logout (conf) {
    if (!conf.logoutURL) {
      return '/'
    } else {
      return conf.logoutURL
    }
  }
}
