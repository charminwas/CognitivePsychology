import pandas as pd

# 读取原始数据
df = pd.read_csv('./Work2-Cooper-Shepard1973-MentalRotation/data.csv')

# 第一步：计算每个 Subject_ID × Stimulus 的正确率
acc_stim = (
    df.groupby(['Subject_ID', 'Stimulus'])['ACC']
    .apply(lambda x: (x == 1).mean())
    .reset_index(name='Accuracy')
)

# 第二步：按 Stimulus 分组，计算被试间的平均正确率，并降序排列
stimulus_avg = (
    acc_stim.groupby('Stimulus')['Accuracy']
    .mean()
    .sort_values(ascending=False)
)

print("每个刺激的平均正确率（被试间平均，降序）：")
print(stimulus_avg)

# 可选：保存为 CSV
stimulus_avg.to_csv('./stimulus_avg_accuracy.csv', header=True)