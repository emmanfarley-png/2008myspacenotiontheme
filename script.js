let spotifyController;


/*
These are Emma's two playlists.
*/

const playlists = {

  teen:
    "spotify:playlist:0sQ9Tc3ckMW2SnHY9OpviQ",

  disney:
    "spotify:playlist:3iEuX7zIZir2G9KmPOegOr"

};



/*
Spotify calls this function once
its iframe player API is ready.
*/

window.onSpotifyIframeApiReady = function(IFrameAPI) {

  const element =
    document.getElementById("embed-iframe");


  const options = {

    width: "100%",

    height: 152,

    uri: playlists.teen

  };


  IFrameAPI.createController(

    element,

    options,

    function(controller) {

      spotifyController = controller;

    }

  );

};



/*
Find our two playlist buttons.
*/

const teenButton =
  document.getElementById("teen-playlist");


const disneyButton =
  document.getElementById("disney-playlist");



/*
When teen chick flick is clicked...
*/

teenButton.addEventListener(
  "click",

  function() {

    if (!spotifyController) {
      return;
    }


    spotifyController.loadEntity(
      playlists.teen
    );


    teenButton.classList.add("active");

    disneyButton.classList.remove("active");

  }
);



/*
When radio disney is clicked...
*/

disneyButton.addEventListener(
  "click",

  function() {

    if (!spotifyController) {
      return;
    }


    spotifyController.loadEntity(
      playlists.disney
    );


    disneyButton.classList.add("active");

    teenButton.classList.remove("active");

  }
);
