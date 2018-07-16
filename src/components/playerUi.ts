import { html } from "lit-html";
import { IPlayerState } from "../index";
import { durationSecToString } from "../utils";

export const playerUi = (playerState?: IPlayerState) => {
  const {
    showTitle = "No show",
    episodeTitle = "No episode",
    duration = 0,
    progress = 0,
    image = "https://via.placeholder.com/100x100",
    playing = false,
  } = playerState || {};

  const rangeValue = progress / duration * 100 || 0;
  const slider = document.querySelector("#slider");
  if (slider instanceof HTMLInputElement) {
    // HACK: set value here as well to re-render
    // @ts-ignore
    slider.value = rangeValue;
  }

  return html`
  <div class="pod-player">
    <div class="info">
      <img src="${image}" >
      <div class="titles">
        <div class="titles--show">${showTitle}</div>
        <div>${episodeTitle}</div>
      </div>
    </div>
    <div class="controls">
      <button class="icon skip-back"></button>
      <button class="icon play-pause ${playing ? "pause" : "play"}"></button>
      <button disabled class="time current">${durationSecToString(progress)}</button>
      <input id="slider" type="range"
              value="${ rangeValue }"
              min="0"
              max="100"
              step="0.01" />
      <button disabled class="time left">-${durationSecToString(duration - progress)}</button>
      <button class="icon skip-ffw"></button>
    </div>
  </div>
  `;
};
