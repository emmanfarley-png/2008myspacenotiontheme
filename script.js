// -------------------------------------
// EMMA'S NANO — SPOTIFY AUTH
// -------------------------------------


// This is safe to be visible.
// Never put your Client Secret here.

const clientId = "42362d9d05074c589e4b3489b040e2ae";


// This MUST exactly match Spotify Dashboard.

const redirectUri =
  "https://emmanfarley-png.github.io/2008myspacenotiontheme/";


// Permissions we want from Spotify.

const scopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state"
].join(" ");



// -------------------------------------
// PAGE ELEMENTS
// -------------------------------------

const connectButton =
  document.getElementById("connect-spotify");

const statusText =
  document.getElementById("spotify-status");



// -------------------------------------
// RANDOM STRING
// -------------------------------------

function generateRandomString(length) {

  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  const values =
    crypto.getRandomValues(
      new Uint8Array(length)
    );

  return values.reduce(
    (result, value) =>
      result + possible[value % possible.length],
    ""
  );
}



// -------------------------------------
// PKCE HELPERS
// -------------------------------------

async function sha256(text) {

  const encoder =
    new TextEncoder();

  const data =
    encoder.encode(text);

  return window.crypto.subtle.digest(
    "SHA-256",
    data
  );
}


function base64encode(input) {

  return btoa(
    String.fromCharCode(
      ...new Uint8Array(input)
    )
  )
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}



// -------------------------------------
// START SPOTIFY LOGIN
// -------------------------------------

async function connectSpotify() {

  statusText.textContent =
    "opening spotify...";


  const codeVerifier =
    generateRandomString(64);

  const hashed =
    await sha256(codeVerifier);

  const codeChallenge =
    base64encode(hashed);


  const state =
    generateRandomString(16);


  localStorage.setItem(
    "spotify_code_verifier",
    codeVerifier
  );

  localStorage.setItem(
    "spotify_auth_state",
    state
  );


  const authUrl =
    new URL(
      "https://accounts.spotify.com/authorize"
    );


  authUrl.search =
    new URLSearchParams({

      client_id: clientId,

      response_type: "code",

      redirect_uri: redirectUri,

      scope: scopes,

      code_challenge_method: "S256",

      code_challenge: codeChallenge,

      state: state

    }).toString();


  window.location.href =
    authUrl.toString();
}



// -------------------------------------
// EXCHANGE CODE FOR TOKEN
// -------------------------------------

async function exchangeCodeForToken(code) {

  const codeVerifier =
    localStorage.getItem(
      "spotify_code_verifier"
    );


  const response =
    await fetch(
      "https://accounts.spotify.com/api/token",
      {

        method: "POST",

        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },

        body: new URLSearchParams({

          client_id: clientId,

          grant_type:
            "authorization_code",

          code: code,

          redirect_uri:
            redirectUri,

          code_verifier:
            codeVerifier

        })

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    console.error(data);

    statusText.textContent =
      "spotify connection failed :(";

    return;
  }


  localStorage.setItem(
    "spotify_access_token",
    data.access_token
  );


  if (data.refresh_token) {

    localStorage.setItem(
      "spotify_refresh_token",
      data.refresh_token
    );

  }


  const expiresAt =
    Date.now() +
    data.expires_in * 1000;


  localStorage.setItem(
    "spotify_expires_at",
    expiresAt
  );


  localStorage.removeItem(
    "spotify_code_verifier"
  );

  localStorage.removeItem(
    "spotify_auth_state"
  );


  // Remove ?code=blahblah from the URL.

  window.history.replaceState(
    {},
    document.title,
    redirectUri
  );


  showConnected();
}



// -------------------------------------
// DISPLAY CONNECTED STATE
// -------------------------------------

function showConnected() {

  connectButton.textContent =
    "♥ SPOTIFY CONNECTED";

  connectButton.disabled = true;

  statusText.textContent =
    "emma's nano is online ♫";

}



// -------------------------------------
// CHECK CALLBACK
// -------------------------------------

async function checkSpotifyCallback() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const code =
    params.get("code");

  const returnedState =
    params.get("state");

  const error =
    params.get("error");


  if (error) {

    statusText.textContent =
      "spotify access denied";

    return;
  }


  if (code) {

    const savedState =
      localStorage.getItem(
        "spotify_auth_state"
      );


    if (
      !savedState ||
      returnedState !== savedState
    ) {

      statusText.textContent =
        "spotify login state mismatch";

      return;
    }


    statusText.textContent =
      "connecting...";


    await exchangeCodeForToken(code);

    return;
  }


  const existingToken =
    localStorage.getItem(
      "spotify_access_token"
    );


  if (existingToken) {

    showConnected();

  }

}



// -------------------------------------
// BUTTON
// -------------------------------------

connectButton.addEventListener(
  "click",
  connectSpotify
);



// -------------------------------------
// START
// -------------------------------------

checkSpotifyCallback();
