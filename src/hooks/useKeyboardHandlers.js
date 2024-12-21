import { useEffect } from "react";
import { getCurrentDevice } from "@/services/deviceService";

export function useKeyboardHandlers({
  drawerOpen,
  setDrawerOpen,
  showBrightnessOverlay,
  router,
  setActiveSection,
  handleError,
  accessToken,
  refreshToken,
  refreshAccessToken,
  isShuffleEnabled,
  currentRepeat,
  fetchCurrentPlayback,
  setPressedButton,
  setShowMappingOverlay,
}) {
  useEffect(() => {
    const validKeys = ["1", "2", "3", "4"];
    const pressStartTimes = {};
    const holdDuration = 2000;
    let hideTimerRef = null;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (drawerOpen) {
          setDrawerOpen(false);
        } else {
          router.push("/").then(() => {
            setActiveSection("recents");
          });
        }
        return;
      }

      if (!validKeys.includes(event.key)) return;
      pressStartTimes[event.key] = Date.now();
      pressStartTimes[`${event.key}_path`] = window.location.pathname;
    };

    const handlePlayRequest = async (mappedRoute, activeDeviceId) => {
      if (mappedRoute === "liked-songs") {
        const tracksResponse = await fetch(
          "https://api.spotify.com/v1/me/tracks?limit=50",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!tracksResponse.ok) {
          throw new Error("Failed to fetch liked songs");
        }

        const tracksData = await tracksResponse.json();
        const trackUris = tracksData.items.map((item) => item.track.uri);

        let startPosition = 0;
        if (isShuffleEnabled) {
          startPosition = Math.floor(Math.random() * trackUris.length);
        }

        await fetch(
          `https://api.spotify.com/v1/me/player/shuffle?state=${isShuffleEnabled}`,
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
              uris: trackUris,
              offset: { position: startPosition },
              device_id: activeDeviceId,
            }),
          }
        );

        if (!playResponse.ok) {
          throw new Error(`Play error! status: ${playResponse.status}`);
        }

        return;
      }

      const playlistId = mappedRoute.split("/").pop();
      let startPosition = 0;

      if (isShuffleEnabled) {
        const playlistResponse = await fetch(
          `https://api.spotify.com/v1/playlists/${playlistId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (playlistResponse.ok) {
          const playlistData = await playlistResponse.json();
          const totalTracks = playlistData.tracks.total;
          startPosition = Math.floor(Math.random() * totalTracks);
        }
      }

      await fetch(
        `https://api.spotify.com/v1/me/player/shuffle?state=${isShuffleEnabled}`,
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
          context_uri: `spotify:playlist:${playlistId}`,
          offset: { position: startPosition },
          device_id: activeDeviceId,
        }),
      });

      await fetch(
        `https://api.spotify.com/v1/me/player/repeat?state=${currentRepeat}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    };

    const handleKeyUp = async (event) => {
      if (!validKeys.includes(event.key)) return;

      const pressDuration = Date.now() - (pressStartTimes[event.key] || 0);
      const pressStartPath = pressStartTimes[`${event.key}_path`];
      delete pressStartTimes[event.key];
      delete pressStartTimes[`${event.key}_path`];

      if (
        pressDuration < holdDuration &&
        !pressStartPath?.includes("/playlist/") &&
        !pressStartPath?.includes("/collection/")
      ) {
        const hasAnyMappings = validKeys.some(
          (key) => localStorage.getItem(`button${key}Map`) !== null
        );

        if (!hasAnyMappings) {
          return;
        }

        const mappedRoute = localStorage.getItem(`button${event.key}Map`);

        if (hideTimerRef) {
          clearTimeout(hideTimerRef);
        }

        setPressedButton(event.key);
        setShowMappingOverlay(true);

        hideTimerRef = setTimeout(() => {
          setShowMappingOverlay(false);
          setPressedButton(null);
          hideTimerRef = null;
        }, 2000);

        if (mappedRoute) {
          try {
            if (!accessToken) {
              if (!refreshToken) {
                throw new Error("No refresh token available");
              }
              await refreshAccessToken();
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }

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

              await new Promise((resolve) => setTimeout(resolve, 500));
            }

            await handlePlayRequest(mappedRoute, activeDeviceId);
            await new Promise((resolve) => setTimeout(resolve, 500));
            await fetchCurrentPlayback();

            setShowMappingOverlay(false);
            setPressedButton(null);
            router.push("/now-playing");
          } catch (error) {
            console.error("Error in playRequest:", error);
            handleError("PLAY_REQUEST_ERROR", error.message);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      if (hideTimerRef) {
        clearTimeout(hideTimerRef);
      }
    };
  }, [
    accessToken,
    refreshToken,
    router,
    isShuffleEnabled,
    currentRepeat,
    drawerOpen,
    setDrawerOpen,
    setPressedButton,
    setShowMappingOverlay,
    fetchCurrentPlayback,
    refreshAccessToken,
    handleError,
    setActiveSection,
  ]);
}
