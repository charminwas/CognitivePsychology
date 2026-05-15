import pandas as pd
import matplotlib.pyplot as plt

# ---- 构建数据（直接基于你给出的两张表） ----
# 表1：每个被试每种刺激的正确率（已排序，但我们需要按刺激类型重排）
individual_data = {
    'Subject': ['C', 'C', 'C', 'C', 'C', 'C',
                'L', 'L', 'L', 'L', 'L', 'L',
                'W', 'W', 'W', 'W', 'W', 'W'],
    'Stimulus': ['7', '5', '2', 'G', 'R', 'J',
                 '2', '5', 'R', 'G', 'J', '7',
                 '5', 'J', '2', '7', 'G', 'R'],
    'Accuracy': [0.988372, 0.967033, 0.966667, 0.890110, 0.888889, 0.865169,
                 0.960000, 0.958763, 0.958763, 0.938776, 0.936842, 0.910891,
                 0.989474, 0.980198, 0.979381, 0.979167, 0.949495, 0.937500]
}
df_ind = pd.DataFrame(individual_data)

# 表2：每个刺激的被试间平均正确率
stimulus_avg = pd.Series({
    '5': 0.971757, '2': 0.968683, '7': 0.959477,
    'R': 0.928384, 'J': 0.927403, 'G': 0.926127
}).reset_index()
stimulus_avg.columns = ['Stimulus', 'Avg_Accuracy']

# 为了折线图，按刺激类型分组，x 轴顺序：数字（2,5,7）→ 字母（G,J,R）
order = ['2', '5', '7', 'G', 'J', 'R']

# ---- 绘图 ----
plt.figure(figsize=(7, 5))

# 为每个被试画一条折线（带有数据点）
colors = {'C': '#4C72B0', 'L': '#55A868', 'W': '#C44E52'}
for subj in ['C', 'L', 'W']:
    subj_data = df_ind[df_ind['Subject'] == subj].set_index('Stimulus').loc[order]
    plt.plot(order, subj_data['Accuracy'], marker='o', color=colors[subj],
             label=f'Subject {subj}', linewidth=1.5, markersize=7)

# 画总体平均折线（更粗、黑色虚线）
avg_line = stimulus_avg.set_index('Stimulus').loc[order]
plt.plot(order, avg_line['Avg_Accuracy'], marker='D', color='black',
         linestyle='--', linewidth=2, markersize=8, label='Average')

# 标注数字和字母区域
plt.axvspan(-0.5, 2.5, facecolor='skyblue', alpha=0.1, label='Digit')
plt.axvspan(2.5, 5.5, facecolor='lightcoral', alpha=0.1, label='Letter')

plt.ylim(0.85, 1.00)        # 放大差异区域
plt.ylabel('Accuracy')
plt.xlabel('Stimulus')
plt.title('Accuracy profile: Digit vs. Letter stimuli')
plt.legend(loc='lower left')
plt.tight_layout()
plt.show()