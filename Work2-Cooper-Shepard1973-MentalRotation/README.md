# 实验2 使用手册
* `mental_rotation_experiment.html`: 实验程序
* `train.html`: 训练程序
## 导出数据简介
| 列名 | 含义 |
| --- | --- |
| Subject_ID | 被试编号 |
| Session | 批次 |
|Block_Type | 线索区组类型：N / I / O / B / C|
|Trial_Num | 该 runner 内的全局试次序号|
|Stimulus|字符：R,J,G,2,5,7|
|Angle|旋转角度：0,60,...,300|
|Mirror_Condition|Normal 或 Backward|
|SOA|B 条件箭头时长（ms）；非 B 多为空|
|Response_Key|归一化按键（如 f/j；空格会变成 space）|
|ACC|是否正确：1 / 0（超时无反应可能为 0）|
|RT|反应时（ms）；提前按键等情形也有记录|
|Flag|极值标记：RT 在 [150, 3000] 外或缺失时为 1，否则 0|
|Early_Key|是否在目标前按键：1 / 0|
|Repeated_Trial|是否因提前按键需重做：1 / 0|
|Practice_Round|练习轮次；正式实验多为空字符串|
|Timestamp|ISO 时间戳（写入该条记录时）|