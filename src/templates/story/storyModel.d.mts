export type StoryScene={id:string;kind:string;title:string;labels:string[];start:number;end:number;events:{at:number;cueId:string;text?:string}[];theme:'dark'|'light';narrativeKind?:string;editorial?:Record<string,string>;brandId?:string;diagram?:string;beats?:number[];presenter:'hero'|'split'|'pip'|'none';transition:'carry'|'window'|'match';note?:string;goal?:string;education?:{layout:'intro'|'overview'|'evidence'|'flow'|'close';number?:string;subtitle?:string;source?:string;asset?:{id:string;type:'video'|'image';duration?:number;offset?:number};focus?:{x:number;y:number;scale:number};steps?:string[];timingNote?:string};handbook?:{layout:'hero'|'evidence'|'flow';chapter:string;items?:string[];source?:string;notes?:string[];imageAspect?:number;focus?:{x:number;y:number;w:number;h:number}};evidenceMediaId?:string;broll?:{mediaId:string;jobId:string;mode:'live'|'mock';fit:'cover'|'contain';offset:number;sourceDuration:number;startAt?:number;endAt?:number;endBehavior:'hold'}}
export type StoryProject={fontFamily?:string;format:'team-story';version:1;template:string;platform:'douyin'|'channels';visualTheme?:'dark-tech'|'white-flow';hookVariant?:'conflict'|'comparison';duration:number;progressDuration?:number;presenterMode?:'none';presenterOverlay?:import('./presenterOverlay.mjs').PresenterOverlay;motionVersion?:2;presentationStyle?:'scene-narration'|'editorial-custom'|'warm-editorial'|'education-custom';editorialHeader?:string;backdropMediaId?:string;highlightLexicon?:string[];brands?:{id:string;name:string;logoMediaId:string;subtitle?:string}[];video?:{id:string;name:string};scenes:StoryScene[];cues:{id:string;start:number;end:number;text:string;captionPhrases?:string[];captionSegments?:{text:string;start:number;end:number}[]}[];music?:{id:string;name:string;source:string};audio?:{id:string;name:string};provenance?:unknown}
export const storyKinds:string[]
export const storyPresets:Record<string,{name:string;motion:number;window:number}>
export function clamp(n:number):number
export function ease(n:number):number
export function validateStory(input:unknown):StoryProject
export function storyAt(story:StoryProject,time:number):{scene:StoryScene;index:number;local:number;enter:number;previous:StoryScene|null;phase:number;preset:{name:string;motion:number;window:number}}
export function storyTextLines(text:string,max?:number):string[]

export function storyCaptionPhrases(text:string,max?:number):string[]
export function storyCaptionAt(cues:StoryProject['cues'],time:number,max?:number):{text:string;start:number;end:number;sourceCueId:string;timing:string}|null
export function storyCaptionTokens(text:string):{text:string;emphasis:boolean}[]

export const storyThemes:Record<'dark-tech'|'white-flow',{name:string;theme:'dark'|'light';template:string}>
export function withStoryTheme(input:StoryProject,visualTheme:'dark-tech'|'white-flow'):StoryProject
