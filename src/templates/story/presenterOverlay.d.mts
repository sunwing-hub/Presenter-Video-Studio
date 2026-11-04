export type PresenterOverlay={mediaId:string;x:number;y:number;size:number;sourceWidth:number;sourceHeight:number;crop:{x:number;y:number;width:number;height:number};border?:number;shadow?:number;segments:{start:number;end:number;sourceStart:number;rate:number}[]}
export function validatePresenterOverlay(p:unknown,duration:number):void
export function overlaySourceAt(p:PresenterOverlay,time:number):number
