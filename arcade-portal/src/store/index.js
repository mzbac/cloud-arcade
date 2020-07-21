import React, { createContext, useReducer } from "react";

const conn = new WebSocket("ws://localhost:3000/ws");
conn.onopen = () => {
  const req = {
    ID: "getGames",
  };
  conn.send(JSON.stringify(req));
};
conn.onclose = function (evt) {
  console.log(evt);
};
const pc = new RTCPeerConnection({
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
});
const initialState = {
  conn,
  pc,
};
const store = createContext(initialState);
const { Provider } = store;

const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case "games":
        return { ...state, games: action.payload };
      default:
        throw new Error();
    }
  }, initialState);
  conn.addEventListener("message", function (evt) {
    const msg = JSON.parse(evt.data);
    if (msg.id === "games") {
      dispatch({
        type: "games",
        payload: JSON.parse(msg.data),
      });
    }
  });
  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export { store, StateProvider };
