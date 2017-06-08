'use strict'

const pop_location = window.location
const qs = pop_location.search || pop_location.hash
const parent = window.opener || window.parent
const messenger = document.querySelector('#msg')
const oauthRedirIdx = qs.indexOf('#oauth_redirect=')

if (oauthRedirIdx !== -1) {
  // OAuth redirect, fixes URI fragments from being lost in Safari
  // (URI Fragments within 302 Location URI are lost over HTTPS)
  // Loading the redirect.html before triggering the OAuth Flow seems to fix it.
  // 16 is the length of '#oauth_redirect='
  pop_location.assign(decodeURIComponent(decodeURIComponent(qs.substr(oauthRedirIdx+16))))
} else if (parent) {
  parent.dispatchEvent(new CustomEvent('auth.reponse', {'detail': qs}))
  // parent.console.log('fired auth.reponse from popup', qs)
  window.close()
} else {
  // may be somebody opened the redirect page directly?
   messenger.innerHTML = 'Are you trying to login? Please try here: <a href="/">https://runmycode.online</a>. You can close this window.'
}
