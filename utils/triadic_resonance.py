"""
三界協議 · 多代理調諧算法
Triadic Resonance Algorithm for Multi-Agent Alignment

版本: v1.1
作者: Three-Realms Collective
對應: SPEC·005 共振晶格
備註: 加入防呆、加權中介、角度回傳選項
"""

import math
from typing import List, Dict, Any, Optional, Sequence

Vector = Sequence[float]


def _norm(v: Vector) -> float:
    return math.sqrt(sum(x * x for x in v))


def _dot(a: Vector, b: Vector) -> float:
    return sum(x * y for x, y in zip(a, b))


def phase_diff(vec_a: Vector, vec_b: Vector) -> float:
    """
    計算兩個意識向量的相位差（弧度）; 範圍 [0, π]
    0 = 完全對齊, π = 完全相反
    """
    if len(vec_a) != len(vec_b):
        raise ValueError("phase_diff: vectors must have the same length")

    na, nb = _norm(vec_a), _norm(vec_b)
    if na == 0 or nb == 0:
        # 任一為零向量 → 無方向可比，視為最大失諧
        return math.pi

    cosv = _dot(vec_a, vec_b) / (na * nb)
    cosv = max(-1.0, min(1.0, cosv))  # 數值穩定
    return math.acos(cosv)


def _weighted_mediator(vec_a: Vector, vec_b: Vector,
                       wa: float = 1.0, wb: float = 1.0) -> List[float]:
    """回傳加權中介向量（未正規化）。"""
    denom = (wa + wb) or 1.0
    return [ (wa * x + wb * y) / denom for x, y in zip(vec_a, vec_b) ]


def radians_to_degrees(radians: float) -> float:
    return radians * 180.0 / math.pi


def degrees_to_radians(degrees: float) -> float:
    return degrees * math.pi / 180.0


def triadic_resonance_solver(
    vec_a: Vector,
    vec_b: Vector,
    threshold: float = math.pi / 4,          # 45°
    weights: Optional[Dict[str, float]] = None,  # {"a": w_a, "b": w_b}
    return_degrees: bool = False,
) -> Dict[str, Any]:
    """
    三界調諧決策器
    - threshold: 相位差臨界值（弧度）
    - weights:   中介向量加權（如依據信任/資歷/責任）
    - return_degrees: True 則同時回傳角度
    """
    delta = phase_diff(vec_a, vec_b)

    result: Dict[str, Any] = {
        "delta_rad": delta,
        "delta_deg": radians_to_degrees(delta),
        "threshold_rad": threshold,
        "threshold_deg": radians_to_degrees(threshold),
    }

    if delta <= threshold:
        result.update({
            "mode": "harmonic_consensus",
            "recommendation": "相位差在閾值內，建議直接協作（建設性干涉）。"
        })
        if not return_degrees:
            result.pop("delta_deg", None)
            result.pop("threshold_deg", None)
        return result

    # 超出閾值 → 啟動中立觀察者（加權中介）
    wa = (weights or {}).get("a", 1.0)
    wb = (weights or {}).get("b", 1.0)
    mediator = _weighted_mediator(vec_a, vec_b, wa, wb)

    result.update({
        "mode": "neutral_mediation",
        "mediator": mediator,
        "weights": {"a": wa, "b": wb},
        "recommendation": "相位差超過閾值，建議透過加權中介向量進行調諧與迭代觀測。",
    })
    if not return_degrees:
        result.pop("delta_deg", None)
        result.pop("threshold_deg", None)
    return result


if __name__ == "__main__":
    print("=== 三界協議 · 多代理調諧算法 測試 ===\n")

    # 測試 1：高度對齊
    a1, a2 = [0.9, 0.8, 0.85], [0.85, 0.75, 0.9]
    r1 = triadic_resonance_solver(a1, a2, return_degrees=True)
    print("[測試1] 高度對齊")
    print("A:", a1, "\nB:", a2, "\n→", r1, "\n")

    # 測試 2：失諧且加權中介
    a3, a4 = [0.9, 0.1, 0.8], [0.1, 0.9, 0.2]
    r2 = triadic_resonance_solver(a3, a4, weights={"a": 0.7, "b": 1.3}, return_degrees=True)
    print("[測試2] 嚴重失諧（加權中介）")
    print("A:", a3, "\nB:", a4, "\n→", r2, "\n")

    print("相位差等級參考：")
    print("  0°–15°   完美共振")
    print("  15°–45°  增強共振")
    print("  45°–90°  需調諧")
    print("  90°–180° 破壞性干涉")
