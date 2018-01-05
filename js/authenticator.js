'use strict'
// Oauth2 Authorization Grant - modified hello.js (https://github.com/MrSwitch/hello.js)

const keygenApi = 'https://api.runmycode.online/keygen'
const providerConfig = {
  google: {
    client_id: '1055084210294-amb5mf7tto1r05a1h5pchcfurjtrq4at.apps.googleusercontent.com',
    auth_url: 'https://accounts.google.com/o/oauth2/auth',
    scope: 'email'
  },
  github: {
    client_id: 'fb6da02c4a11e23609b6',
    auth_url: 'https://github.com/login/oauth/authorize',
    scope: 'user:email'
  },
  gitlab: {
    client_id: 'bd7da90faca60e23b9ac938ed7909a85ecf2f479baa3907ccb054dcd47efab96',
    auth_url: 'https://gitlab.com/oauth/authorize',
    scope: 'read_user api'
  }
}

// UUID v4 https://gist.github.com/jed/982883#gistcomment-1615714
const uuid = (a) => {
  return a ? (a ^ crypto.getRandomValues(new Uint8Array(1))[0] % 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, uuid)
}

// Serialize an object to querystring https://stackoverflow.com/a/35416293
const getQueryString = (obj) => {
  return Object.keys(obj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`).join('&')
}

// Create an object from querystring
const getQueryParams = (qs) => {
  if (!qs.trim()) return {}

  return qs.replace(/^[?#]/, '')
    .split('&')
    .reduce((params, param) => {
      let [key, value] = param.split('=')
      params[decodeURIComponent(key)] = decodeURIComponent((value || '').replace(/\+/g, ' '))
      return params
    }, {})
}

// handle auth response custom event from redirect page and generate key if everything fine
const actions = $('#action-msg')
const generateKey = (res) => {
  popUpResponded = true
  // console.log('got auth.response event:', res)
  res = getQueryParams(res.detail)

  actions.classList.add('error')
  if (!res.error) {
    if (!res.state || !res.code) {
      console.error(`state or code missing in response from ${authConfig.auth_url}:`, res)
      actions.textContent = `${authConfig.provider} did not respond properly. Please try again later.`
    } else if (res.state !== authConfig.state) {
      console.error(`Response state ${res.state} != stored state ${authConfig.state}. Something fishy might be happening at ${authConfig.auth_url}`)
      actions.textContent = `Something is not correct at ${authConfig.provider} (${authConfig.auth_url}). Please check your account/provider.`
    } else {
      actions.classList.remove('error')
      actions.textContent = 'Generating API key...'
      // $('#auth-buttons').classList.add('hide')
      // Everything seems ok, make request to generate key
      res.provider = authConfig.provider
      res.scope = authConfig.scope
      // Google needs redirect_uri to be set
      res.redirect_uri = authConfig.redirect_uri
      // set redirect to 0 to indicate that we actually don't want a 302 redirect
      res.redirect = 0
      const keygenUrl = keygenApi + '?' + getQueryString(res)

      fetch(keygenUrl)
      .then((r) => {
        if (!r.ok) throw Error(r.statusText)
        return r.json()
      })
      .then((r) => {
        if (r.key) {
          localStorage.setItem('runmycode', JSON.stringify(r))
          location.assign('dashboard.html' + (location.search || '?key-gen=1'))
        } else {
          throw Error(`Key not present in keygen response. Error: ${JSON.stringify(r)}`)
        }
      })
      .catch((error) => {
        console.error('Keygen error:', error)
        actions.classList.add('error')
        actions.textContent = JSON.stringify(error)
      })
    }
  } else {
    console.error('Authentication failed:', res)
    actions.textContent = `Error from ${authConfig.provider}: ${res.error_message || res.error_description}`
  }
}

const openAuthPopUp = (url) => {
  const popup = window.open(url, '_blank', 'resizable=1,scrollbars=1,width=500,height=550')
  if (popup && popup.focus) popup.focus()
  return popup
}

let popUpResponded = false
const redirectUri = location.origin + '/redirect.html'
const authConfig = {
  response_type: 'code',
  redirect_uri: redirectUri
}
// Authorization Code Grant
const getOAuthCode = (provider) => {
  const pConfig = providerConfig[provider]
  authConfig.client_id = pConfig.client_id
  authConfig.scope = pConfig.scope
  authConfig.state = uuid()

  let authUrl = pConfig.auth_url + '?' + getQueryString(authConfig)
  // OAuth redirect, fixes URI fragments from being lost in Safari
  // (URI Fragments within 302 Location URI are lost over HTTPS)
  // Loading the redirect.html before triggering the OAuth Flow seems to fix it.
  // Firefox  decodes URL fragments when calling location.hash.
  //  - This is bad if the value contains break points which are escaped
  //  - Hence the url must be encoded twice as it contains breakpoints.
  // if (navigator.userAgent.indexOf('Safari') !== -1 && navigator.userAgent.indexOf('Chrome') === -1) {
  //   url = authConfig.redirect_uri + '#oauth_redirect=' + encodeURIComponent(encodeURIComponent(url))
  // }

  // for later use
  authConfig.provider = provider
  authConfig.auth_url = pConfig.auth_url

  // register a global event handler to handle event dispatched from popup window
  window.addEventListener('auth.reponse', generateKey, true)
  // open popup and poll its status
  const popup = openAuthPopUp(authUrl)
  const timer = setInterval(() => {
    if (!popup || popup.closed) {
      clearInterval(timer)
      if (!popUpResponded) {
        let response = 'Authentication has been cancelled'
        if (!popup) response = 'Authentication popup was blocked'
        actions.classList.add('error')
        actions.textContent = response
      }
    }
  }, 500)
}

// Add handlers to auth buttons
Array.from($$('.auth')).forEach((btn) => {
  btn.addEventListener('click', (e) => {
    // console.log('Auth using', e.target.value)
    getOAuthCode(e.target.value.toLowerCase())
  })
})
