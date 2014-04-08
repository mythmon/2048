var manager;

// Wait till the browser is ready to render the game (avoids glitches)
window.requestAnimationFrame(function () {
  manager = new GameManager(4, KeyboardInputManager, HTMLActuator);
});
