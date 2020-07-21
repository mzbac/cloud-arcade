import React from "react";
import "./keyboard.css";

function Keyboard() {
  return (
    <div className="keyboard_background">
      <div className="keyboard">
        <div className="row">
          <div className="key key__esc">
            <i data-feather="x"></i>
          </div>
          <div className="key key__symbols key_highlight">
            Start <span /> 1
          </div>
          <div className="key key__symbols">
            @ <span /> 2
          </div>
          <div className="key key__symbols key_highlight">
            Select <span /> 3
          </div>
          <div className="key key__symbols">
            $ <span /> 4
          </div>
          <div className="key key__symbols">
            % <span /> 5
          </div>
          <div className="key key__symbols">
            ^ <span /> 6
          </div>
          <div className="key key__symbols">
            {"&"} <span /> 7
          </div>
          <div className="key key__symbols">
            * <span /> 8
          </div>
          <div className="key key__symbols">
            ( <span /> 9
          </div>
          <div className="key key__symbols">
            ) <span /> 0
          </div>
          <div className="key key__symbols">
            _ <span /> -
          </div>
          <div className="key key__symbols">
            + <span /> =
          </div>
          <div className="key key__delete key__icon">
            <i data-feather="delete"></i>
          </div>
        </div>

        <div className="row">
          <div className="key key__oneandhalf">
            <i data-feather="log-in"></i>
          </div>
          <div className="key">Q</div>
          <div className="key key__symbols key_highlight">
            &#8593; <span /> W
          </div>
          <div className="key">E</div>
          <div className="key">R</div>
          <div className="key">T</div>
          <div className="key">Y</div>
          <div className="key key__symbols key_highlight">
            X <span /> U
          </div>
          <div className="key key__symbols key_highlight">
            Y <span /> I
          </div>
          <div className="key">O</div>
          <div className="key">P</div>
          <div className="key key__symbols">
            {"{"} <span /> {"["}
          </div>
          <div className="key key__symbols">
            {"}"} <span /> ]
          </div>
          <div className="key key__symbols key__oneandhalf">
            | <span /> \
          </div>
        </div>

        <div className="row">
          <div className="key key__caps">
            <i data-feather="meh"></i>
          </div>
          <div className="key key__symbols key_highlight">
            &#8592; <span /> A
          </div>
          <div className="key key__symbols key_highlight">
            &#8595; <span /> S
          </div>
          <div className="key key__symbols key_highlight">
            &#8594; <span /> D
          </div>
          <div className="key">F</div>
          <div className="key">G</div>
          <div className="key">H</div>
          <div className="key key__symbols key_highlight">
            A <span /> J
          </div>
          <div className="key key__symbols key_highlight">
            B <span /> K
          </div>
          <div className="key">L</div>
          <div className="key key__symbols">
            : <span /> ;
          </div>
          <div className="key key__symbols">
            " <span /> '
          </div>
          <div className="key key__enter">
            <i data-feather="corner-down-left"></i>
          </div>
        </div>

        <div className="row">
          <div className="key key__shift-left">
            <i data-feather="arrow-up-circle"></i>
          </div>
          <div className="key">Z</div>
          <div className="key">X</div>
          <div className="key">C</div>
          <div className="key">V</div>
          <div className="key">B</div>
          <div className="key">N</div>
          <div className="key">M</div>
          <div className="key key__symbols">
            {">"} <span /> .
          </div>
          <div className="key key__symbols">
            {"<"} <span /> .
          </div>
          <div className="key key__symbols">
            ? <span /> /
          </div>
          <div className="key">
            <i data-feather="arrow-up-circle"></i>
          </div>
          <div className="key key__arrow">
            <i data-feather="arrow-up"></i>
          </div>
          <div className="key">
            <i data-feather="trash-2"></i>
          </div>
        </div>

        <div className="row">
          <div className="key key__bottom-funct"></div>
          <div className="key key__bottom-funct">
            <i data-feather="activity"></i>
          </div>
          <div className="key key__bottom-funct">
            <i data-feather="command"></i>
          </div>
          <div className="key key__spacebar"></div>
          <div className="key">
            <i data-feather="command"></i>
          </div>
          <div className="key">
            <i data-feather="activity"></i>
          </div>
          <div className="key key__arrow">
            <i data-feather="arrow-left"></i>
          </div>
          <div className="key key__arrow">
            <i data-feather="arrow-down"></i>
          </div>
          <div className="key key__arrow">
            <i data-feather="arrow-right"></i>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Keyboard;
