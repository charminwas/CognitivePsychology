import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# ==================== 参数设置 ====================
RT_UPPER = 3000
RT_LOWER_MAP = {
    'N': 150, 'I': 150, 'O': 150, 'B': 150, 'C': 100
}
SD_FACTOR = 3
# =================================================

# 1. 读取原始数据
df = pd.read_csv('data.csv')
print(f"原始数据量: {len(df)}")

# 2. 绝对阈值清洗（所有试次）
df['RT_Lower'] = df['Block_Type'].map(RT_LOWER_MAP)
mask_fast = df['RT'] <= df['RT_Lower']
mask_slow = df['RT'] >= RT_UPPER
df = df[~(mask_fast | mask_slow)].copy()
print(f"绝对阈值清洗后: {len(df)}")

# 3. 创建条件列
df['Condition'] = df['Stimulus'].astype(str) + '_' + df['Block_Type'].astype(str)

# 4. 条件离群值剔除（仅针对正确试次）
def get_outlier_mask(group):
    """返回正确试次中超出均值±3SD的布尔索引"""
    correct = group[group['ACC'] == 1]          # ← 改为 ACC
    if len(correct) < 3:
        return pd.Series(False, index=group.index)
    mean_rt = correct['RT'].mean()
    std_rt = correct['RT'].std()
    if std_rt == 0:
        return pd.Series(False, index=group.index)
    lower = mean_rt - SD_FACTOR * std_rt
    upper = mean_rt + SD_FACTOR * std_rt
    return (group['ACC'] == 1) & ((group['RT'] < lower) | (group['RT'] > upper))

outlier_mask = df.groupby(['Subject_ID', 'Condition'], group_keys=False).apply(get_outlier_mask)
df_clean = df[~outlier_mask].copy()
print(f"离群值剔除后: {len(df_clean)}")
df_clean.drop(columns=['RT_Lower'], inplace=True)
df_clean.to_csv('data_clean.csv', index=False)

# ==================== 统计计算 ====================
# A. 每个被试 × Block_Type
subj_block = df_clean.groupby(['Subject_ID', 'Block_Type']).agg(
    Mean_RT=('RT', lambda x: x[df_clean.loc[x.index, 'ACC'] == 1].mean()),
    Accuracy=('ACC', 'mean')
).reset_index()
print("\n=== 每个被试每个板块的平均RT和正确率 ===")
print(subj_block.to_string())

# B. 数字/字母定义
digit_stim = ['2', '5', '7']
letter_stim = ['G', 'J', 'R']

df_clean['StimType'] = df_clean['Stimulus'].apply(
    lambda x: 'Digit' if x in digit_stim else ('Letter' if x in letter_stim else 'Other')
)

# 每个被试字母/数字正确率
subj_stimtype = df_clean.groupby(['Subject_ID', 'StimType'])['ACC'].mean().reset_index()
print("\n=== 每个被试字母/数字正确率 ===")
print(subj_stimtype.to_string())

# C. 每个刺激的平均正确率
subj_stim = df_clean.groupby(['Subject_ID', 'Stimulus'])['ACC'].mean().reset_index()
stim_avg = subj_stim.groupby('Stimulus')['ACC'].mean().reset_index()
stim_avg.columns = ['Stimulus', 'Avg_Accuracy']

print("\n=== 每个刺激的平均正确率 ===")
print(stim_avg.to_string())

# D. 每个被试的总平均正确率
subj_total = df_clean.groupby('Subject_ID')['ACC'].mean().reset_index()
subj_total.columns = ['Subject_ID', 'Total_Accuracy']

# ==================== 数据导出 ====================
# 导出数字刺激数据
digit_data = df_clean[df_clean['Stimulus'].isin(digit_stim)]
digit_data.to_csv('data_number.csv', index=False)
print(f"数字刺激数据已保存到 data_number.csv，共 {len(digit_data)} 条")

# 导出字母刺激数据
letter_data = df_clean[df_clean['Stimulus'].isin(letter_stim)]
letter_data.to_csv('data_letter.csv', index=False)
print(f"字母刺激数据已保存到 data_letter.csv，共 {len(letter_data)} 条")

# ==================== 绘图 1：折线图（原图） ====================
subjects = df_clean['Subject_ID'].unique()
order = ['2', '5', '7', 'G', 'J', 'R']

plt.figure(figsize=(7, 5))
colors = plt.cm.tab10.colors
for i, subj in enumerate(subjects):
    subj_data = subj_stim[subj_stim['Subject_ID'] == subj].set_index('Stimulus')
    y = [subj_data.loc[s, 'ACC'] if s in subj_data.index else np.nan for s in order]
    plt.plot(order, y, marker='o', color=colors[i % len(colors)],
             label=f'Subject {subj}', linewidth=1.5, markersize=7)

avg_y = [stim_avg.set_index('Stimulus').loc[s, 'Avg_Accuracy'] if s in stim_avg['Stimulus'].values else np.nan for s in order]
plt.plot(order, avg_y, marker='D', color='black',
         linestyle='--', linewidth=2, markersize=8, label='Average')

plt.axvspan(-0.5, 2.5, facecolor='skyblue', alpha=0.1, label='Digit')
plt.axvspan(2.5, 5.5, facecolor='lightcoral', alpha=0.1, label='Letter')
plt.ylim(0.85, 1.00)
plt.ylabel('Accuracy')
plt.xlabel('Stimulus')
plt.title('Accuracy profile: Digit vs. Letter stimuli')
plt.legend(loc='lower left')
plt.tight_layout()
plt.savefig('accuracy_profile_line.png')   # 保存折线图
plt.show()

# ==================== 绘图 2：条形图（新增） ====================
# 准备条形图数据：每个被试的 Digit / Letter / Total 正确率
bar_data = subj_stimtype.pivot(index='Subject_ID', columns='StimType', values='ACC').reset_index()
bar_data = bar_data.merge(subj_total, on='Subject_ID', how='left')
# 确保列顺序
bar_data = bar_data[['Subject_ID', 'Digit', 'Letter', 'Total_Accuracy']]
# 填充可能缺失的列
for col in ['Digit', 'Letter']:
    if col not in bar_data.columns:
        bar_data[col] = np.nan

print("\n=== 条形图数据 ===")
print(bar_data.to_string())

# 画图
x = np.arange(len(bar_data))  # 被试数量
width = 0.25
fig, ax = plt.subplots(figsize=(8, 5))
ax.bar(x - width, bar_data['Digit'], width, label='Digit', color='skyblue')
ax.bar(x, bar_data['Letter'], width, label='Letter', color='lightcoral')
ax.bar(x + width, bar_data['Total_Accuracy'], width, label='Total', color='gray')

ax.set_ylabel('Accuracy')
ax.set_title('Average Accuracy by Stimulus Type for Each Subject')
ax.set_xticks(x)
ax.set_xticklabels(bar_data['Subject_ID'])
ax.legend()
ax.set_ylim(0.8, 1.0)  # 可根据需要调整
plt.tight_layout()
plt.savefig('accuracy_bar_chart.png')  # 保存条形图
plt.show()