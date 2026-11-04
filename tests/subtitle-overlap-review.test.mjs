import assert from'node:assert/strict'
import{reviewSubtitleOverlaps}from'../scripts/subtitle-overlap-review.mjs'
const input=[{id:'a',start:0,end:1,text:'前句'},{id:'b',start:.93,end:2,text:'后句'}]
assert.equal(reviewSubtitleOverlaps(input).warnings.length,1)
const report=reviewSubtitleOverlaps(input,{singleSpeaker:true});assert.equal(report.cues[1].start,1);assert.equal(input[1].start,.93);assert.equal(report.cues[1].text,'后句')
assert.equal(reviewSubtitleOverlaps([input[0],{...input[1],start:.6}],{singleSpeaker:true}).warnings.length,1)
assert.equal(reviewSubtitleOverlaps([input[0],{...input[1],end:1.1}],{singleSpeaker:true}).warnings.length,1)
assert.equal(reviewSubtitleOverlaps([input[0],{...input[1],words:[]}],{singleSpeaker:true}).warnings.length,1)
console.log('PASS: overlap suggestions preserve source and words; large/short/multi-speaker ambiguity remains manual')
