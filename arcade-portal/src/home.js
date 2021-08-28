import React, { useContext, useEffect } from "react";
import { Card, Row } from "antd";
import background from "./arcade-machine.svg";
import "./home.css";
import { store } from "./store";
import { useHistory } from "react-router-dom";

const { Meta } = Card;
function Home() {
  const { state, dispatch } = useContext(store);
  const { games, conn } = state;
  const history = useHistory();
  useEffect(() => {
    if (conn.readyState === WebSocket.CLOSED) {
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
      dispatch({
        type: "newconnection",
        payload: { conn },
      });
    }
  }, [dispatch]);
  return (
    <div className="site-card-wrapper">
      <Row className="arcadeCard">
        {games
          ? Object.entries(games).map((g) => {
              return (
                <Card
                  onClick={() => {
                    history.push(`/game/${g[0]}`);
                  }}
                  hoverable
                  key={g[0]}
                  style={{ width: 240, margin: 10, padding: 5 }}
                  cover={<img alt="backgroundimage" src={background} />}
                >
                  <Meta title={g[1]} />
                </Card>
              );
            })
          : null}
      </Row>
    </div>
  );
}
export default Home;
