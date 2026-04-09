import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { apiRequest, normalizeApiError } from "../../lib/api";
import { PageScreen } from "../../components/ui/PageScreen";

type MeetingRow = {
  _id: string;
  roomId?: string;
  meetingMode: string;
  title: string;
  agenda: string;
  meetingDate: string;
  venue: string;
  status: string;
};

type ZegoUIKitBridge = {
  joinRoom: (config: { container: HTMLElement | null; sharedLinks?: Array<{ name: string; url: string }> }) => void;
};

declare global {
  interface Window {
    ZegoPrebuiltUIKit?: {
      create: (appToken: string) => ZegoUIKitBridge;
    };
  }
}

const UIKIT_SCRIPT_SRC = "https://unpkg.com/@zegocloud/zego-uikit-prebuilt/zego-uikit-prebuilt.js";

function codeBlock(text: string) {
  return text.trim();
}

async function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src=\"${src}\"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load ZegoUIKitPrebuilt script"));
    document.body.appendChild(script);
  });
}

export function MeetingLivePage() {
  const { id } = useParams();
  const { user, token } = useAuth();
  const [mode, setMode] = useState<"uikit" | "sdk">("uikit");
  const [appToken, setAppToken] = useState("");
  const [userID, setUserID] = useState("");
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const roomContainerRef = useRef<HTMLDivElement | null>(null);

  const { data: meetings = [] } = useQuery({
    queryKey: ["meetings-live", token],
    queryFn: () => apiRequest<MeetingRow[]>("/meetings", { token }),
    enabled: Boolean(token),
    retry: false,
  });

  const meeting = useMemo(() => meetings.find((item) => item._id === id), [meetings, id]);
  const isOnlineMeeting = (meeting?.meetingMode || (meeting?.roomId ? "Online" : "Offline")) === "Online";
  const roomID = isOnlineMeeting ? meeting?.roomId || (id ? `csedu-meeting-${id}` : "") : "";

  useEffect(() => {
    if (user) {
      setUserID(user.id);
      setUserName(`${user.firstName} ${user.lastName}`.trim() || user.email);
    }
  }, [user]);

  const uiKitCode = codeBlock(`
const yourAppToken = '';
const zp = ZegoPrebuiltUIKit.create(yourAppToken);
zp.joinRoom({
  container: document.querySelector("#root"),
});
`);

  const sdkCode = codeBlock(`
const result = await zg.loginRoom(roomID, token, { userID, userName });
const stream = await zg.createStream(source);
zg.startPublishingStream(streamID, localStream);
const remoteStream = await zg.startPlayingStream(streamID);
zg.logoutRoom(roomID);
`);

  async function startUIKitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOnlineMeeting) {
      setError("This meeting is offline. Change it to Online to create and open a room.");
      return;
    }

    if (!appToken.trim()) {
      setError("Provide a Zego app token to start the UIKit room.");
      return;
    }

    try {
      setIsJoining(true);
      setError(null);
      await loadScript(UIKIT_SCRIPT_SRC);

      if (!window.ZegoPrebuiltUIKit) {
        throw new Error("ZegoPrebuiltUIKit is not available after script load");
      }

      const zego = window.ZegoPrebuiltUIKit.create(appToken.trim());
      zego.joinRoom({
        container: roomContainerRef.current,
        sharedLinks: [
          { name: "Meeting room", url: window.location.href },
        ],
      });
    } catch (joinError) {
      setError(normalizeApiError(joinError));
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <PageScreen title="Meeting Live Room" subtitle="Two ways to get started with ZegoCloud: UIKits and SDKs.">
      <section className="page-section">
        <div className="meeting-live-hero">
          <div>
            <p className="eyebrow">ZegoCloud Meeting Integration</p>
            <h2 className="page-section__title">{meeting?.title || "Live meeting"}</h2>
            <p>{meeting?.agenda || "Launch your voice and video room from here."}</p>
            {meeting && !isOnlineMeeting ? <div className="notice">This meeting is offline, so no Zego room was created.</div> : null}
            <div className="button-row">
              <Link className="secondary-button" to={`/dashboard/meetings/${id}`}>Back to details</Link>
              <button className={mode === "uikit" ? "primary-button" : "secondary-button"} type="button" onClick={() => setMode("uikit")}>UIKits</button>
              <button className={mode === "sdk" ? "primary-button" : "secondary-button"} type="button" onClick={() => setMode("sdk")}>SDKs</button>
            </div>
          </div>
          <div className="meeting-live-meta">
            <span className="chip">Room: {roomID || "-"}</span>
            <span className="chip">Mode: {mode === "uikit" ? "UIKits" : "SDKs"}</span>
            <span className="chip">User: {userName || "-"}</span>
          </div>
        </div>
      </section>

      {mode === "uikit" ? (
        <section className="meeting-integration-grid">
          <article className="page-section meeting-card">
            <h3 className="page-section__title">UIKits</h3>
            <p>Embed interactive scenarios with less than 10 lines of code. Best for MVPs, quick testing, and fast launch.</p>
            <pre className="code-block">{uiKitCode}</pre>
            <form className="form-grid" onSubmit={startUIKitRoom}>
              <label className="field">
                <span>App Token</span>
                <input value={appToken} onChange={(e) => setAppToken(e.target.value)} placeholder="Paste your Zego app token" />
              </label>
              <label className="field">
                <span>Room ID</span>
                <input value={roomID} readOnly />
              </label>
              <label className="field">
                <span>User ID</span>
                <input value={userID} onChange={(e) => setUserID(e.target.value)} />
              </label>
              <label className="field">
                <span>User Name</span>
                <input value={userName} onChange={(e) => setUserName(e.target.value)} />
              </label>
              <div className="form-actions">
                <button className="primary-button" type="submit" disabled={isJoining || !isOnlineMeeting}>{isJoining ? "Joining..." : "Start with UIKits"}</button>
              </div>
            </form>
            {error ? <div className="alert">{error}</div> : null}
          </article>

          <article className="page-section meeting-stage">
            <h3 className="page-section__title">Room Preview</h3>
            <div ref={roomContainerRef} className="zego-room-container">
              <div className="empty-state">Your Zego room will render here after you join.</div>
            </div>
          </article>
        </section>
      ) : (
        <section className="meeting-integration-grid">
          <article className="page-section meeting-card">
            <h3 className="page-section__title">SDKs</h3>
            <p>Use lower-level core APIs for a fully customized UI and advanced workflows.</p>
            <pre className="code-block">{sdkCode}</pre>
            <div className="empty-state">
              SDK mode is prepared for your custom voice/video implementation. Use your Zego SDK setup and room token flow here.
            </div>
          </article>

          <article className="page-section meeting-card">
            <h3 className="page-section__title">Get Started Choices</h3>
            <div className="meeting-choice-grid">
              <div className="card">
                <p className="eyebrow">UIKits</p>
                <strong>Start fast</strong>
                <p>Embed a ready-made live room and go live in minutes.</p>
              </div>
              <div className="card">
                <p className="eyebrow">SDKs</p>
                <strong>Full control</strong>
                <p>Build a fully custom meeting UI and voice/video workflow.</p>
              </div>
            </div>
          </article>
        </section>
      )}
    </PageScreen>
  );
}
