import React, { createContext, useReducer } from "react";

const conn = new WebSocket("ws://20.84.42.138:8000/ws");
conn.onopen = () => {
  const req = {
    ID: "getGames",
  };
  conn.send(JSON.stringify(req));
};
conn.onclose = function (evt) {
  console.log(evt);
};

const initialState = {
  conn,
};
const store = createContext(initialState);
const { Provider } = store;

const StateProvider = ({ children }) => {
  const [state, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case "games":
        return { ...state, games: action.payload };
      case "newconnection":
        return { ...state, ...action.payload };
      case "updatePlayerCount":
        return { ...state, currentPlayersInRomm: action.payload };
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
    if (msg.id === "updatePlayerCount") {
      dispatch({
        type: "updatePlayerCount",
        payload: JSON.parse(msg.data),
      });
    }
  });
  return <Provider value={{ state, dispatch }}>{children}</Provider>;
};

export { store, StateProvider };
