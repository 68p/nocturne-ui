import { useRouter } from "next/router";
import { useEffect, useState, useRef, useCallback } from "react";
import LongPressLink from "../../components/common/navigation/LongPressLink";
import TrackListNavigation from "../../components/common/navigation/TrackListNavigation";
import Image from "next/image";
import SuccessAlert from "../../components/common/alerts/SuccessAlert";
import { getCurrentDevice } from "@/services/deviceService";
import { setPlaybackShuffleState } from "@/services/playerService";
export const runtime = "experimental-edge";

const PlaylistPage = ({
  initialPlaylist,
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
  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [tracks, setTracks] = useState(initialPlaylist.tracks.items);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(
    initialPlaylist.tracks.total > initialPlaylist.tracks.items.length
  );
  const observer = useRef();
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
        const currentImage = localStorage.getItem("playlistPageImage");

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
    const fetchPlaylist = async () => {
      try {
        const res = await fetch(
          `https://api.spotify.com/v1/playlists/${router.query.playlistId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Failed to fetch playlist");
        }

        const playlistData = await res.json();

        const tracksRes = await fetch(
          `https://api.spotify.com/v1/playlists/${router.query.playlistId}/tracks?limit=25`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const tracksData = await tracksRes.json();

        setPlaylist({
          ...playlistData,
          tracks: {
            ...playlistData.tracks,
            items: tracksData.items,
          },
        });
        setTracks(tracksData.items);
        setHasMore(playlistData.tracks.total > tracksData.items.length);
      } catch (error) {
        console.error("Error fetching playlist:", error.message);
      }
    };

    if (router.query.playlistId && accessToken) {
      fetchPlaylist();
    }
  }, [router.query.playlistId, accessToken]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === "Enter") {
        playPlaylist();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [tracks, isShuffleEnabled]);

  const lastTrackElementRef = useCallback(
    (node) => {
      if (isLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreTracks();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isLoading, hasMore]
  );

  useEffect(() => {
    if (playlist?.images && playlist.images.length > 0) {
      const playlistImage = playlist.images[0].url;
      localStorage.setItem("playlistPageImage", playlistImage);
      updateGradientColors(playlistImage);
    }

    return () => {
      updateGradientColors(null);
    };
  }, [playlist, updateGradientColors]);

  useEffect(() => {
    void setPlaybackShuffleState(accessToken, handleError, setIsShuffleEnabled);
  }, [accessToken]);

  const loadMoreTracks = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    const offset = tracks.length;
    const limit = 25;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlist.id}/tracks?offset=${offset}&limit=${limit}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch more tracks");
      }

      const data = await response.json();
      if (data.items.length === 0) {
        setHasMore(false);
      } else {
        setTracks((prevTracks) => [...prevTracks, ...data.items]);
        setHasMore(tracks.length + data.items.length < playlist.tracks.total);
      }
    } catch (error) {
      console.error("Error fetching more tracks:", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const playPlaylist = async () => {
    try {
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

      let offset;
      if (savedShuffleState) {
        const randomPosition = Math.floor(
          Math.random() * playlist.tracks.total
        );
        offset = { position: randomPosition };
      } else {
        offset = { position: 0 };
      }

      await fetch("https://api.spotify.com/v1/me/player/play", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          context_uri: `spotify:playlist:${playlist.id}`,
          offset: offset,
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

      router.push("/now-playing");
    } catch (error) {
      console.error("Error playing playlist:", error.message);
    }
  };

  const playTrack = async (trackUri, trackIndex) => {
    try {
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
          handleError("TRANSFER_PLAYBACK_ERROR", errorData.error.message);
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

      const playResponse = await fetch(
        "https://api.spotify.com/v1/me/player/play",
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            context_uri: `spotify:playlist:${playlist.id}`,
            offset: {
              position: trackIndex,
            },
            device_id: activeDeviceId,
          }),
        }
      );

      if (!playResponse.ok) {
        const errorData = await playResponse.json();
        console.error("Error playing track:", errorData.error.message);
      }

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
        <div className="min-w-[280px] mr-10">
          <LongPressLink
            spotifyUrl={playlist.external_urls.spotify}
            accessToken={accessToken}
          >
            <Image
              src={playlist?.images?.[0]?.url || "/images/not-playing.webp"}
              alt="Playlist Cover"
              data-main-image
              width={280}
              height={280}
              className="aspect-square rounded-[12px] drop-shadow-xl"
            />
          </LongPressLink>
          <LongPressLink
            spotifyUrl={playlist.external_urls.spotify}
            accessToken={accessToken}
          >
            <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
              {playlist.name}
            </h4>
          </LongPressLink>
          <h4 className="text-[28px] font-[560] text-white/60 truncate tracking-tight max-w-[280px]">
            {playlist.tracks.total.toLocaleString()} Songs
          </h4>
        </div>
      </div>

      <div
        className="md:w-2/3 pl-20 h-[calc(100vh-5rem)] overflow-y-auto scroll-container scroll-smooth pb-12"
        ref={tracksContainerRef}
      >
        <TrackListNavigation
          tracks={tracks}
          containerRef={tracksContainerRef}
          accessToken={accessToken}
          currentlyPlayingTrackUri={currentlyPlayingTrackUri}
          playTrack={playTrack}
        />
        {tracks.map((item, index) => (
          <div
            key={item.track.id}
            className="flex gap-12 items-start mb-4 transition-transform duration-200 ease-out"
            style={{ transition: "transform 0.2s ease-out" }}
            ref={index === tracks.length - 1 ? lastTrackElementRef : null}
          >
            <div className="text-[32px] font-[580] text-center text-white/60 w-6 mt-3">
              {item.track.uri === currentlyPlayingTrackUri ? (
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
                spotifyUrl={item.track.external_urls.spotify}
                accessToken={accessToken}
              >
                <div onClick={() => playTrack(item.track.uri, index)}>
                  <p className="text-[32px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                    {item.track.name}
                  </p>
                </div>
              </LongPressLink>
              <div className="flex flex-wrap">
                {item.track.artists.map((artist, artistIndex) => (
                  <LongPressLink
                    key={artist.id}
                    spotifyUrl={artist.external_urls.spotify}
                    accessToken={accessToken}
                  >
                    <p
                      className={`text-[28px] font-[560] text-white/60 truncate tracking-tight ${
                        artistIndex < item.track.artists.length - 1
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
        {isLoading && <div className="flex justify-center mt-4" />}
      </div>
      <SuccessAlert
        show={showSuccess}
        onClose={onCloseAlert}
        message={`Playlist mapped to Button ${pressedButton}`}
      />
    </div>
  );
};

export async function getServerSideProps(context) {
  const { playlistId } = context.params;
  const accessToken = context.query.accessToken;

  try {
    const res = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      return {
        props: {
          error: {
            type: "FETCH_PLAYLIST_ERROR",
            message: errorData.error.message,
          },
          initialPlaylist: null,
          accessToken,
        },
      };
    }

    const playlistData = await res.json();

    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=25`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const tracksData = await tracksRes.json();

    const initialPlaylist = {
      ...playlistData,
      tracks: {
        ...playlistData.tracks,
        items: tracksData.items,
      },
    };

    return {
      props: {
        initialPlaylist,
        accessToken,
        error: null,
      },
    };
  } catch (error) {
    return {
      props: {
        error: {
          type: "FETCH_PLAYLIST_ERROR",
          message: error.message,
        },
        initialPlaylist: null,
        accessToken,
      },
    };
  }
}

export default PlaylistPage;
