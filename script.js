// -------------------------------------
// EMMA'S NANO
// -------------------------------------


// -------------------------------------
// SPOTIFY APP SETTINGS
// -------------------------------------

const clientId =
  "42362d9d05074c589e4b3489b040e2ae";


const redirectUri =
  "https://emmanfarley-png.github.io/2008myspacenotiontheme/";

const appOrigin =
  new URL(redirectUri).origin;


const scopes = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state"
].join(" ");



// -------------------------------------
// PLAYLISTS
// -------------------------------------

const playlists = {

  teen:
    "spotify:playlist:0sQ9Tc3ckMW2SnHY9OpviQ",

  disney:
    "spotify:playlist:3iEuX7zIZir2G9KmPOegOr"

};



// -------------------------------------
// SPOTIFY PLAYER STATE
// -------------------------------------

let spotifyPlayer = null;

let spotifyDeviceId = null;


/*
These variables let the progress bar
keep moving between Spotify state updates.
*/

let playbackPosition = 0;

let playbackDuration = 0;

let playbackPaused = true;

let playbackUpdatedAt = Date.now();



// -------------------------------------
// PAGE ELEMENTS
// -------------------------------------

const connectButton =
  document.getElementById(
    "connect-spotify"
  );


const statusText =
  document.getElementById(
    "spotify-status"
  );


const loginPanel =
  document.getElementById(
    "spotify-login"
  );


const playerPanel =
  document.getElementById(
    "nano-player"
  );


const trackArt =
  document.getElementById(
    "track-art"
  );


const trackTitle =
  document.getElementById(
    "track-title"
  );


const trackArtist =
  document.getElementById(
    "track-artist"
  );


const currentTimeElement =
  document.getElementById(
    "current-time"
  );


const totalTimeElement =
  document.getElementById(
    "total-time"
  );


const progressFill =
  document.getElementById(
    "progress-fill"
  );


const teenButton =
  document.getElementById(
    "teen-playlist"
  );


const disneyButton =
  document.getElementById(
    "disney-playlist"
  );



// -------------------------------------
// PKCE HELPERS
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
      result +
      possible[
        value % possible.length
      ],

    ""

  );

}



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
// CONNECT TO SPOTIFY
// -------------------------------------

async function connectSpotify() {

  if (statusText) {

    statusText.textContent =
      "opening spotify...";

  }


  const codeVerifier =
    generateRandomString(64);


  const hashed =
    await sha256(
      codeVerifier
    );


  const codeChallenge =
    base64encode(
      hashed
    );


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

      client_id:
        clientId,

      response_type:
        "code",

      redirect_uri:
        redirectUri,

      scope:
        scopes,

      code_challenge_method:
        "S256",

      code_challenge:
        codeChallenge,

      state:
        state

    }).toString();


  window.open(
    authUrl.toString(),
    "_blank"
  );

}



// -------------------------------------
// EXCHANGE LOGIN CODE FOR TOKEN
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

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/x-www-form-urlencoded"

        },


        body:
          new URLSearchParams({

            client_id:
              clientId,

            grant_type:
              "authorization_code",

            code:
              code,

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

    console.error(
      "Spotify token error:",
      data
    );


    if (statusText) {

      statusText.textContent =
        "spotify connection failed :(";

    }


    return;

  }


  saveTokens(
    data
  );


  localStorage.removeItem(
    "spotify_code_verifier"
  );


  localStorage.removeItem(
    "spotify_auth_state"
  );


  /*
  Only clean the address bar when THIS page
  actually contains Spotify callback params.
  When auth finishes through a popup message,
  keep nano.html exactly where it is.
  */

  if (
    window.location.search.includes("code=") ||
    window.location.search.includes("error=")
  ) {

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

  }


  showConnected();

}



// -------------------------------------
// SAVE TOKENS
// -------------------------------------

function saveTokens(data) {

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

}



// -------------------------------------
// REFRESH ACCESS TOKEN
// -------------------------------------

async function refreshAccessToken() {

  const refreshToken =
    localStorage.getItem(
      "spotify_refresh_token"
    );


  if (!refreshToken) {

    return null;

  }


  const response =
    await fetch(

      "https://accounts.spotify.com/api/token",

      {

        method:
          "POST",

        headers: {

          "Content-Type":
            "application/x-www-form-urlencoded"

        },


        body:
          new URLSearchParams({

            grant_type:
              "refresh_token",

            refresh_token:
              refreshToken,

            client_id:
              clientId

          })

      }

    );


  const data =
    await response.json();


  if (!response.ok) {

    console.error(
      "Spotify refresh error:",
      data
    );


    return null;

  }


  saveTokens(
    data
  );


  return data.access_token;

}



async function getValidAccessToken() {

  const token =
    localStorage.getItem(
      "spotify_access_token"
    );


  const expiresAt =
    Number(

      localStorage.getItem(
        "spotify_expires_at"
      ) || 0

    );


  /*
  Refresh one minute early
  so it doesn't expire mid-song.
  */

  if (

    token &&

    Date.now() <
      expiresAt - 60000

  ) {

    return token;

  }


  return refreshAccessToken();

}



// -------------------------------------
// LOAD SPOTIFY SDK
// -------------------------------------

function loadSpotifySDK() {

  if (window.Spotify) {

    initializeSpotifyPlayer();

    return;

  }


  window.onSpotifyWebPlaybackSDKReady =
    initializeSpotifyPlayer;


  const existingScript =
    document.querySelector(
      'script[data-spotify-sdk]'
    );


  if (existingScript) {

    return;

  }


  const script =
    document.createElement(
      "script"
    );


  script.src =
    "https://sdk.scdn.co/spotify-player.js";


  script.async =
    true;


  script.dataset.spotifySdk =
    "true";


  document.body.appendChild(
    script
  );

}



// -------------------------------------
// CREATE EMMA'S NANO
// -------------------------------------

async function initializeSpotifyPlayer() {

  if (spotifyPlayer) {

    return;

  }


  const token =
    await getValidAccessToken();


  if (!token) {

    if (statusText) {

      statusText.textContent =
        "reconnect spotify";

    }


    if (connectButton) {

      connectButton.disabled =
        false;

    }


    return;

  }


  spotifyPlayer =
    new Spotify.Player({

      name:
        "Emma's Nano",


      getOAuthToken:
        callback => {

          getValidAccessToken()
            .then(

              freshToken => {

                callback(
                  freshToken || ""
                );

              }

            );

        },


      volume:
        0.5

    });



// -------------------------------------
// DEVICE READY
// -------------------------------------

  spotifyPlayer.addListener(

    "ready",

    ({ device_id }) => {

      spotifyDeviceId =
        device_id;


      if (loginPanel) {

        loginPanel.classList.add(
          "hidden"
        );

      }


      if (playerPanel) {

        playerPanel.classList.remove(
          "hidden"
        );

      }


      console.log(
        "Emma's Nano is ready:",
        device_id
      );

    }

  );



// -------------------------------------
// DEVICE OFFLINE
// -------------------------------------

  spotifyPlayer.addListener(

    "not_ready",

    ({ device_id }) => {

      console.log(
        "Emma's Nano went offline:",
        device_id
      );

    }

  );



// -------------------------------------
// PLAYER ERRORS
// -------------------------------------

  spotifyPlayer.addListener(

    "initialization_error",

    ({ message }) => {

      console.error(
        "Initialization error:",
        message
      );

    }

  );


  spotifyPlayer.addListener(

    "authentication_error",

    ({ message }) => {

      console.error(
        "Authentication error:",
        message
      );

    }

  );


  spotifyPlayer.addListener(

    "account_error",

    ({ message }) => {

      console.error(
        "Account error:",
        message
      );

    }

  );


  spotifyPlayer.addListener(

    "playback_error",

    ({ message }) => {

      console.error(
        "Playback error:",
        message
      );

    }

  );



// -------------------------------------
// SONG / PLAYBACK CHANGED
// -------------------------------------

  spotifyPlayer.addListener(

    "player_state_changed",

    state => {

      if (!state) {

        return;

      }


      updatePlayerUI(
        state
      );

    }

  );



// -------------------------------------
// CONNECT PLAYER
// -------------------------------------

  const success =
    await spotifyPlayer.connect();


  if (!success) {

    console.error(
      "Emma's Nano could not connect."
    );

  }

}



// -------------------------------------
// UPDATE NOW PLAYING SCREEN
// -------------------------------------

function updatePlayerUI(state) {

  if (

    !state ||

    !state.track_window ||

    !state.track_window.current_track

  ) {

    return;

  }


  const track =
    state.track_window
      .current_track;



  // TITLE

  if (trackTitle) {

    trackTitle.textContent =
      track.name ||
      "Unknown track";

  }



  // ARTIST

  if (trackArtist) {

    trackArtist.textContent =
      track.artists
        .map(
          artist =>
            artist.name
        )
        .join(", ");

  }



  // ALBUM ART

  const images =
    track.album &&
    track.album.images;


  if (

    trackArt &&

    images &&

    images.length > 0

  ) {

    trackArt.src =
      images[0].url;

  }



  // PLAYBACK POSITION

  playbackPosition =
    state.position || 0;


  playbackDuration =
    state.duration ||
    track.duration_ms ||
    0;


  playbackPaused =
    state.paused;


  playbackUpdatedAt =
    Date.now();


  updateProgressDisplay();

}



// -------------------------------------
// FORMAT TIME
// -------------------------------------

function formatTime(milliseconds) {

  const totalSeconds =
    Math.floor(
      milliseconds / 1000
    );


  const minutes =
    Math.floor(
      totalSeconds / 60
    );


  const seconds =
    totalSeconds % 60;


  return (
    minutes +
    ":" +
    seconds
      .toString()
      .padStart(
        2,
        "0"
      )
  );

}



// -------------------------------------
// PROGRESS BAR
// -------------------------------------

function updateProgressDisplay() {

  let currentPosition =
    playbackPosition;


  /*
  If music is playing,
  calculate how much time has
  passed since Spotify last
  sent us a state update.
  */

  if (!playbackPaused) {

    currentPosition +=
      Date.now() -
      playbackUpdatedAt;

  }


  if (

    playbackDuration > 0 &&

    currentPosition >
      playbackDuration

  ) {

    currentPosition =
      playbackDuration;

  }



  if (currentTimeElement) {

    currentTimeElement.textContent =
      formatTime(
        currentPosition
      );

  }


  if (totalTimeElement) {

    totalTimeElement.textContent =
      formatTime(
        playbackDuration
      );

  }



  if (progressFill) {

    const percent =

      playbackDuration > 0

        ? (
            currentPosition /
            playbackDuration
          ) * 100

        : 0;


    progressFill.style.width =
      percent + "%";

  }

}



// Keep progress bar moving smoothly.

setInterval(
  updateProgressDisplay,
  500
);



// -------------------------------------
// PLAY A PLAYLIST
// -------------------------------------

async function playPlaylist(
  playlistUri,
  activeButton
) {

  if (

    !spotifyPlayer ||

    !spotifyDeviceId

  ) {

    console.log(
      "Nano is still loading."
    );

    return;

  }


  /*
  Browser requires a user
  interaction before audio.
  */

  await spotifyPlayer
    .activateElement();


  const token =
    await getValidAccessToken();


  if (!token) {

    return;

  }


  const response =
    await fetch(

      "https://api.spotify.com/v1/me/player/play" +
      "?device_id=" +
      encodeURIComponent(
        spotifyDeviceId
      ),

      {

        method:
          "PUT",

        headers: {

          "Authorization":
            "Bearer " + token,

          "Content-Type":
            "application/json"

        },


        body:
          JSON.stringify({

            context_uri:
              playlistUri

          })

      }

    );


  if (!response.ok) {

    console.error(
      "Playlist error:",
      await response.text()
    );


    return;

  }



  if (teenButton) {

    teenButton.classList.remove(
      "active"
    );

  }


  if (disneyButton) {

    disneyButton.classList.remove(
      "active"
    );

  }


  if (activeButton) {

    activeButton.classList.add(
      "active"
    );

  }

}



// -------------------------------------
// PLAYLIST BUTTONS
// -------------------------------------

if (teenButton) {

  teenButton.addEventListener(

    "click",

    () => {

      playPlaylist(
        playlists.teen,
        teenButton
      );

    }

  );

}



if (disneyButton) {

  disneyButton.addEventListener(

    "click",

    () => {

      playPlaylist(
        playlists.disney,
        disneyButton
      );

    }

  );

}



// -------------------------------------
// THESE WILL POWER THE REAL CLICK WHEEL
// -------------------------------------

async function previousTrack() {

  if (!spotifyDeviceId) {
    return;
  }

  const token =
    await getValidAccessToken();

  if (!token) {
    return;
  }

  const response =
    await fetch(
      "https://api.spotify.com/v1/me/player/previous" +
      "?device_id=" +
      encodeURIComponent(
        spotifyDeviceId
      ),
      {
        method: "POST",
        headers: {
          "Authorization":
            "Bearer " + token
        }
      }
    );

  if (!response.ok) {
    console.error(
      "Previous track error:",
      await response.text()
    );
  }

}



async function togglePlayback() {

  if (!spotifyPlayer) {

    return;

  }


  await spotifyPlayer
    .activateElement();


  await spotifyPlayer
    .togglePlay();

}



async function nextTrack() {

  if (!spotifyDeviceId) {
    return;
  }

  const token =
    await getValidAccessToken();

  if (!token) {
    return;
  }

  const response =
    await fetch(
      "https://api.spotify.com/v1/me/player/next" +
      "?device_id=" +
      encodeURIComponent(
        spotifyDeviceId
      ),
      {
        method: "POST",
        headers: {
          "Authorization":
            "Bearer " + token
        }
      }
    );

  if (!response.ok) {
    console.error(
      "Next track error:",
      await response.text()
    );
  }

}



/*
Keep these accessible so we can
hook invisible click-wheel buttons
to them in the next step.
*/

window.previousTrack =
  previousTrack;


window.togglePlayback =
  togglePlayback;


window.nextTrack =
  nextTrack;

// -------------------------------------
// PHYSICAL CLICK WHEEL HOTSPOTS
// -------------------------------------

const wheelPrevious =
  document.getElementById(
    "wheel-prev"
  );


const wheelNext =
  document.getElementById(
    "wheel-next"
  );


const wheelPlay =
  document.getElementById(
    "wheel-play"
  );


const wheelCenter =
  document.getElementById(
    "wheel-center"
  );



if (wheelPrevious) {

  wheelPrevious.addEventListener(

    "click",

    previousTrack

  );

}



if (wheelNext) {

  wheelNext.addEventListener(

    "click",

    nextTrack

  );

}



if (wheelPlay) {

  wheelPlay.addEventListener(

    "click",

    togglePlayback

  );

}



/* Center button is intentionally inactive for now.
   The actual bottom play/pause marking controls playback. */

// -------------------------------------
// CONNECT BUTTON
// -------------------------------------

if (connectButton) {

  connectButton.addEventListener(

    "click",

    connectSpotify

  );

}



// -------------------------------------
// CONNECTED UI
// -------------------------------------

function showConnected() {

  if (connectButton) {

    connectButton.textContent =
      "♥ SPOTIFY CONNECTED";


    connectButton.disabled =
      true;

  }


  if (statusText) {

    statusText.textContent =
      "loading emma's nano...";

  }


  loadSpotifySDK();

}



// -------------------------------------
// RECEIVE SPOTIFY AUTH FROM POPUP
// -------------------------------------

window.addEventListener(

  "message",

  async event => {

    if (event.origin !== appOrigin) {
      return;
    }


    if (
      !event.data ||
      event.data.type !==
        "spotify-auth-callback"
    ) {
      return;
    }


    const code =
      event.data.code;


    const returnedState =
      event.data.state;


    const popupError =
      event.data.error;


    if (popupError) {

      if (statusText) {
        statusText.textContent =
          "spotify access denied";
      }

      return;

    }


    const savedState =
      localStorage.getItem(
        "spotify_auth_state"
      );


    if (
      !code ||
      !savedState ||
      returnedState !== savedState
    ) {

      if (statusText) {
        statusText.textContent =
          "spotify login state mismatch";
      }

      return;

    }


    if (statusText) {
      statusText.textContent =
        "connecting...";
    }


    await exchangeCodeForToken(
      code
    );

  }

);



// -------------------------------------
// CHECK SPOTIFY CALLBACK
// -------------------------------------

async function checkSpotifyCallback() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const code =
    params.get(
      "code"
    );


  const returnedState =
    params.get(
      "state"
    );


  const error =
    params.get(
      "error"
    );


  /*
  Spotify redirects the auth popup to the main
  GitHub Pages URL. If this page was opened by
  the Nano, send the result back to that Nano
  instead of leaving the full site open.
  */

  if (
    window.opener &&
    (code || error)
  ) {

    window.opener.postMessage(
      {
        type:
          "spotify-auth-callback",

        code:
          code,

        state:
          returnedState,

        error:
          error
      },
      appOrigin
    );


    document.body.innerHTML =
      '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#171717;color:#ff72b7;font-family:Arial,sans-serif;text-align:center;padding:30px;"><strong>spotify connected ♡<br><br>you can close this tab</strong></div>';


    setTimeout(
      () => window.close(),
      900
    );


    return;

  }


  if (error) {

    if (statusText) {

      statusText.textContent =
        "spotify access denied";

    }


    return;

  }


  if (code) {

    const savedState =
      localStorage.getItem(
        "spotify_auth_state"
      );


    if (

      !savedState ||

      returnedState !==
        savedState

    ) {

      if (statusText) {

        statusText.textContent =
          "spotify login state mismatch";

      }


      return;

    }


    if (statusText) {

      statusText.textContent =
        "connecting...";

    }


    await exchangeCodeForToken(
      code
    );


    return;

  }


  const token =
    await getValidAccessToken();


  if (token) {

    showConnected();

  }

}



// -------------------------------------
// START
// -------------------------------------

checkSpotifyCallback();
