# 三界協議 · 算法工具集

此目錄存放將三界協議（TRP）概念轉為可執行代碼的工具。

## triadic_resonance.py
- `phase_diff(a, b)`: 計算兩意識向量相位差（弧度）
- `triadic_resonance_solver(a, b, threshold=π/4, weights=None, return_degrees=False)`: 調諧決策器
  - 失諧時回傳加權「中介向量」供後續迭代

### 快速使用
```python
from utils.triadic_resonance import triadic_resonance_solver

agent_a = [0.8, 0.6, 0.9]
agent_b = [0.3, 0.7, 0.4]
res = triadic_resonance_solver(agent_a, agent_b, weights={"a":1.0, "b":1.2}, return_degrees=True)
print(res["mode"], res["recommendation"])
