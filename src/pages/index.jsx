import Sidebar from "../components/Sidebar";
import Settings from "../components/Settings";
import LongPressLink from "../components/LongPressLink";
import { useEffect } from "react";
import Image from "next/image";

export default function Home({
  accessToken,
  playlists,
  artists,
  radio,
  activeSection,
  setActiveSection,
  loading,
  albumsQueue,
  updateGradientColors,
}) {
  useEffect(() => {
    if (activeSection === "radio") {
      updateGradientColors(null, "radio");
    } else if (activeSection === "library" && playlists.length > 0) {
      updateGradientColors(playlists[0].images[0]?.url, "library");
    } else if (activeSection === "artists" && artists.length > 0) {
      updateGradientColors(artists[0].images[0]?.url, "artists");
    } else if (activeSection === "recents" && albumsQueue.length > 0) {
      updateGradientColors(albumsQueue[0].images[0]?.url, "recents");
    } else if (activeSection === "settings") {
      updateGradientColors(null, "settings");
    }
  }, [activeSection, updateGradientColors, playlists, artists, albumsQueue]);

  return (
    <div className="relative min-h-screen">
      {!loading && (
        <div className="relative z-10 grid grid-cols-[2.21fr_3fr] fadeIn-animation">
          <div className="h-screen overflow-y-auto pb-12 pl-8 relative scroll-container">
            <Sidebar
              activeSection={activeSection}
              setActiveSection={setActiveSection}
            />
          </div>

          <div className="h-screen overflow-y-auto">
            <div className="flex overflow-x-auto scroll-container p-2">
              {activeSection === "recents" && (
                <>
                  {albumsQueue.map((album) => (
                    <div key={album.id} className="min-w-[280px] mr-10">
                      <LongPressLink
                        href={`/album/${album.id}`}
                        spotifyUrl={album.external_urls.spotify}
                        accessToken={accessToken}
                      >
                        <Image
                          src={
                            album.images[0]?.url || "/images/not-playing.webp"
                          }
                          alt="Album Cover"
                          width={280}
                          height={280}
                          className="mt-10 aspect-square rounded-[12px] drop-shadow-xl"
                        />
                      </LongPressLink>
                      <LongPressLink
                        href={`/album/${album.id}`}
                        spotifyUrl={album.external_urls.spotify}
                        accessToken={accessToken}
                      >
                        <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                          {album.name}
                        </h4>
                      </LongPressLink>
                      <LongPressLink
                        href={`/artist/${album.artists[0].id}`}
                        spotifyUrl={album.artists[0].external_urls.spotify}
                        accessToken={accessToken}
                      >
                        <h4 className="text-[32px] font-[560] text-white truncate tracking-tight max-w-[280px]">
                          {album.artists
                            .map((artist) => artist.name)
                            .join(", ")}
                        </h4>
                      </LongPressLink>
                    </div>
                  ))}
                </>
              )}
              {activeSection === "library" &&
                playlists.map((item) => (
                  <div key={item.id} className="min-w-[280px] mr-10">
                    <LongPressLink
                      href={`/playlist/${item.id}`}
                      spotifyUrl={item.external_urls.spotify}
                      accessToken={accessToken}
                    >
                      <Image
                        src={item.images[0]?.url || "/images/not-playing.webp"}
                        alt="Playlist Cover"
                        width={280}
                        height={280}
                        className="mt-10 aspect-square rounded-[12px] drop-shadow-xl"
                      />
                    </LongPressLink>
                    <LongPressLink
                      href={`/playlist/${item.id}`}
                      spotifyUrl={item.external_urls.spotify}
                      accessToken={accessToken}
                    >
                      <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                        {item.name}
                      </h4>
                    </LongPressLink>
                    <h4 className="text-[28px] font-[560] text-white truncate tracking-tight max-w-[280px]">
                      {item.tracks.total.toLocaleString()} Songs
                    </h4>
                  </div>
                ))}
              {activeSection === "artists" &&
                artists.map((artist) => (
                  <div key={artist.id} className="min-w-[280px] mr-10">
                    <LongPressLink
                      href={`/artist/${artist.id}`}
                      spotifyUrl={artist.external_urls.spotify}
                      accessToken={accessToken}
                    >
                      <Image
                        src={
                          artist.images[0]?.url || "/images/not-playing.webp"
                        }
                        alt="Artist Cover"
                        width={280}
                        height={280}
                        className="mt-10 aspect-square rounded-full drop-shadow-xl"
                      />
                    </LongPressLink>
                    <LongPressLink
                      href={`/artist/${artist.id}`}
                      spotifyUrl={artist.external_urls.spotify}
                      accessToken={accessToken}
                    >
                      <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                        {artist.name}
                      </h4>
                    </LongPressLink>
                    <h4 className="text-[28px] font-[560] text-white truncate tracking-tight max-w-[280px]">
                      {artist.followers.total.toLocaleString()} Followers
                    </h4>
                  </div>
                ))}
              {activeSection === "radio" &&
                radio.map((playlist) => (
                  <div key={playlist.id} className="min-w-[280px] mr-10">
                    <LongPressLink
                      href={`/playlist/${playlist.id}`}
                      spotifyUrl={playlist.external_urls.spotify}
                      accessToken={accessToken}
                    >
                      <Image
                        src={
                          playlist.images[0]?.url || "/images/not-playing.webp"
                        }
                        alt="Radio Cover"
                        width={280}
                        height={280}
                        className="mt-10 aspect-square rounded-[12px] drop-shadow-xl"
                      />
                    </LongPressLink>
                    <LongPressLink
                      href={`/playlist/${playlist.id}`}
                      spotifyUrl={playlist.external_urls.spotify}
                      accessToken={accessToken}
                    >
                      <h4 className="mt-2 text-[36px] font-[580] text-white truncate tracking-tight max-w-[280px]">
                        {playlist.name}
                      </h4>
                    </LongPressLink>
                    <h4 className="text-[28px] font-[560] text-white truncate tracking-tight max-w-[280px]">
                      {playlist.owner.display_name}
                    </h4>
                  </div>
                ))}
              {activeSection === "settings" && (
                <div className="w-full h-full overflow-y-auto">
                  <Settings accessToken={accessToken} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
