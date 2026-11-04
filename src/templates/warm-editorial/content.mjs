// Parameter contract for the warm-paper template. No topic-specific fallback copy.
export const editorialFields={
  "opening": [
    "value",
    "unit",
    "label",
    "question",
    "detail"
  ],
  "contrast": [
    "leftTitle",
    "leftDetail",
    "rightTitle",
    "rightDetail",
    "note"
  ],
  "focus": [
    "title",
    "detail",
    "note"
  ],
  "metric-steps": [
    "value",
    "label",
    "step1",
    "step2",
    "step3",
    "stepDetail",
    "annotation",
    "source",
    "note"
  ],
  "steps": [
    "step1",
    "step2",
    "step3",
    "stepDetail",
    "note"
  ],
  "viewpoint": [
    "title",
    "detail"
  ],
  "metric": [
    "value",
    "label",
    "cardTitle",
    "cardDetail",
    "caveatTitle",
    "caveatDetail",
    "annotation",
    "source"
  ],
  "comparison": [
    "sample",
    "sampleDetail",
    "leftValue",
    "rightValue",
    "leftLabel",
    "rightLabel",
    "annotation",
    "source",
    "note"
  ],
  "caution": [
    "title",
    "detail",
    "secondTitle",
    "secondDetail",
    "annotation",
    "source"
  ],
  "pair": [
    "leftTitle",
    "leftDetail",
    "rightTitle",
    "rightDetail",
    "note"
  ],
  "closing": [
    "title",
    "detail"
  ]
}
export function validateEditorialScene(scene){
 const keys=editorialFields[scene.narrativeKind];if(!keys)throw Error('暖纸模板版式无效')
 const c=scene.editorial;if(!c||typeof c!=='object'||Array.isArray(c))throw Error('暖纸模板缺少可替换文案')
 for(const key of keys){const v=c[key];if(typeof v!=='string'||/[\r\n]/.test(v)||v.length>48)throw Error('暖纸模板文案无效：'+key)}
 for(const key of Object.keys(c))if(!keys.includes(key))throw Error('暖纸模板未知字段：'+key)
 if(scene.narrativeKind==='opening'&&(!/^\d{1,6}$/.test(c.value)||c.unit.length>3||c.label.length>18||c.question.length>14||c.detail.length>28))throw Error('数字开头支持1至6位整数、短单位和短问题')
 if(scene.title.split('\n').length>2||scene.title.split('\n').some(t=>t.length>14))throw Error('暖纸模板标题每行最多14字，最多两行')
 if(scene.theme!=='light')throw Error('暖纸模板全片使用统一暖色纸底')
 if(['metric','metric-steps'].includes(scene.narrativeKind)&&(c.value.length>7||c.label.length>24))throw Error('数据或说明过长')
 if(scene.narrativeKind==='comparison'&&[c.leftValue,c.rightValue].some(v=>v.length>5))throw Error('对比数字过长')
 return scene
}

export const editorialFieldLabels={"value": "数字", "unit": "单位", "label": "数字说明", "question": "开场问题", "detail": "补充说明", "leftTitle": "左卡标题", "leftDetail": "左卡说明", "rightTitle": "右卡标题", "rightDetail": "右卡说明", "title": "卡片标题", "note": "口径说明", "step1": "第一步", "step2": "第二步", "step3": "第三步", "stepDetail": "步骤说明", "annotation": "旁注", "source": "资料来源", "cardTitle": "研究卡标题", "cardDetail": "研究卡说明", "caveatTitle": "范围卡标题", "caveatDetail": "范围卡说明", "sample": "样本", "sampleDetail": "样本说明", "leftValue": "左侧数字", "rightValue": "右侧数字", "leftLabel": "左侧说明", "rightLabel": "右侧说明", "secondTitle": "第二卡标题", "secondDetail": "第二卡说明"}
