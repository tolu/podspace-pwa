import { html } from 'lit-html';
import { iTunesResult } from '../index';

export const podcastListItem = (list: iTunesResult[], className: string) => list.map((r) => {
  return html`
  <div>
    <img class="${className}"
          title="${r.collectionName}"
          src="${r.artworkUrl100}"
          alt="${r.trackName}"
          id="${r.collectionId}" />
  </div>`;
})
