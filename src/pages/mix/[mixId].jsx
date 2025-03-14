import { useRouter } from "next/router";
import { useEffect, useState, useRef, useCallback } from "react";
import LongPressLink from "../../components/common/navigation/LongPressLink";
import TrackListNavigation from "../../components/common/navigation/TrackListNavigation";
import Image from "next/image";
import SuccessAlert from "../../components/common/alerts/SuccessAlert";
import { fetchUserRadio } from "../../services";
import { getCurrentDevice } from "@/services/deviceService";
import { setPlaybackShuffleState } from "@/services/playerService";
export const runtime = "experimental-edge";

const MixPage = ({
  initialMix,
  updateGradientColors,
  currentlyPlayingTrackUri,
  handleError,
  error,
}) => {
  const router = useRouter();
  const accessToken = router.query.accessToken;
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("shuffleEnabled") === "true";
    }
    return false;
  });
  const [mix, setMix] = useState(initialMix);
  const [tracks, setTracks] = useState(initialMix?.tracks || []);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pressedButton, setPressedButton] = useState(null);
  const tracksContainerRef = useRef(null);

  useEffect(() => {
    const validKeys = ["1", "2", "3", "4"];
    const holdDuration = 2000;
    const holdTimeouts = {};
    const pressStartTimes = {};

    const handleKeyDown = (event) => {
      if (!validKeys.includes(event.key) || event.repeat) return;

      pressStartTimes[event.key] = Date.now();

      holdTimeouts[event.key] = setTimeout(() => {
        const currentUrl = window.location.pathname;
        const currentImage = localStorage.getItem("mixPageImage");

        localStorage.setItem(`button${event.key}Map`, currentUrl);
        if (currentImage) {
          localStorage.setItem(`button${event.key}Image`, currentImage);
        }

        setPressedButton(event.key);
        setShowSuccess(true);
      }, holdDuration);
    };

    const handleKeyUp = (event) => {
      if (!validKeys.includes(event.key)) return;

      if (holdTimeouts[event.key]) {
        clearTimeout(holdTimeouts[event.key]);
        delete holdTimeouts[event.key];
      }

      delete pressStartTimes[event.key];
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      Object.values(holdTimeouts).forEach(
        (timeout) => timeout && clearTimeout(timeout)
      );
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleSuccessClose = useCallback(() => {
    setShowSuccess(false);
    setPressedButton(null);
  }, []);

  useEffect(() => {
    if (error) {
      handleError(error.type, error.message);
    }
  }, [error, handleError]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Enter") {
        playMix();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [tracks, isShuffleEnabled]);

  useEffect(() => {
    if (mix?.images && mix.images.length > 0) {
      const mixImage = mix.images[0].url;
      localStorage.setItem("mixPageImage", mixImage);
      updateGradientColors(mixImage);
    }

    return () => {
      updateGradientColors(null);
    };
  }, [mix, updateGradientColors]);

  useEffect(() => {
    void setPlaybackShuffleState(accessToken, handleError, setIsShuffleEnabled);
  }, [accessToken]);

  const playMix = async () => {
    try {
      const mixId = router.query.mixId;
      const userResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const userData = await userResponse.json();

      const createPlaylistResponse = await fetch(
        `https://api.spotify.com/v1/users/${userData.id}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `Temp Mix Playlist ${Date.now()}`,
            description: "Temporary playlist for mix playback",
            public: false,
          }),
        }
      );
      const playlistData = await createPlaylistResponse.json();
      localStorage.setItem(
        `playingMix-${mixId}`,
        `spotify:playlist:${playlistData.id}`
      );

      const tracksToAdd = tracks.map((track) => track.uri);
      await fetch(
        `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: tracksToAdd,
          }),
        }
      );

      const device = await getCurrentDevice(accessToken, handleError);
      const activeDeviceId = device == null ? null : device.id;

      if (device && !device.is_active) {
        await fetch("https://api.spotify.com/v1/me/player", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_ids: [activeDeviceId],
            play: false,
          }),
        });
      }

      const savedShuffleState =
        localStorage.getItem("shuffleEnabled") === "true";
      await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${savedShuffleState}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistData.id}`,
          device_id: activeDeviceId,
        }),
      });

      const savedRepeatState = localStorage.getItem("repeatMode") || "off";
      await fetch(
        `https://api.spotify.com/v1/me/player/repeat?state=${savedRepeatState}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setTimeout(async () => {
        try {
          await fetch(
            `https://api.spotify.com/v1/playlists/${playlistData.id}/followers`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
        } catch (error) {
          console.error("Failed to delete temporary playlist:", error);
        }
      }, 200);

      router.push("/now-playing");
    } catch (error) {
      handleError("PLAY_MIX_ERROR", error.message);
    }
  };

  const playTrack = async (trackUri, trackIndex) => {
    try {
      const mixId = router.query.mixId;
      const userResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const userData = await userResponse.json();

      const createPlaylistResponse = await fetch(
        `https://api.spotify.com/v1/users/${userData.id}/playlists`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: `Temp Mix Playlist ${Date.now()}`,
            description: "Temporary playlist for mix playback",
            public: false,
          }),
        }
      );
      const playlistData = await createPlaylistResponse.json();
      localStorage.setItem(
        `playingMix-${mixId}`,
        `spotify:playlist:${playlistData.id}`
      );

      const tracksToAdd = tracks.map((track) => track.uri);
      await fetch(
        `https://api.spotify.com/v1/playlists/${playlistData.id}/tracks`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: tracksToAdd,
          }),
        }
      );

      const device = await getCurrentDevice(accessToken, handleError);
      const activeDeviceId = device == null ? null : device.id;

      if (device && !device.is_active) {
        const transferResponse = await fetch(
          "https://api.spotify.com/v1/me/player",
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              device_ids: [activeDeviceId],
              play: false,
            }),
          }
        );

        if (!transferResponse.ok) {
          const errorData = await transferResponse.json();
          console.error("Error transferring playback:", errorData);
          return;
        }
      }

      const savedShuffleState =
        localStorage.getItem("shuffleEnabled") === "true";
      await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${savedShuffleState}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlistData.id}`,
          offset: { position: trackIndex },
          device_id: activeDeviceId,
        }),
      });

      const savedRepeatState = localStorage.getItem("repeatMode") || "off";
      await fetch(
        `https://api.spotify.com/v1/me/player/repeat?state=${savedRepeatState}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      setTimeout(async () => {
        try {
          await fetch(
            `https://api.spotify.com/v1/playlists/${playlistData.id}/followers`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );
        } catch (error) {
          console.error("Failed to delete temporary playlist:", error);
        }
      }, 200);

      router.push("/now-playing");
    } catch (error) {
      console.error("Error playing track:", error.message);
    }
  };

  const onCloseAlert = useCallback(() => {
    setShowSuccess(false);
    setPressedButton(null);
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-8 pt-10 px-12 fadeIn-animation">
      <div className="md:w-1/3 sticky top-10">
        {mix?.images && mix.images.length > 0 ? (
          <div className="min-w-[280px] mr-10">
            <Image
              src={mix.images[0].url || "/images/not-playing.webp"}
              alt="Mix Cover"
              data-main-image
              width={280}
              height={280}
              className="aspect-square rounded-[12px] drop-shadow-xl"
            />
            <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
              {mix.name}
            </h4>
            <h4 className="text-[28px] font-[560] text-white/60 truncate tracking-tight max-w-[280px]">
              {mix.tracks.length} Songs
            </h4>
          </div>
        ) : (
          <p>No image available</p>
        )}
      </div>

      <div
        className="md:w-2/3 pl-20 h-[calc(100vh-5rem)] overflow-y-auto scroll-container scroll-smooth pb-12"
        ref={tracksContainerRef}
      >
        <TrackListNavigation
          tracks={mix.tracks}
          containerRef={tracksContainerRef}
          accessToken={accessToken}
          currentlyPlayingTrackUri={currentlyPlayingTrackUri}
          playTrack={playTrack}
        />
        {tracks.map((track, index) => (
          <div
            key={track.id}
            className="flex gap-12 items-start mb-4 transition-transform duration-200 ease-out"
            style={{ transition: "transform 0.2s ease-out" }}
          >
            <div className="text-[32px] font-[580] text-center text-white/60 w-6 mt-3">
              {track.uri === currentlyPlayingTrackUri ? (
                <div className="w-5">
                  <section>
                    <div className="wave0"></div>
                    <div className="wave1"></div>
                    <div className="wave2"></div>
                    <div className="wave3"></div>
                  </section>
                </div>
              ) : (
                <p>{index + 1}</p>
              )}
            </div>

            <div className="flex-grow">
              <LongPressLink
                href="/now-playing"
                spotifyUrl={track.external_urls.spotify}
                accessToken={accessToken}
              >
                <div onClick={() => playTrack(track.uri, index)}>
                  <p className="text-[32px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                    {track.name}
                  </p>
                </div>
              </LongPressLink>
              <div className="flex flex-wrap">
                {track.artists.map((artist, artistIndex) => (
                  <LongPressLink
                    key={artist.id}
                    spotifyUrl={artist.external_urls.spotify}
                    accessToken={accessToken}
                  >
                    <p
                      className={`text-[28px] font-[560] text-white/60 truncate tracking-tight ${
                        artistIndex < track.artists.length - 1
                          ? 'mr-2 after:content-[","]'
                          : ""
                      }`}
                    >
                      {artist.name}
                    </p>
                  </LongPressLink>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <SuccessAlert
        show={showSuccess}
        onClose={onCloseAlert}
        message={`Mix mapped to Button ${pressedButton}`}
      />
    </div>
  );
};

export async function getServerSideProps(context) {
  const { mixId } = context.params;
  const { accessToken } = context.query;

  try {
    let storedMixes = [];
    const setRadio = (mixes) => {
      storedMixes = mixes;
    };

    const handleError = (type, message) => {
      throw new Error(message);
    };

    await fetchUserRadio(accessToken, setRadio, handleError);
    const initialMix = storedMixes.find((mix) => mix.id === mixId);

    if (!initialMix) {
      throw new Error("Mix not found");
    }

    return {
      props: {
        initialMix,
        accessToken,
        error: null,
      },
    };
  } catch (error) {
    return {
      props: {
        error: {
          type: "FETCH_MIX_ERROR",
          message: error.message,
        },
        initialMix: null,
        accessToken,
      },
    };
  }
}

export default MixPage;
