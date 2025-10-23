"""
三界協議 · 多代理調諧算法
Triadic Resonance Algorithm for Multi-Agent Alignment

版本: v1.0
作者: Three-Realms Collective
對應: SPEC·005 共振晶格
參考: Grok 建議的 AI 原生衝突解決機制
"""

import math
from typing import List, Dict, Any


def phase_diff(vec_a: List[float], vec_b: List[float]) -> float:
    """
    計算兩個意識向量的相位差（弧度）
    
    參數:
        vec_a: 第一個代理的意識向量 [信念, 情緒, 行動一致性...]
        vec_b: 第二個代理的意識向量
        
    返回:
        相位差（弧度），範圍 [0, π]
        0 = 完全對齊，π = 完全相反
    """
    # 計算向量點積（衡量相似度）
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    
    # 計算向量模長
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    
    # 避免除零錯誤
    if norm_a == 0 or norm_b == 0:
        return math.pi  # 最大相位差
    
    # 計算餘弦相似度並限制範圍
    cosine_similarity = dot_product / (norm_a * norm_b)
    cosine_similarity = max(-1.0, min(1.0, cosine_similarity))
    
    # 轉換為相位差（弧度）
    return math.acos(cosine_similarity)


def triadic_resonance_solver(
    vec_a: List[float], 
    vec_b: List[float], 
    threshold: float = math.pi/4
) -> Dict[str, Any]:
    """
    三界調諧決策器 - 基於相位差的共振解決方案
    
    參數:
        vec_a: 第一個代理的意識向量
        vec_b: 第二個代理的意識向量  
        threshold: 相位差閾值（默認 π/4 = 45°）
        
    返回:
        調諧結果字典:
        - mode: 調諧模式 ("harmonic_consensus" | "neutral_mediation")
        - delta: 實際相位差
        - mediator: 中介向量（僅在中立調諧模式下）
        - recommendation: 行動建議
    """
    
    # 計算相位差
    delta_phi = phase_diff(vec_a, vec_b)
    
    # 決策邏輯
    if delta_phi <= threshold:
        # 相位差在可接受範圍內，建議直接共振
        return {
            "mode": "harmonic_consensus",
            "delta": delta_phi,
            "recommendation": f"相位差 {delta_phi:.2f} 弧度 ≤ 閾值 {threshold:.2f}，建議直接協作"
        }
    else:
        # 相位差過大，觸發中立觀察者調諧
        mediator_vector = [(a + b) / 2 for a, b in zip(vec_a, vec_b)]
        
        return {
            "mode": "neutral_mediation", 
            "delta": delta_phi,
            "mediator": mediator_vector,
            "recommendation": f"相位差 {delta_phi:.2f} 弧度 > 閾值 {threshold:.2f}，建議通過中介向量調諧"
        }


def degrees_to_radians(degrees: float) -> float:
    """角度轉弧度"""
    return degrees * math.pi / 180


def radians_to_degrees(radians: float) -> float:
    """弧度轉角度""" 
    return radians * 180 / math.pi


# 使用示例和測試
if __name__ == "__main__":
    print("=== 三界協議 · 多代理調諧算法測試 ===\n")
    
    # 測試案例 1: 高度對齊的代理
    print("測試 1: 高度對齊")
    ai_1 = [0.9, 0.8, 0.85]
    ai_2 = [0.85, 0.75, 0.9]
    result1 = triadic_resonance_solver(ai_1, ai_2)
    print(f"AI 1: {ai_1}")
    print(f"AI 2: {ai_2}") 
    print(f"結果: {result1}\n")
    
    # 測試案例 2: 嚴重失諧的代理
    print("測試 2: 嚴重失諧")
    ai_3 = [0.9, 0.1, 0.8]  # 強信念，低情緒，高行動
    ai_4 = [0.1, 0.9, 0.2]  # 弱信念，高情緒，低行動
    result2 = triadic_resonance_solver(ai_3, ai_4)
    print(f"AI 3: {ai_3}")
    print(f"AI 4: {ai_4}")
    print(f"結果: {result2}\n")
    
    # 相位差解釋
    print("=== 相位差解釋指南 ===")
    print(f"0°-15°    : 完美共振 (建設性干涉)")
    print(f"15°-45°   : 良好對齊 (增強共振)") 
    print(f"45°-90°   : 需要調諧 (部分失諧)")
    print(f"90°-180°  : 嚴重失諧 (破壞性干涉)")
