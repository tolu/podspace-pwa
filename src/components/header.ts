import coreInput from "@nrk/core-input";
import { html } from "lit-html";
import { IState } from "../index";
import { podcastListItem } from "./podListItem";

export const header = (state: IState) => {
  const gotResults = state.searchResults.length > 0;
  return html`
<header>
  <h1>${state.title}</h1>
  <div class="search">
    <input
      name="searchInput"
      class="search-field"
      autocomplete="off"
      type="text"
      placeholder="Search..." />
    <div class="search-results ${gotResults ? "" : "no-results"}">
      <ul class="list-container nrk-unset">
        ${podcastListItem(state.searchResults, "podcast-search-result")}
      </ul>
    </div>
    <button class="nrk-unset search-btn" type="submit">
      <svg style="width:1.5em;height:1.5em;vertical-align: middle;"
            aria-hidden="true"><use xlink:href="#nrk-search"></use></svg>
    </button>
  </form>
</header>`;
};
function initCoreInput() {
  console.log("init core input");
  coreInput(".search-field");
}
// observe dom and wait for header mounted to init core-input
const mutationObserver = new MutationObserver((mutations) => {
  mutations.forEach(({addedNodes}) => {
    const list = Array.from(addedNodes).filter((e) => e instanceof HTMLElement) as HTMLElement[];
    if (list.some((e) => e.querySelector("header") != null)) {
      mutationObserver.disconnect();
      initCoreInput();
    }
  });
});
mutationObserver.observe(document.body, {
  childList: true,
  subtree: true,
});
