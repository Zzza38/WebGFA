import dictionary from "./dictionary.js";
import answerList from "./answerList.js";

const guessGrid = document.querySelector("[data-guess-grid]");
const keyboard = document.querySelector("[data-keyboard]");
const alertContainer = document.querySelector("[data-alert-container]");
const WORD_LENGTH = 5;
const FLIP_ANIMATION_DURATION = 500;
const DANCE_ANIMATION_DURATION = 500;
let index = Math.floor(Math.random() * answerList.length);
let randomWord = answerList[index];

startInteraction();

function startInteraction() {
  document.addEventListener("click", mouseClick);
  document.addEventListener("keydown", keyClick);
}

function stopInteraction() {
  document.removeEventListener("click", mouseClick);
  document.removeEventListener("keydown", keyClick);
}

function mouseClick(e) {
  if (e.target.matches("[data-key]")) {
    enterLetter(e.target.dataset.key);
  } else if (e.target.matches("[data-enter]")) {
    enterLetter(e);
  } else if (e.target.matches("[data-delete]")) {
    deleteKey();
  }
}

function keyClick(e) {
  if (e.key === "Enter") {
    submitGuess();
  } else if (e.key === "Backspace" || e.key === "Delete") {
    deleteLetter();
  } else if (e.key.match(/^[a-z]$/)) {
    enterLetter(e.key);
  }
}

function enterLetter(key) {
  const activeTiles = getActiveTiles();
  if (activeTiles.length >= WORD_LENGTH) return;
  const nextTile = guessGrid.querySelector(":not([data-letter])");
  nextTile.dataset.letter = key.toLowerCase();
  nextTile.textContent = key;
  nextTile.dataset.state = "active";
}

function deleteLetter() {
  const activeTiles = getActiveTiles();
  const lastTile = activeTiles[activeTiles.length - 1];
  if (lastTile == null) return;
  lastTile.textContent = "";
  delete lastTile.dataset.state;
  delete lastTile.dataset.letter;
}

function submitGuess() {
  const activeTiles = [...getActiveTiles()];
  if (activeTiles.length !== WORD_LENGTH) {
    showAlert("Not enough letters");
    shakeTiles(activeTiles);
    return;
  }

  const guess = activeTiles.reduce((word, tile) => {
    return word + tile.dataset.letter;
  }, "");

  if (!dictionary.includes(guess)) {
    showAlert("Not in word list");
    shakeTiles(activeTiles);
    return;
  }

  stopInteraction();
  activeTiles.forEach((...params) => flipTile(...params, guess));
}

function flipTile(tile, index, array, guess) {
  const letter = tile.dataset.letter;
  const key = keyboard.querySelector(`[data-key="${letter}"i]`);
  setTimeout(() => {
    tile.classList.add("flip");
  }, (index * FLIP_ANIMATION_DURATION) / 2);

  tile.addEventListener(
    "transitionend",
    () => {
      tile.classList.remove("flip");
      if (randomWord[index] === letter) {
        tile.dataset.state = "correct";
        key.classList.add("correct");
      } else if (randomWord.includes(letter)) {
        tile.dataset.state = "wrong-location";
        key.classList.add("wrong-location");
      } else {
        tile.dataset.state = "wrong";
        key.classList.add("wrong");
      }

      if (index === array.length - 1) {
        tile.addEventListener(
          "transitionend",
          () => {
            startInteraction();
            checkWin(guess, array);
          },
          { once: true }
        );
      }
    },
    { once: true }
  );
}

function getActiveTiles() {
  return guessGrid.querySelectorAll("[data-state='active']");
}

function showAlert(message, duration = 1000) {
  const alert = document.createElement("div");
  alert.textContent = message;
  alert.classList.add("alert");
  alertContainer.prepend(alert);
  if (duration == null) return;

  setTimeout(() => {
    alert.classList.add("hide");
    alert.addEventListener("transitionend", () => {
      alert.remove();
    });
  }, duration);
}

function shakeTiles(tiles) {
  tiles.forEach((tile) => {
    tile.classList.add("shake");
    tile.addEventListener(
      "animationend",
      () => {
        tile.classList.remove("shake");
      },
      { once: true }
    );
  });
}

function checkWin(guess, tiles) {
  let playAgainButton = document.getElementById("play-again");
  if (guess === randomWord) {
    danceTiles(tiles);
    setTimeout(() => {
      playAgainButton.style.display = "block";
    }, 1500);
    playAgainButton.textContent = "You Won! Play Again?";
    stopInteraction();
    return;
  }

  const remainingTiles = guessGrid.querySelectorAll(":not([data-letter])");
  if (remainingTiles.length === 0) {
    setTimeout(() => {
      playAgainButton.style.display = "block";
    }, 500);
    playAgainButton.textContent = ` Game over! The word was: ${randomWord.toUpperCase()}. Try again?`;
    stopInteraction();
  }
}

function danceTiles(tiles) {
  tiles.forEach((tile, index) => {
    setTimeout(() => {
      tile.classList.add("dance");
      tile.addEventListener(
        "animationend",
        () => {
          tile.classList.remove("dance");
        },
        { once: true }
      );
    }, (index * DANCE_ANIMATION_DURATION) / 5);
  });
}

function resetGame() {
  document.getElementById("play-again").style.display = "none";

  document.querySelectorAll(".tile").forEach((tile) => {
    delete tile.dataset.letter;
    delete tile.dataset.state;
    tile.textContent = "";
    tile.className = "tile";
  });

  document.querySelectorAll(".key").forEach((key) => {
    if (!key.hasAttribute("data-enter") && !key.hasAttribute("data-delete")) {
      key.className = "key";
    }
  });

  index = Math.floor(Math.random() * answerList.length);
  randomWord = answerList[index];

  startInteraction();
}

document.getElementById("play-again").addEventListener("click", resetGame);
