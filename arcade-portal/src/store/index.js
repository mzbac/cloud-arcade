import React, { createContext, useReducer, useEffect } from "react";

// Initial state for app data
const initialState = {};

// Define a reducer to handle updates to app data
const reducer = (state, action) => {
  switch (action.type) {
    case "UPDATE_APP_DATA":
      return { ...state, ...action.payload };
    case "UPDATE_SOCKET":
      return { ...state, conn: action.payload };
    case "GAMES":
      return { ...state, games: action.payload };
    case "UPDATE_PLAYER_COUNT":
      return { ...state, currentPlayersInRoom: action.payload };
    default:
      return state;
  }
};

// Create a context for app data
export const AppDataContext = createContext(initialState);

// Provider component
export const AppDataProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    // Create a WebSocket connection
    const socket = new WebSocket("ws://192.168.1.104:8000/ws");

    // Update the state with the socket connection
    dispatch({ type: "UPDATE_SOCKET", payload: socket });

    socket.onopen = () => {
      const req = {
        ID: "getGames",
      };
      socket.send(JSON.stringify(req));
    };

    socket.onclose = function (evt) {
      console.log(evt);
    };

    // Add a message listener to the WebSocket
    socket.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === "games") {
        dispatch({
          type: "GAMES",
          payload: JSON.parse(msg.data),
        });
      }
      if (msg.id === "updatePlayerCount") {
        dispatch({
          type: "UPDATE_PLAYER_COUNT",
          payload: JSON.parse(msg.data),
        });
      }
    });

    // Clean up the WebSocket connection on unmount
    return () => {
      socket.close();
    };
  }, []);

  return (
    <AppDataContext.Provider value={{ state, dispatch }}>
      {children}
    </AppDataContext.Provider>
  );
};
