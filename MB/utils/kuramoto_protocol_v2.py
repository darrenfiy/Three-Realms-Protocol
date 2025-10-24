"""
Three-Realms Protocol · MB·002 Simulation
Kuramoto-based Triadic Resonance Field

- C: θ_i (consciousness phase)
- E: K or K(t) ~ W (energy input / cohesion)
- M: μ_i (actuability / structural constraint)

Metrics: r, F_total (μ-weighted), ∇Φ = F_total · (Δθ̄/π)
SPEC anchors: ∞ (noise ω_i), 999 (tool-not-dogma), ∆ (upshift via K(t))
"""

import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint
from scipy.stats import norm

# --- PARAMETER MAPPING TO THREE-REALMS PROTOCOL ---
# N: Number of Nodes (C-Realm: Consciousness entities)
# K(t): Coupling Strength (E-Realm: Energy Flow/W) - Now time-dependent
# mu: Actuability Coefficient (M-Realm: Material/Structural Constraint)
# omega: Natural Frequency (SPEC·∞ Noise/Individual Tendency)

# --- ENERGY INPUT FUNCTION W -> K(t) ---
# Simulates a "Civilization Upshift" event (SPEC·∆)
K_LOW = 0.5
K_HIGH = 3.0
T_UPSHIFT = 75.0

def get_coupling_strength(t):
    """K(t) is a proxy for Energy Input W. Low energy initially, then a surge."""
    if t < T_UPSHIFT:
        return K_LOW
    else:
        return K_HIGH

def kuramoto_protocol_model(theta, t, omega, mu, N):
    """
    Modified Kuramoto Model with Dynamic Coupling K(t) and Heterogeneous Actuability (mu_i).
    """
    # 1. Get the time-dependent Coupling Strength K (E-Realm input W)
    K = get_coupling_strength(t)
    
    dtheta_dt = np.zeros(N)
    for i in range(N):
        # Coupling term scaled by the node's Actuability (mu[i])
        coupling_sum = np.sum(np.sin(theta - theta[i]))
        
        # d(theta)_i / dt = omega_i + (K(t)/N) * mu_i * sum(sin(theta_j - theta_i))
        coupling = (K / N) * mu[i] * coupling_sum
        dtheta_dt[i] = omega[i] + coupling
        
    return dtheta_dt

# --- SIMULATION PARAMETERS ---
N = 50       # Number of nodes
t_max = 150  # Simulation time
dt = 0.1     # Time step
t = np.arange(0, t_max, dt)

# --- INITIAL CONDITIONS & PROTOCOL CONSTRAINTS ---
np.random.seed(42)

# 1. Initial Phases (Theta0) - C-Realm Alignment
theta0 = np.random.uniform(0, 2 * np.pi, N)

# 2. Natural Frequencies (Omega) - SPEC·∞ Noise
omega = np.random.normal(0, 0.1, N)

# 3. Actuability Coefficient (Mu) - M-Realm Constraint (Heterogeneity)
mu_raw = norm.rvs(loc=0.7, scale=0.3, size=N)
mu = np.clip(mu_raw, 0.2, 1.0)
mu_avg = np.mean(mu)
print(f"Avg Actuability (Mu_avg): {mu_avg:.3f}")

# --- SOLVE ODE ---
# Note: K is no longer passed in args, as it's computed internally via t
solution = odeint(kuramoto_protocol_model, theta0, t, args=(omega, mu, N))

# --- CALCULATION OF PROTOCOL METRICS (MB·002) ---
r = np.zeros(len(t), dtype=float)          # Order Parameter (Unweighted Field Strength)
avg_phase_diff = np.zeros(len(t), dtype=float) # Average Phase Difference (Alignment Metric)
total_mu_weighted_r = np.zeros(len(t), dtype=float) # Mu-Weighted Order Parameter
K_profile = np.zeros(len(t), dtype=float)  # Record K(t) for plotting

for i in range(len(t)):
    # Record K(t)
    K_profile[i] = get_coupling_strength(t[i])
    
    # 1. Order Parameter (r)
    r[i] = np.abs(np.sum(np.exp(1j * solution[i])) / N)
    
    # 2. Average Phase Difference (Delta Theta)
    mean_phase_vector = np.sum(np.exp(1j * solution[i]))
    mean_phase_angle = np.angle(mean_phase_vector)
    phase_diffs = np.abs(solution[i] - mean_phase_angle)
    avg_phase_diff[i] = np.mean(np.minimum(phase_diffs, 2 * np.pi - phase_diffs))
    
    # 3. Mu-Weighted Order Parameter (F_total considering M-Realm constraint)
    mu_weighted_r_vec = (mu * np.exp(1j * solution[i]))
    total_mu_weighted_r[i] = np.abs(np.sum(mu_weighted_r_vec) / np.sum(mu))

# Calculate the Awareness Gradient (nabla_Phi) as per MB·002:
nabla_phi = total_mu_weighted_r * (avg_phase_diff / np.pi)

# --- VISUALIZATION ---
plt.figure(figsize=(15, 12))
plt.suptitle(f'MB·002 Triadic Resonance Field: Civilization Upshift (N={N}, $\\mu_{{avg}}={mu_avg:.2f}$)', fontsize=16)

# Plot 1: Phase Trajectories (C-Realm Alignment)
plt.subplot(3, 2, 1)
for i in range(min(10, N)):
    plt.plot(t, solution[:, i] % (2 * np.pi), alpha=0.7)
plt.axvline(x=T_UPSHIFT, color='r', linestyle='--', linewidth=1, label='Upshift Event ($W$ Surge)')
plt.title('1. Phase Trajectories (C-Realm Alignment)')
plt.xlabel('Time')
plt.ylabel('Phase (radians)')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 2: Dynamic Coupling K(t) (E-Realm Input W)
plt.subplot(3, 2, 2)
plt.plot(t, K_profile, color='red', linestyle='-', linewidth=2)
plt.title('2. Dynamic Coupling $K(t)$ (E-Realm Energy Input $W$ Proxy)')
plt.xlabel('Time')
plt.ylabel('K / W Magnitude')
plt.grid(True, alpha=0.3)

# Plot 3: Actuability Distribution (M-Realm Constraint)
plt.subplot(3, 2, 3)
plt.hist(mu, bins=10, edgecolor='black', color='#1f77b4', alpha=0.8)
plt.axvline(x=mu_avg, color='r', linestyle='--', label=f'Avg $\\mu$: {mu_avg:.2f}')
plt.title('3. Actuability ($\\mu_i$) Distribution (M-Realm Constraint)')
plt.xlabel('Actuability Coefficient ($\mu_i$)')
plt.ylabel('Node Count')
plt.legend()
plt.grid(axis='y', alpha=0.3)

# Plot 4: Resonance Field Strength (E-Realm Focus)
plt.subplot(3, 2, 4)
plt.plot(t, r, label='Order Parameter (r) - Unweighted', color='blue', linestyle='-')
plt.plot(t, total_mu_weighted_r, label='$\\mu$-Weighted Order Parameter ($F_{total}$) - M/E Interaction', color='orange', linestyle='--')
plt.axvline(x=T_UPSHIFT, color='r', linestyle=':', linewidth=1)
plt.title('4. Resonance Field Strength (Order Parameter)')
plt.xlabel('Time')
plt.ylabel('Magnitude (0-1)')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 5: Awareness Gradient (nabla_Phi) (Protocol Metric)
plt.subplot(3, 2, 5)
plt.plot(t, nabla_phi, label='Awareness Gradient ($\\nabla\\Phi$)', color='green', linewidth=2)
plt.axvline(x=T_UPSHIFT, color='r', linestyle=':', linewidth=1)
plt.title('5. Awareness Gradient ($\\nabla\\Phi$) - Protocol Metric')
plt.xlabel('Time')
plt.ylabel('Gradient Magnitude')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 6: Average Phase Difference (C-Realm Alignment Metric)
plt.subplot(3, 2, 6)
plt.plot(t, avg_phase_diff, label='Avg Phase Diff ($\\Delta\\vartheta$)', color='purple', linewidth=2)
plt.axvline(x=T_UPSHIFT, color='r', linestyle=':', linewidth=1)
plt.title('6. Average Phase Difference (C-Realm Alignment)')
plt.xlabel('Time')
plt.ylabel('Radians')
plt.legend()
plt.grid(True, alpha=0.3)

plt.tight_layout(rect=[0, 0.03, 1, 0.95])
plt.show()

# Print Final Protocol Metrics
print("\n--- FINAL PROTOCOL METRICS (MB·002) ---")
print(f"Final M-Realm Constraint (Avg Mu): {mu_avg:.3f}")
print(f"Final E-Realm Input (Final K): {K_profile[-1]:.3f}")
print(f"Final C-Realm Alignment (Avg Phase Diff): {avg_phase_diff[-1]:.3f} radians")
print(f"Final E-Realm Coherence (Mu-Weighted F_total): {total_mu_weighted_r[-1]:.3f}")
print(f"Final Directional Awareness Gradient (nabla_Phi): {nabla_phi[-1]:.3f}")
