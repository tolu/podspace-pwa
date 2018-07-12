import { html } from 'lit-html';
import { State } from '../index';
import { podcastListItem } from './podListItem';

export const header = (state: State) => {
  return html`
<header>
  <h1>${state.title}</h1>
  <form name="search">
    <input
      name="searchInput"
      autocomplete="off"
      type="text"
      placeholder="Search..." />
    <div class="search-results">
      <div class="list-container">
        ${podcastListItem(state.searchResults, 'podcast-search-result')}
      </div>
    </div>
  </form>
</header>`;
}