import { createCache } from "./cache";
import { rssStringToJson, RssItems } from './rssStringToJson';

const cache = createCache('pod-feed');

export const getFeedItems = async (feedUrl: string): Promise<RssItems> => {
  
  const cacheResponse = cache.get(feedUrl);
  if(cacheResponse) {
    return cacheResponse;
  }
  // get from network and add to cache
  const response = await fetch(feedUrl);
  const text = await response.text();
  if (response.ok) {
    const data = rssStringToJson(text);
    cache.set(feedUrl, data);
    return data;
  }
  console.warn('Request failed', response);
  return { items: [] };
}
