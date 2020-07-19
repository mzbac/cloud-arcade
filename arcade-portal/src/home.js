import React from "react";
import { Card, Row } from "antd";
import background from "./arcade-machine.svg";
import "./home.css";

const { Meta } = Card;
function Home() {
  return (
    <div className="site-card-wrapper">
      <Row className="arcadeCard">
        <Card
          hoverable
          style={{ width: 240, margin: 10, padding: 5 }}
          cover={<img alt="backgroundimage" src={background} />}
        >
          <Meta title="Europe Street beat" />
        </Card>
        <Card
          hoverable
          style={{ width: 240, margin: 10, padding: 5 }}
          cover={<img alt="backgroundimage" src={background} />}
        >
          <Meta title="Europe Street beat" />
        </Card>
        {/* <Card
          hoverable
          style={{ width: 240, margin: 10 }}
          cover={
            <img
              alt="example"
              src="https://image.shutterstock.com/image-vector/retro-arcade-machine-plugged-pixel-600w-327498875.jpg"
            />
          }
        >
          <Meta title="Europe Street beat" />
        </Card>
        <Card
          hoverable
          style={{ width: 240, margin: 10 }}
          cover={
            <img
              alt="example"
              src="https://image.shutterstock.com/image-vector/retro-arcade-machine-plugged-pixel-600w-327498875.jpg"
            />
          }
        >
          <Meta title="Europe Street beat" />
        </Card> */}
      </Row>
    </div>
  );
}
export default Home;
