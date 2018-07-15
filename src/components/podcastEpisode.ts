import { html } from 'lit-html';
import { RssItem } from '../rssStringToJson';

export const podcastEpisode = (episode: RssItem, offline: boolean) => {
  const icon = !offline
    ? html`<svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-download" /></svg>`
    : html`<svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-bookmark--active" /></svg>`;
  return html`
  <li class="podcast-episode">
    <button class="nrk-button playable" data-src="${episode.enclosure.url}">
      <svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-media-play" /></svg>
    </button>
    <button disabled class="nrk-unset">
      ${episode.title} - ${episode.duration}
    </button>
    <button class="nrk-button ${offline? '' : 'offline-episode'}"
            aria-label="Offline podcast"
            data-src="${episode.enclosure.url}">
      ${icon}
    </button>
  </li>`
}