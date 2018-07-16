import { IRssItem } from "./rssStringToJson";

export const getAllCachedMp3Urls = async () => {
  const mp3Cache = await caches.open("audio");
  const keys = await mp3Cache.keys();
  return keys.map((r) => r.url);
};

export const isOffline = (pod: IRssItem, cachedUrls: string[]) => {
  const url = pod.enclosure.url;
  return cachedUrls.find((cacheUrl) => cacheUrl.includes(url)) != null;
};

export const getCachedMp3Url = async (pod: IRssItem) => {
  const url = pod.enclosure.url;
  const cachedUrls = await getAllCachedMp3Urls();
  return cachedUrls.find((cacheUrl) => cacheUrl.includes(url));
};
