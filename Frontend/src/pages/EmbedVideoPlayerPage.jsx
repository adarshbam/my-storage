import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { SERVER_URL } from "../lib/api";
import VideoPlayer from "../components/drive/VideoPlayer";
import { ShieldAlert, Loader2, VideoOff, ListVideo, X, Play } from "lucide-react";

export default function EmbedVideoPlayerPage() {
  const { token } = useParams();
  const [searchParams] = useSearchParams();

  const fileIdParam = searchParams.get("fileId");
  const queryAccent = searchParams.get("accent");
  const queryLoop = searchParams.get("loop");
  const queryAutoPlay = searchParams.get("autoplay");
  const queryMuted = searchParams.get("muted");
  const queryBranding = searchParams.get("branding");
  const queryControls = searchParams.get("controls");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorCode, setErrorCode] = useState(null);
  const [mediaData, setMediaData] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [showPlaylistMenu, setShowPlaylistMenu] = useState(false);

  useEffect(() => {
    async function fetchMedia() {
      if (!token) {
        setError("Invalid embed token");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setErrorCode(null);

      try {
        let endpoint = `${SERVER_URL}/share/public-media/${token}`;
        if (fileIdParam) {
          endpoint = `${SERVER_URL}/share/public-folder/${token}/manifest?fileId=${encodeURIComponent(fileIdParam)}`;
        }

        const res = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setErrorCode(data.code || (res.status === 403 ? "DOMAIN_RESTRICTED" : "ERROR"));
          setError(data.error || "Media stream unavailable");
          setLoading(false);
          return;
        }

        // Folder Playlist Response
        if (data.items && Array.isArray(data.items)) {
          if (data.items.length === 0) {
            setError("This published folder contains no media clips yet.");
            setLoading(false);
            return;
          }

          setPlaylist(data.items);
          let initialIndex = 0;
          if (fileIdParam) {
            const foundIdx = data.items.findIndex(
              (i) => i.id === fileIdParam || String(i.id) === String(fileIdParam)
            );
            if (foundIdx !== -1) initialIndex = foundIdx;
          }
          setCurrentClipIndex(initialIndex);

          setMediaData({
            name: data.items[initialIndex]?.name || data.folderName || "Media Clip",
            streamUrl: data.items[initialIndex]?.streamUrl,
            folderName: data.folderName,
            playerSettings: data.playerSettings || {},
          });
        } else {
          // Single Media File Response
          setMediaData(data);
          setPlaylist([]);
        }
      } catch (err) {
        console.error("Embed video fetch error:", err);
        setError("Failed to connect to media streaming gateway");
      } finally {
        setLoading(false);
      }
    }

    fetchMedia();
  }, [token, fileIdParam]);

  // When current clip index changes in playlist mode
  const activeClip = playlist.length > 0 ? playlist[currentClipIndex] : mediaData;
  const activeStreamUrl = activeClip?.streamUrl || mediaData?.streamUrl;
  const activeTitle = activeClip?.name || mediaData?.name || "Media Asset";

  if (loading) {
    const fallbackColor = queryAccent
      ? queryAccent.startsWith("#")
        ? queryAccent
        : `#${queryAccent}`
      : "#00f0ff";

    return (
      <div className="fixed inset-0 w-full h-full bg-black flex flex-col items-center justify-center select-none">
        <Loader2 className="w-10 h-10 animate-spin" style={{ color: fallbackColor }} />
        <span className="text-white/40 text-xs font-mono tracking-widest uppercase mt-4">
          Connecting Edge Gateway...
        </span>
      </div>
    );
  }

  if (error) {
    const isDomainRestricted = errorCode === "DOMAIN_RESTRICTED";

    return (
      <div className="fixed inset-0 w-full h-full bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white/[0.04] border border-white/10 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-md flex flex-col items-center">
          <div
            className={`p-3.5 rounded-2xl mb-4 border ${
              isDomainRestricted
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-red-500/10 border-red-500/20 text-red-400"
            }`}
          >
            {isDomainRestricted ? <ShieldAlert size={32} /> : <VideoOff size={32} />}
          </div>

          <h2 className="text-base sm:text-lg font-bold mb-1.5 text-white tracking-tight">
            {isDomainRestricted ? "Embedding Restricted" : "Media Stream Unavailable"}
          </h2>

          <p className="text-xs sm:text-sm text-white/50 leading-relaxed mb-4">
            {isDomainRestricted
              ? "This media asset is configured with domain-level security and cannot be embedded from this origin."
              : error}
          </p>

          <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest pt-2 border-t border-white/5 w-full flex items-center justify-center gap-1.5">
            <span>Vault Security Engine</span>
            <span>•</span>
            <span>Edge Gate</span>
          </div>
        </div>
      </div>
    );
  }

  if (!activeStreamUrl) {
    return (
      <div className="fixed inset-0 w-full h-full bg-black flex items-center justify-center text-white/50 text-xs font-mono">
        Stream endpoint missing.
      </div>
    );
  }

  const s = mediaData?.playerSettings || {};

  // Resolve query param overrides
  const effectiveAccent = queryAccent
    ? queryAccent.startsWith("#")
      ? queryAccent
      : `#${queryAccent}`
    : s.accentColor || "#00f0ff";

  const effectiveLoop =
    queryLoop !== null ? queryLoop === "1" || queryLoop === "true" : Boolean(s.loop);

  const effectiveAutoPlay =
    queryAutoPlay !== null
      ? queryAutoPlay === "1" || queryAutoPlay === "true"
      : Boolean(s.autoPlay);

  const effectiveMuted =
    queryMuted !== null
      ? queryMuted === "1" || queryMuted === "true"
      : effectiveAutoPlay
      ? true
      : Boolean(s.muted);

  const effectiveHideBranding =
    queryBranding !== null
      ? queryBranding === "0" || queryBranding === "false" || queryBranding === "off"
      : Boolean(s.hideBranding);

  const effectiveControls =
    queryControls !== null
      ? queryControls !== "0" && queryControls !== "false" && queryControls !== "off"
      : s.controls !== false;

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden relative group">
      <VideoPlayer
        key={activeStreamUrl}
        src={activeStreamUrl}
        title={activeTitle}
        accentColor={effectiveAccent}
        hideBranding={effectiveHideBranding}
        customWatermark={s.customWatermark}
        autoPlay={effectiveAutoPlay}
        loop={playlist.length > 1 ? false : effectiveLoop}
        muted={effectiveMuted}
        controls={effectiveControls}
        borderRadius="0px"
        isEmbed={true}
        onEnded={() => {
          if (playlist.length > 1 && currentClipIndex < playlist.length - 1) {
            setCurrentClipIndex((prev) => prev + 1);
          } else if (playlist.length > 1 && effectiveLoop) {
            setCurrentClipIndex(0);
          }
        }}
      />

      {/* Playlist Selector Overlay for Folders */}
      {playlist.length > 1 && (
        <div className="absolute top-3 right-3 z-30 pointer-events-auto">
          <button
            onClick={() => setShowPlaylistMenu(!showPlaylistMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black backdrop-blur-md border text-white text-xs font-semibold shadow-2xl transition-all cursor-pointer"
            style={{
              borderColor: showPlaylistMenu ? effectiveAccent : "rgba(255,255,255,0.2)",
            }}
          >
            <ListVideo size={14} style={{ color: effectiveAccent }} />
            <span>
              Playlist ({currentClipIndex + 1}/{playlist.length})
            </span>
          </button>

          {/* Playlist Dropdown */}
          {showPlaylistMenu && (
            <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 max-h-80 overflow-y-auto custom-scrollbar bg-black/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-2 shadow-2xl space-y-1 animate-in fade-in zoom-in-95">
              <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between text-[11px] text-white/50 font-mono uppercase">
                <span className="truncate pr-2">{mediaData?.folderName || "Playlist Tracks"}</span>
                <span className="shrink-0">{playlist.length} clips</span>
              </div>
              <div className="space-y-1 pt-1">
                {playlist.map((item, idx) => {
                  const isSelected = idx === currentClipIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentClipIndex(idx);
                        setShowPlaylistMenu(false);
                      }}
                      className={`w-full text-left p-2 rounded-xl flex items-center gap-2.5 text-xs transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white/15 text-white font-bold"
                          : "text-white/70 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 font-bold"
                        style={{
                          backgroundColor: isSelected ? effectiveAccent : "rgba(255,255,255,0.1)",
                          color: isSelected ? "#000" : "#fff",
                        }}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate flex-1">{item.name}</span>
                      {isSelected && (
                        <Play
                          size={12}
                          className="shrink-0 fill-current"
                          style={{ color: effectiveAccent }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
