import React, { useEffect, useContext, useState } from "react";
import { fromEvent, interval, animationFrame } from "rxjs";
import { withLatestFrom, map, merge } from "rxjs/operators";
import { Card, Col, Row } from "antd";
import { store } from "./store";
import { useParams } from "react-router-dom";
import {
  QuestionCircleOutlined,
  ShareAltOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import Keyboard from "./components/keyboard";

import "./App.css";
const { Meta } = Card;

const joypad = {
  JOYPAD_A: 0,
  JOYPAD_B: 1,
  JOYPAD_X: 2,
  JOYPAD_Y: 3,
  JOYPAD_L: 4,
  JOYPAD_R: 5,
  JOYPAD_SELECT: 6,
  JOYPAD_START: 7,
  JOYPAD_UP: 8,
  JOYPAD_DOWN: 9,
  JOYPAD_LEFT: 10,
  JOYPAD_RIGHT: 11,
  JOYPAD_R2: 12,
  JOYPAD_L2: 13,
  JOYPAD_R3: 14,
  JOYPAD_L3: 15,
};

const keyMap = {
  [joypad.JOYPAD_LEFT]: "KeyA",
  [joypad.JOYPAD_UP]: "KeyW",
  [joypad.JOYPAD_RIGHT]: "KeyD",
  [joypad.JOYPAD_DOWN]: "KeyS",
  [joypad.JOYPAD_A]: "KeyJ",
  [joypad.JOYPAD_B]: "KeyK",
  [joypad.JOYPAD_X]: "KeyU",
  [joypad.JOYPAD_Y]: "KeyI",
  [joypad.JOYPAD_SELECT]: "Digit3",
  [joypad.JOYPAD_START]: "Digit1",
};

function App() {
  const [showKeyboard, setShowKeyboard] = useState(true);

  const { state } = useContext(store);
  const { id: workerID } = useParams();
  const { conn, pc, games, currentPlayersInRomm } = state;
  useEffect(() => {
    let inputChannel;
    const mediaStream = new MediaStream();
    pc.oniceconnectionstatechange = (e) => console.log(pc.iceConnectionState);

    pc.ontrack = function (event) {
      mediaStream.addTrack(event.track);
    };

    pc.ondatachannel = (e) => {
      inputChannel = e.channel;
      inputChannel.onopen = () => {
        const j = {
          ID: "joinRoom",
          SessionID: workerID,
        };
        conn.send(JSON.stringify(j));
        const el = document.getElementById("remoteVideos");
        el.srcObject = mediaStream;
        el.autoplay = true;
      };
      inputChannel.onclose = () =>
        console.log("[rtcp] the input channel has closed");
    };

    if (conn.readyState === WebSocket.OPEN) {
      const init = {
        ID: "initwebrtc",
        SessionID: workerID,
      };
      conn.send(JSON.stringify(init));
    } else {
      conn.addEventListener("open", function (evt) {
        const init = {
          ID: "initwebrtc",
          SessionID: workerID,
        };
        conn.send(JSON.stringify(init));
      });
    }
    conn.onmessage = async (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === "offer") {
        await pc.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(atob(msg.data)))
        );
        const answer = await pc.createAnswer();
        answer.sdp = answer.sdp.replace(
          /(a=fmtp:111 .*)/g,
          "$1;stereo=1;sprop-stereo=1"
        );
        await pc.setLocalDescription(answer);
        const resp = {
          ID: "answer",
          Data: btoa(JSON.stringify(answer)),
          SessionID: workerID,
        };
        conn.send(JSON.stringify(resp));
      }

      if (msg.id === "candidate") {
        const d = atob(msg.data);
        const candidate = new RTCIceCandidate(JSON.parse(d));
        pc.addIceCandidate(candidate);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate != null) {
        const candidate = JSON.stringify(event.candidate);
        console.info(`[rtcp] got ice candidate: ${candidate}`);
        console.log(btoa(candidate));
        const c = {
          ID: "candidate",
          Data: btoa(candidate),
          SessionID: workerID,
        };

        conn.send(JSON.stringify(c));
      }
    };
    const keyState = {};
    let keydown$ = fromEvent(document, "keydown").pipe(
      map((x) => (keyState[x.code] = true))
    );

    let keyup$ = fromEvent(document, "keyup").pipe(
      map((x) => (keyState[x.code] = false))
    );
    const keyPress = keydown$.pipe(merge(keyup$));

    const game$ = interval(1000 / 60, animationFrame).pipe(
      withLatestFrom(keyPress)
    );
    const handler = game$.subscribe(() => {
      let inputBitmap = new Uint16Array(1);

      for (let i = 0; i < Object.keys(joypad).length; i++) {
        inputBitmap[0] += keyState[keyMap[i]] ? 1 << i : 0;
      }

      if (inputChannel) inputChannel.send(inputBitmap);
    });
    return () => {
      handler.unsubscribe();
      conn.close();
    };
  }, [conn, pc, workerID]);
  return (
    <div className="App">
      <Row>
        <Col className="cardContainer">
          <Card
            className="playerContainer"
            title={games ? games[workerID] : ""}
            actions={[
              <SettingOutlined key="setting" />,
              <QuestionCircleOutlined
                key="question"
                onClick={() => setShowKeyboard(!showKeyboard)}
              />,
              <ShareAltOutlined key="share" />,
            ]}
          >
            <video autoPlay id="remoteVideos" className="player"></video>
            <Meta title={`Current players ${currentPlayersInRomm}`} />
          </Card>
          {showKeyboard ? <Keyboard /> : null}
        </Col>
      </Row>
    </div>
  );
}

export default App;
