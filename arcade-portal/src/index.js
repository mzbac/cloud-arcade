import React from "react";
import ReactDOM from "react-dom";
import "antd/dist/antd.css";
import "./index.css";
import App from "./App";
import Home from "./home";

import * as serviceWorker from "./serviceWorker";
import { StateProvider } from "./store";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
const app = (
  <StateProvider>
    <Router>
      <Switch>
        <Route path="/game/:id">
          <App />
        </Route>
        <Route exact path="/">
          <Home />
        </Route>
      </Switch>
    </Router>
  </StateProvider>
);
ReactDOM.render(app, document.getElementById("root"));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
