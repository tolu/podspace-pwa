import { html } from 'lit-html';
import { PlayerState } from "../index";

export const playerUi = (playerState?: PlayerState) => {
  const {
    showTitle = 'No show',
    episodeTitle = 'No episode',
    duration = 0,
    progress = 0,
    image = 'http://via.placeholder.com/100x100',
    playing = false,
  } = playerState || {};

  const rangeValue = progress/duration*100 || 0;
  const slider = document.querySelector('#slider');
  if(slider instanceof HTMLInputElement) {
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
      <button class="icon play-pause ${playing ? 'pause' : 'play'}"></button>
      <button disabled class="time current">${durationSecToString(progress)}</button>
      <input id="slider" type="range"
              value="${ rangeValue }"
              min="0"
              max="100"
              step="0.01" />
      <button disabled class="time left">-${durationSecToString(duration-progress)}</button>
      <button class="icon skip-ffw"></button>
    </div> 
  </div>
  `;
}

const pad = (value: string | number) => value.toString().padStart(2, '0');
function durationSecToString(duration: number) {
  // 01:59:23 => 23 + (59*60) + (1*60*60)
  const d = new Date(0);
  d.setSeconds(Math.round(duration));
  if(duration >= 60*60) {
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }
  return `${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
