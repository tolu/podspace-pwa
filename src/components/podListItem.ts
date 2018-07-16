import { html } from "lit-html";
import { IiTunesResult } from "../index";

export const podcastListItem = (list: IiTunesResult[], className: string) => list.map((r) => {
  return html`
  <li class="pod-list-item">
    <button class="nrk-unset ${className}" id="${r.collectionId}" aria-label="${r.collectionName}">
      <img  aria-hidden="true"
            title="${r.collectionName}"
            src="${r.artworkUrl100}"
            alt="${r.trackName}" />
    </button>
  </li>`;
});
