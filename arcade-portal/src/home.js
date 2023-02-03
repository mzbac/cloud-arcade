import React, { useContext } from "react";
import { Card, Row } from "antd";
import background from "./arcade-machine.svg";
import "./home.css";
import { AppDataContext } from "./store";
import { useHistory } from "react-router-dom";

const { Meta } = Card;
function Home() {
  const { state } = useContext(AppDataContext);
  const { games } = state;
  const history = useHistory();

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
