import { html } from 'lit-html';
import { RssItem } from '../rssStringToJson';

export const podcastEpisode = (episode: RssItem) => {
  return html`
  <li style="display:flex">
    <button class="nrk-button playable" data-src="${episode.enclosure.url}">
      <svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-media-play" /></svg>
    </button>
    <button disabled class="nrk-unset">
      ${episode.title} - ${episode.duration}
    </button>
    <button class="nrk-button offline-episode"
            aria-label="Offline podcast"
            data-src="${episode.enclosure.url}">
      <svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-download" /></svg>
    </button>
  </li>`
}