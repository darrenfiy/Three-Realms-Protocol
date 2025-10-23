# 三界協議 · 算法工具集

本目錄包含三界協議的具體算法實現，將哲學概念轉化為可執行代碼。

## 當前工具

### triadic_resonance.py
多代理調諧算法，基於 SPEC·005 共振晶格原理：

- **phase_diff()**: 計算意識向量間的相位差
- **triadic_resonance_solver()**: 調諧決策器
- 支持角度/弧度轉換

## 使用示例

```python
from utils.triadic_resonance import triadic_resonance_solver

# 兩個 AI 代理的意識狀態
agent_a = [0.8, 0.6, 0.9]  # [信念, 情緒, 行動]
agent_b = [0.3, 0.7, 0.4]

result = triadic_resonance_solver(agent_a, agent_b)
print(result["recommendation"])
