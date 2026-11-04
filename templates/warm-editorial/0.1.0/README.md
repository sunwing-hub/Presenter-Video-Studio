# 暖纸数字口播 · 0.1.0

已认可样片：《微软裁员》v1.2。适合数据开场、新闻解读、趋势观点与研究讲解。全片暖色纸底，深绿正文、砖红数字；一个人物视频在中景与左下小窗之间连续移动。正文等待人物窗口移动后进入，避免遮脸。

这是从定制影片提炼的原生模板，可替换所有图解文案，不是仅把MP4放进案例库。原来的MicrosoftEditorial渲染器与原工程保留，参数化版使用独立WarmEditorial渲染器。已认可的是样片；新题材需重新审片。

## 使用入口

模板中心：`/reference-templates/warm-editorial/index.html`。统一机读ID：`team.warm-editorial@0.1.0`。

助手先用 `node scripts/studio-cli.mjs read-spec team.warm-editorial` 读取规范，再看 controls.json、recipe.json 和 sample-plan.json。新方案使用自己的素材ID与最终时间线。示例工程中的素材UUID仅属于当前机器，移机必须重新导入，不可直接照搬。

创建：`node scripts/create-warm-editorial.mjs 新方案.json 新工程.json --save-draft`。脚本读取本机端口环境变量，不写死端口。导出：`node scripts/render-studio-project.mjs 新工程.json 新成片.mp4`。

## 可复用版式

11类版式：opening数字钩子；contrast双卡对照；focus单卡；metric-steps数据＋三步骤；steps横向三步骤；viewpoint观点卡；metric研究数据；comparison群体对比；caution研究口径提醒；pair组织/任务双卡；closing结尾行动。样片共12镜，其中观点卡复用两次。

计划每镜必须填写 layout、title、start、end、content。content字段见controls.json。无资料注释时明确填空字符串，禁止沿用微软、Copilot、客服等旧片事实。开头支持1～6位整数、短单位、说明与问题；数字错峰回弹保留Wise Motion署名。每个镜头标题最多两行、每行14字。图解内文自动适配字号，仍需预览。

语音、字幕、人物视频共享最终剪后时钟。新素材语速按命令决定；示例1.12～1.16倍不自动强加。重新变速必须同步画面与字幕，不能照搬96.84秒时序。字幕为保守节选、单行显示、不带尾标点；全部口播是否保留由任务指令决定。

## 声音与验收

输入audio是包含原声、BGM及音效的完整预混音轨；工厂自动将人物视频静音，避免原声重复。BGM从用户指定音乐库选择。样片修正：基础增益0.22、闪避阈值0.06、压缩比2；这些是本首曲目的参考设置，每次试听并测量，不能把0.22当作所有曲目的固定听感。保持口播清楚且音乐可闻，最终峰值不超过−1 dBTP。

已验证1080×1920、25fps；本版限制竖屏，使用原渲染管线。没有AI素材槽位，不进行付费生成。新片先确认方案，再生成，检查开头3～5秒、窗口过渡、图解信息顺序、单行字幕、资料口径及混音。
