import React, { useEffect } from "react";
import { fromEvent, interval, animationFrame } from "rxjs";
import { withLatestFrom, map, merge } from "rxjs/operators";
import { Card, Col, Row } from "antd";

import {
  QuestionCircleOutlined,
  ShareAltOutlined,
  SettingOutlined,
} from "@ant-design/icons";

import "./App.css";

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
  useEffect(() => {
    const workerID = "5909342a-8d8e-4b93-adf8-82ed0905d706";
    let inputChannel;
    let mediaStream = new MediaStream();

    let pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    pc.oniceconnectionstatechange = (e) => console.log(pc.iceConnectionState);

    pc.ontrack = function (event) {
      console.log("on track ready");
      mediaStream.addTrack(event.track);
    };

    const conn = new WebSocket("ws://localhost:3000/ws");
    pc.ondatachannel = (e) => {
      inputChannel = e.channel;
      inputChannel.onopen = () => {
        // inputReady = true;
        const j = {
          ID: "joinRoom",
          SessionID: workerID,
        };

        console.log("input ready");

        conn.send(JSON.stringify(j));
        const el = document.getElementById("remoteVideos");
        el.srcObject = mediaStream;
        el.autoplay = true;
      };
      inputChannel.onclose = () =>
        console.log("[rtcp] the input channel has closed");
    };

    conn.onclose = function (evt) {
      console.log(evt);
    };
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

    conn.onopen = () => {
      const init = {
        ID: "initwebrtc",
        SessionID: workerID,
      };
      conn.send(JSON.stringify(init));
    };
    pc.onicecandidate = (event) => {
      if (event.candidate != null) {
        const candidate = JSON.stringify(event.candidate);
        console.info(`[rtcp] got ice candidate: ${candidate}`);
        console.log(btoa(candidate));
        const c = {
          ID: "candidate",
          Data: btoa(btoa(candidate)),
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
    game$.subscribe(() => {
      let inputBitmap = new Uint16Array(1);

      for (let i = 0; i < Object.keys(joypad).length; i++) {
        inputBitmap[0] += keyState[keyMap[i]] ? 1 << i : 0;
      }

      if (inputChannel) inputChannel.send(inputBitmap);
      // console.log(inputBitmap[0]);
    });
    return () => {
      game$.unsubscribe();
    };
  }, []);
  return (
    <div className="App">
      <Row>
        <Col className="cardContainer">
          <Card
            className="playerContainer"
            title="The King of Fighters '97"
            actions={[
              <SettingOutlined key="setting" />,
              <QuestionCircleOutlined key="question" />,
              <ShareAltOutlined key="share" />,
            ]}
          >
            <video autoPlay id="remoteVideos" className="player"></video>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default App;
