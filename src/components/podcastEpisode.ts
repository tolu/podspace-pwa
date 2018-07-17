import { html } from "lit-html";
import { IRssItem } from "../rssStringToJson";

export const podcastEpisode = (episode: IRssItem, offline: boolean) => {
  const id = btoa(episode.enclosure.url);
  const icon = !offline
    ? html`<svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-download" /></svg>`
    : html`<svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-bookmark--active" /></svg>`;
  return html`
  <li class="podcast-episode" id="${id}">
    <button class="nrk-button nrk-button--o playable" data-src="${episode.enclosure.url}">
      <svg style="width:1.5em;height:1.5em" aria-hidden="true"><use xlink:href="#nrk-media-play" /></svg>
    </button>
    <div class="titles">
      <div class="nrk-truncate">${episode.title}</div>
      <span style="float:right">${episode.duration}</span>
      <button onclick="this.nextElementSibling.showModal()">Description</button>
      <dialog>
        <p>${stripHtml(episode.subtitle)}</p>
        <button class="nrk-button"
                onclick="this.parentElement.close()">Close</button>
      </dialog>
    </div>
    <button class="nrk-button nrk-button--o ${offline ? "" : "offline-episode"}"
            aria-label="Offline podcast"
            data-src="${episode.enclosure.url}">
      ${icon}
    </button>
  </li>`;
};

function stripHtml(htmlString: string) {
  return htmlString.replace(/<\/?(\w|\s|=|"|:|\/|\.|-)+>/gm, "");
}
