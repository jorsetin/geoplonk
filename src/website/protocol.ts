export const WEBSITE_ORIGIN='https://geoplonk.pages.dev';
export const WEBSITE_REQUEST='geoplonk:website-request:v1';
export const WEBSITE_RESPONSE='geoplonk:website-response:v1';
export type WebsiteRequest={action:'STATUS'|'START_SINGLEPLAYER'|'RESUME_SINGLEPLAYER'|'OPEN_GAME'|'OPEN_EXPLORER';rounds?:number;duration?:number;mode?:'move'|'no-move'|'nmpz'};
export function websiteRequest(value:unknown):WebsiteRequest|null {
 if(!value||typeof value!=='object')return null;
 const data=value as Record<string,unknown>;
 if(typeof data.action!=='string')return null;
 if(['STATUS','RESUME_SINGLEPLAYER','OPEN_GAME','OPEN_EXPLORER'].includes(data.action))return {action:data.action as WebsiteRequest['action']};
 if(data.action!=='START_SINGLEPLAYER'||!Number.isInteger(data.rounds)||Number(data.rounds)<1||Number(data.rounds)>10||!Number.isInteger(data.duration)||Number(data.duration)<0||Number(data.duration)>3600||(typeof data.mode!=='string'||!['move','no-move','nmpz'].includes(data.mode)))return null;
 return {action:'START_SINGLEPLAYER',rounds:data.rounds as number,duration:data.duration as number,mode:data.mode as WebsiteRequest['mode']};
}
export function websiteSender(sender:chrome.runtime.MessageSender):boolean {
 try{return sender.frameId===0&&!!sender.tab&&new URL(sender.url??'').origin===WEBSITE_ORIGIN&&(!sender.origin||sender.origin===WEBSITE_ORIGIN);}catch{return false;}
}
