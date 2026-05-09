# Cognitive Psychology Experiments

本仓库用于运行一组认知心理学实验（以浏览器本地页面形式运行）。

## 重要文件说明

- `CognitivePsychology/index.html`
  - **正式实验代码（用于实际实验）**
- `CognitivePsychology/shiyan.html`
  - **测试代码（用于调试/试运行，不用于正式实验）**
- `CognitivePsychology/training.html`
  - 训练模块（视觉熟悉、听觉关联、0ms 局部报告、防预测、过渡适应等，可由被试自主选择训练项目）

## 如何运行

最简单方式：直接用浏览器打开对应的 `.html` 文件即可。

如果遇到音频播放/文件访问限制，建议在该目录启动一个本地静态服务器（任选其一）：

```bash
cd CognitivePsychology
python -m http.server 8000
```

然后用浏览器访问 `http://localhost:8000/index.html`（正式实验）或 `training.html`（训练模块）。

