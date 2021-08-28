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

const gamepadMap = {
  [joypad.JOYPAD_LEFT]:14,
  [joypad.JOYPAD_UP]: 12,
  [joypad.JOYPAD_RIGHT]: 15,
  [joypad.JOYPAD_DOWN]: 13,
  [joypad.JOYPAD_A]: 0,
  [joypad.JOYPAD_B]: 1,
  [joypad.JOYPAD_X]: 2,
  [joypad.JOYPAD_Y]: 3,
  [joypad.JOYPAD_L]: 4,
  [joypad.JOYPAD_R]: 5,
  [joypad.JOYPAD_SELECT]: 8,
  [joypad.JOYPAD_START]: 9,
}

function App() {
  const [showKeyboard, setShowKeyboard] = useState(true);

  const { state } = useContext(store);
  const { id: workerID } = useParams();
  const { conn, games, currentPlayersInRomm } = state;
  useEffect(() => {
    console.log('page mount')
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });
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
    const gamepadState = {};
    
    let keydown$ = fromEvent(document, "keydown").pipe(
      map((x) => (keyState[x.code] = true))
    );

    let keyup$ = fromEvent(document, "keyup").pipe(
      map((x) => (keyState[x.code] = false))
    );

    const gamepad$ = interval(1000 / 60, animationFrame).pipe(map(()=>{
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);

      if(gamepads[0]){
        for (let i = 0; i < gamepads[0].buttons.length; i++) {
          var val =  gamepads[0].buttons[i];
          var pressed = val === 1.0;
          if (typeof(val) === "object") {
            pressed = val.pressed;
            val = val.value;
          }
          gamepadState[i] = pressed
        }

        // axis -> dpad
        const corX = gamepads[0].axes[0]; // -1 -> 1, left -> right
        const corY = gamepads[0].axes[1]; // -1 -> 1, up -> down

        if(corX<=-0.5){
          gamepadState[gamepadMap[joypad.JOYPAD_LEFT]] = true
        }else if ( corX >= 0.5){
          gamepadState[gamepadMap[joypad.JOYPAD_RIGHT]] = true
        }else{
          gamepadState[gamepadMap[joypad.JOYPAD_RIGHT]] = false
          gamepadState[gamepadMap[joypad.JOYPAD_LEFT]] = false
        }

        if(corY<=-0.5){
          gamepadState[gamepadMap[joypad.JOYPAD_UP]] = true
        }else if ( corY >= 0.5){
          gamepadState[gamepadMap[joypad.JOYPAD_DOWN]] = true
        }else{
          gamepadState[gamepadMap[joypad.JOYPAD_UP]] = false
          gamepadState[gamepadMap[joypad.JOYPAD_DOWN]] = false
        }

      }

    }))

    const keyPress = keydown$.pipe(merge(keyup$));
    
    const keyboard$ = interval(1000 / 60, animationFrame).pipe(withLatestFrom(keyPress));

    const handler = keyboard$.pipe(merge(gamepad$)).subscribe(() => {
      let inputBitmap = new Uint16Array(1);
      let keyboardBitmap = new Uint16Array(1);
      let gamepadBitmap = new Uint16Array(1);
      for (let i = 0; i < Object.keys(joypad).length; i++) {
        keyboardBitmap[0] += keyState[keyMap[i]] ? 1 << i : 0;
        gamepadBitmap[0] +=  gamepadState[gamepadMap[i]] ? 1 << i : 0;
        inputBitmap[0] = keyboardBitmap[0] | gamepadBitmap[0]
      }

      if (inputChannel) inputChannel.send(inputBitmap);
    });
    return () => {
      handler.unsubscribe();
      pc.close();
    };
  }, [conn, workerID]);
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
            <video controls autoPlay id="remoteVideos" className="player"></video>
            <Meta title={`Current players ${currentPlayersInRomm}`} />
          </Card>
          {showKeyboard ? <Keyboard /> : null}
        </Col>
      </Row>
    </div>
  );
}

export default App;
