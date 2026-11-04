import type {ReviewProject,ReviewMedia} from './reviewModel.mjs'
import type {AudioClip} from '../trackModel'
export type ReviewBinding={project:ReviewProject;audio?:ReviewMedia;signature?:string}
export function reviewSignature(project:ReviewProject):string
export function validateReviewBinding(value:unknown):ReviewBinding
export function resizeReviewBinding(binding:ReviewBinding,start:number,end:number):ReviewBinding
export function reviewAudioClip(layer:{id:string;visible:boolean;review?:ReviewBinding;start?:number;end?:number}):AudioClip|null
