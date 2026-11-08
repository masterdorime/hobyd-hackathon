"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Room, RoomEvent, Track, type LocalTrack, type RemoteTrack } from "livekit-client";

import { getLiveKitToken } from "@/lib/client/livekit-api";

type VideoStatus = "connecting" | "ready" | "unavailable";

export function LiveVideo({
  roomId,
  sellerName,
  itemTitle,
  canSell,
  authenticated,
  loginHref,
}: {
  roomId: string;
  sellerName: string;
  itemTitle: string;
  canSell: boolean;
  authenticated: boolean;
  loginHref: string;
}) {
  const t = useTranslations("room");
  const mediaRef = useRef<HTMLDivElement>(null);
  const tracksRef = useRef(new Set<RemoteTrack | LocalTrack>());
  const [status, setStatus] = useState<VideoStatus>(authenticated ? "connecting" : "unavailable");
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (!authenticated) {
      return;
    }
    let cancelled = false;
    const room = new Room();
    const tracks = tracksRef.current;
    const container = mediaRef.current;

    const attach = (track: RemoteTrack | LocalTrack) => {
      if (cancelled || !container || track.kind !== Track.Kind.Video && track.kind !== Track.Kind.Audio) {
        return;
      }
      tracks.add(track);
      const element = track.attach();
      if (element instanceof HTMLVideoElement) {
        element.muted = true;
        element.playsInline = true;
      }
      container.appendChild(element);
      if (track.kind === Track.Kind.Video) {
        setHasVideo(true);
      }
    };
    const detach = (track: RemoteTrack | LocalTrack) => {
      tracks.delete(track);
      track.detach();
      if (track.kind === Track.Kind.Video) {
        setHasVideo(false);
      }
    };

    room
      .on(RoomEvent.TrackSubscribed, attach)
      .on(RoomEvent.TrackUnsubscribed, detach)
      .on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.track) {
          attach(publication.track);
        }
      })
      .on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.track) {
          detach(publication.track);
        }
      })
      .on(RoomEvent.Disconnected, () => {
        if (!cancelled) {
          setStatus("unavailable");
          setHasVideo(false);
        }
      });

    async function connect() {
      try {
        const { token, serverUrl } = await getLiveKitToken(roomId);
        if (cancelled) {
          return;
        }
        await room.connect(serverUrl, token);
        if (cancelled) {
          await room.disconnect(true);
          return;
        }
        setStatus("ready");
        if (canSell) {
          try {
            await room.localParticipant.enableCameraAndMicrophone();
          } catch {
            if (!cancelled) {
              setStatus("unavailable");
              setHasVideo(false);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          setHasVideo(false);
        }
      }
    }

    void connect();
    return () => {
      cancelled = true;
      room.removeAllListeners();
      for (const track of tracks) {
        track.detach();
      }
      tracks.clear();
      container?.replaceChildren();
      void room.disconnect(true).catch(() => undefined);
    };
  }, [roomId, canSell, authenticated]);

  return (
    <section aria-labelledby="live-video-heading">
      <div className="section-line">
        <h2 className="section-label" id="live-video-heading">{t("sellerCamera")}</h2>
        <span className={status === "ready" ? "status-live" : "connection-disconnected"} aria-live="polite">
          {status === "ready" ? <><span className="status-dot" />{t("cameraOn")}</> : t(!authenticated ? "videoLoginRequired" : status === "connecting" ? "videoConnecting" : "cameraOff")}
        </span>
      </div>
      <div className="video-housing raised">
        <div className="live-video" aria-busy={status === "connecting"}>
          <div className={`livekit-media${hasVideo ? "" : " livekit-media-empty"}`} ref={mediaRef} aria-hidden={!hasVideo} />
          {!hasVideo ? (
            <>
              <div className="video-status">{status === "connecting" ? "●" : "×"} {t(!authenticated ? "videoLoginRequired" : status === "connecting" ? "videoConnecting" : "cameraOff")}</div>
              {!authenticated ? (
                <NextLink className="btn btn-primary btn-small video-login" href={loginHref}>{t("loginToWatch")}</NextLink>
              ) : (
                <div className="slab-object" aria-hidden="true">
                  <div className="slab-label"><strong>HOBYD</strong><span>LIVE LOT</span></div>
                  <div className="card-art">CHARIZARD<small>BASE SET</small></div>
                </div>
              )}
            </>
          ) : null}
          <div className="video-foot">
            <strong>{sellerName} — Seller</strong>
            <span>{t("videoIsolated")}</span>
          </div>
          <span className="sr-only">{itemTitle}</span>
        </div>
      </div>
    </section>
  );
}
