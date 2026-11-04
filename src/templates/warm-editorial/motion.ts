import {ease} from '../story/storyModel.mjs'
// Adapted from Wise Motion squash-bounce/drop (Apache-2.0, Wise Wong).
// Original ellipse deformation applied to digit groups; project-specific stagger and final hold.
export function numberLanding(t:number,delay:number){const p=Math.max(0,Math.min(1,(t-delay)/1.45));let height=0,ratio=1;if(p<.2)height=165*(1-(p/.2)**2);else{const q=(p-.2)/.8,wave=Math.abs(Math.sin(q*3*Math.PI));height=112*Math.exp(-3*q)*wave;ratio=1+.38*Math.exp(-3*q)*Math.exp(-32*wave);if(wave>.35)ratio=1-.13*Math.exp(-3*q)*wave}if(p===1){height=0;ratio=1}return {height,ratio,opacity:ease((t-delay)/.12)}}
