// -------------------------------------
// EMMA'S NANO
// -------------------------------------


const clientId =
  "42362d9d05074c589e4b3489b040e2ae";


const redirectUri =
  "https://emmanfarley-png.github.io/2008myspacenotiontheme/";


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


const playerStatus =
  document.getElementById(
    "player-status"
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


const previousButton =
  document.getElementById(
    "prev-track"
  );


const playButton =
  document.getElementById(
    "toggle-play"
  );


const nextButton =
  document.getElementById(
    "next-track"
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
// START LOGIN
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

      code_challenge_method:
        "S256",

      code_challenge:
        codeChallenge,

      state: state

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

        method: "POST",

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


  saveTokens(data);


  localStorage.removeItem(
    "spotify_code_verifier"
  );


  localStorage.removeItem(
    "spotify_auth_state"
  );


  window.history.replaceState(

    {},

    document.title,

    redirectUri

  );


  showConnected();

}



// -------------------------------------
// TOKEN STORAGE
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
// REFRESH EXPIRED TOKEN
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

        method: "POST",

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

    console.error(data);

    return null;

  }


  saveTokens(data);


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
  Refresh a little early so the
  token doesn't expire mid-song.
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
// LOAD SPOTIFY WEB PLAYBACK SDK
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
// CREATE EMMA'S NANO DEVICE
// -------------------------------------


async function initializeSpotifyPlayer() {

  if (spotifyPlayer) {

    return;

  }


  const token =
    await getValidAccessToken();


  if (!token) {

    statusText.textContent =
      "reconnect spotify";

    connectButton.disabled =
      false;

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

      volume: 0.5

    });



// -------------------------------------
// SDK READY
// -------------------------------------


  spotifyPlayer.addListener(

    "ready",

    ({ device_id }) => {

      spotifyDeviceId =
        device_id;


      loginPanel.classList.add(
        "hidden"
      );


      playerPanel.classList.remove(
        "hidden"
      );


      playerStatus.textContent =
        "emma's nano is ready ♫";


      console.log(
        "Emma's Nano device:",
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

      playerStatus.textContent =
        "nano went offline :(";


      console.log(
        "Offline device:",
        device_id
      );

    }

  );



// -------------------------------------
// ERRORS
// -------------------------------------


  spotifyPlayer.addListener(

    "initialization_error",

    ({ message }) => {

      console.error(message);

      playerStatus.textContent =
        "player setup error";

    }

  );


  spotifyPlayer.addListener(

    "authentication_error",

    ({ message }) => {

      console.error(message);

      playerStatus.textContent =
        "spotify login expired";

    }

  );


  spotifyPlayer.addListener(

    "account_error",

    ({ message }) => {

      console.error(message);

      playerStatus.textContent =
        "spotify account error";

    }

  );



// -------------------------------------
// SONG CHANGED
// -------------------------------------


  spotifyPlayer.addListener(

    "player_state_changed",

    state => {

      if (!state) {

        return;

      }


      const track =
        state.track_window
          .current_track;


      trackTitle.textContent =
        track.name;


      trackArtist.textContent =
        track.artists
          .map(
            artist =>
              artist.name
          )
          .join(", ");


      const image =
        track.album &&
        track.album.images &&
        track.album.images[0];


      if (image) {

        trackArt.src =
          image.url;

      }


      playButton.textContent =
        state.paused
          ? "▶"
          : "❚❚";

    }

  );



// -------------------------------------
// CONNECT DEVICE
// -------------------------------------


  const success =
    await spotifyPlayer.connect();


  if (!success) {

    statusText.textContent =
      "nano couldn't connect :(";

  }

}



// -------------------------------------
// START A PLAYLIST
// -------------------------------------


async function playPlaylist(
  playlistUri,
  activeButton
) {

  if (
    !spotifyPlayer ||
    !spotifyDeviceId
  ) {

    playerStatus.textContent =
      "nano is still loading...";

    return;

  }


  /*
  User interaction activates audio
  in browsers with autoplay rules.
  */

  spotifyPlayer.activateElement();


  const token =
    await getValidAccessToken();


  const response =
    await fetch(

      "https://api.spotify.com/v1/me/player/play" +
      "?device_id=" +
      encodeURIComponent(
        spotifyDeviceId
      ),

      {

        method: "PUT",

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
      await response.text()
    );


    playerStatus.textContent =
      "couldn't start playlist :(";

    return;

  }


  teenButton.classList.remove(
    "active"
  );


  disneyButton.classList.remove(
    "active"
  );


  activeButton.classList.add(
    "active"
  );


  playerStatus.textContent =
    "playing ♫";

}



// -------------------------------------
// PLAYLIST BUTTONS
// -------------------------------------


teenButton.addEventListener(

  "click",

  () => {

    playPlaylist(
      playlists.teen,
      teenButton
    );

  }

);


disneyButton.addEventListener(

  "click",

  () => {

    playPlaylist(
      playlists.disney,
      disneyButton
    );

  }

);



// -------------------------------------
// PLAYER CONTROLS
// -------------------------------------


previousButton.addEventListener(

  "click",

  () => {

    if (spotifyPlayer) {

      spotifyPlayer.previousTrack();

    }

  }

);


playButton.addEventListener(

  "click",

  () => {

    if (spotifyPlayer) {

      spotifyPlayer.activateElement();

      spotifyPlayer.togglePlay();

    }

  }

);


nextButton.addEventListener(

  "click",

  () => {

    if (spotifyPlayer) {

      spotifyPlayer.nextTrack();

    }

  }

);



// -------------------------------------
// CONNECT BUTTON
// -------------------------------------


connectButton.addEventListener(

  "click",

  connectSpotify

);



// -------------------------------------
// CONNECTED UI
// -------------------------------------


function showConnected() {

  connectButton.textContent =
    "♥ SPOTIFY CONNECTED";


  connectButton.disabled =
    true;


  statusText.textContent =
    "loading emma's nano...";


  loadSpotifySDK();

}



// -------------------------------------
// CHECK SPOTIFY CALLBACK
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
      returnedState !==
        savedState
    ) {

      statusText.textContent =
        "spotify login state mismatch";

      return;

    }


    statusText.textContent =
      "connecting...";


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
