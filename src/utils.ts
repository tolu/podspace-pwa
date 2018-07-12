const pad = (value: string | number) => value.toString().padStart(2, '0');
export const durationSecToString = (duration: number) => {
  // 01:59:23 => 23 + (59*60) + (1*60*60)
  const d = new Date(0);
  d.setSeconds(Math.round(duration));
  if(duration >= 60*60) {
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  }
  return `${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

export const durationStringToSec = (duration: string) => {
  // 01:59:23 => 23 + (59*60) + (1*60*60)
  return duration.split(':').reverse().reduce((p,n,idx) => p + parseFloat(n) * Math.pow(60, idx), 0);
}