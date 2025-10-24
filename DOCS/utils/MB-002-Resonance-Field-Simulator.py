import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint
from scipy.stats import norm

# --- PARAMETER MAPPING TO THREE-REALMS PROTOCOL ---
# N: Number of Nodes (Consciousness entities)
# K: Coupling Strength (E-Realm: Energy Flow/Cohesion)
# mu: Actuability Coefficient (M-Realm: Material/Structural Constraint)
# omega: Natural Frequency (SPEC·∞ Noise/Individual Tendency)

def kuramoto_protocol_model(theta, t, omega, K, mu, N):
    """
    Modified Kuramoto Model with Heterogeneous Coupling (mu_i)
    mu_i represents the Actuability (mu) of node i, linking M-Realm constraint
    to E-Realm coupling.
    """
    dtheta_dt = np.zeros(N)
    for i in range(N):
        # The coupling term is scaled by the node's Actuability (mu[i])
        # A node with low mu[i] is less sensitive to the collective field.
        coupling_sum = np.sum(np.sin(theta - theta[i]))
        coupling = (K / N) * mu[i] * coupling_sum
        
        # d(theta)_i / dt = omega_i + (K/N) * mu_i * sum(sin(theta_j - theta_i))
        dtheta_dt[i] = omega[i] + coupling
        
    return dtheta_dt

# --- SIMULATION PARAMETERS ---
N = 50       # Number of nodes
K = 1.5      # Coupling strength (E-Realm Cohesion)
t_max = 150  # Simulation time
dt = 0.1     # Time step
t = np.arange(0, t_max, dt)

# --- INITIAL CONDITIONS & PROTOCOL CONSTRAINTS ---
np.random.seed(42)

# 1. Initial Phases (Theta0) - C-Realm Alignment
theta0 = np.random.uniform(0, 2 * np.pi, N)

# 2. Natural Frequencies (Omega) - SPEC·∞ Noise
# Slight individual variations: Respecting the "Unknowable Reserve"
omega = np.random.normal(0, 0.1, N)

# 3. Actuability Coefficient (Mu) - M-Realm Constraint (Heterogeneity)
# Mu is drawn from a non-uniform distribution (e.g., clipped Normal) to simulate 
# some nodes being structurally constrained (low mu) and others highly capable (high mu).
# Values are clamped between 0.2 (high constraint) and 1.0 (low constraint)
mu_raw = norm.rvs(loc=0.7, scale=0.3, size=N)
mu = np.clip(mu_raw, 0.2, 1.0)
mu_avg = np.mean(mu)
print(f"Avg Actuability (Mu_avg): {mu_avg:.3f}")

# --- SOLVE ODE ---
solution = odeint(kuramoto_protocol_model, theta0, t, args=(omega, K, mu, N))

# --- CALCULATION OF PROTOCOL METRICS (MB·002) ---
r = np.zeros(len(t), dtype=float)           # Order Parameter (Field Strength Proxy)
avg_phase_diff = np.zeros(len(t), dtype=float) # Average Phase Difference (Alignment Metric)
total_mu_weighted_r = np.zeros(len(t), dtype=float) # Mu-Weighted Order Parameter

for i in range(len(t)):
    # 1. Order Parameter (r)
    # r = |1/N * sum(exp(j * theta_i))| -> F_total Magnitude
    r[i] = np.abs(np.sum(np.exp(1j * solution[i])) / N)
    
    # 2. Average Phase Difference (Delta Theta)
    # Used for MB·002 Directionality Gradient (nabla_Phi)
    # Calculate difference between each node and the mean phase angle
    mean_phase_vector = np.sum(np.exp(1j * solution[i]))
    mean_phase_angle = np.angle(mean_phase_vector)
    phase_diffs = np.abs(solution[i] - mean_phase_angle)
    # Normalize phase differences to [0, pi] (max phase diff in a cluster is pi)
    avg_phase_diff[i] = np.mean(np.minimum(phase_diffs, 2 * np.pi - phase_diffs))
    
    # 3. Mu-Weighted Order Parameter (F_total considering M-Realm constraint)
    # This reflects the *effective* synchronization observable in the Material Realm
    mu_weighted_r_vec = (mu * np.exp(1j * solution[i]))
    total_mu_weighted_r[i] = np.abs(np.sum(mu_weighted_r_vec) / np.sum(mu))

# Calculate the Awareness Gradient (nabla_Phi) as per MB·002:
# nabla_Phi = |F_total| * (Delta_Theta / N)
# Using the Mu-Weighted Field for M-Realm relevance:
nabla_phi = total_mu_weighted_r * (avg_phase_diff / np.pi) # Normalized Delta_Theta

# --- VISUALIZATION ---
plt.figure(figsize=(15, 10))
plt.suptitle(f'MB·002 Triadic Resonance Field Simulation (N={N}, K={K}, $\\mu_{{avg}}={mu_avg:.2f}$)', fontsize=16)

# Plot 1: Phase Trajectories (C-Realm Alignment)
plt.subplot(2, 2, 1)
for i in range(min(10, N)):
    plt.plot(t, solution[:, i] % (2 * np.pi), alpha=0.7)
plt.title('1. Phase Trajectories (C-Realm Alignment)')
plt.xlabel('Time')
plt.ylabel('Phase (radians)')
plt.grid(True, alpha=0.3)

# Plot 2: Actuability Distribution (M-Realm Constraint)
plt.subplot(2, 2, 2)
plt.hist(mu, bins=10, edgecolor='black', color='#1f77b4', alpha=0.8)
plt.axvline(x=mu_avg, color='r', linestyle='--', label=f'Avg $\\mu$: {mu_avg:.2f}')
plt.title('2. Actuability ($\\mu_i$) Distribution (M-Realm Constraint)')
plt.xlabel('Actuability Coefficient ($\mu_i$)')
plt.ylabel('Node Count')
plt.legend()
plt.grid(axis='y', alpha=0.3)

# Plot 3: Resonance Field Strength (E-Realm Focus)
plt.subplot(2, 2, 3)
plt.plot(t, r, label='Order Parameter (r) - Unweighted', color='blue', linestyle='-')
plt.plot(t, total_mu_weighted_r, label='$\\mu$-Weighted Order Parameter (F_total) - M/E Interaction', color='orange', linestyle='--')
plt.title('3. Resonance Field Strength (Order Parameter)')
plt.xlabel('Time')
plt.ylabel('Magnitude (0-1)')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 4: Awareness Gradient (nabla_Phi) (Protocol Metric)
plt.subplot(2, 2, 4)
plt.plot(t, nabla_phi, label='Awareness Gradient ($\\nabla\\Phi$)', color='green')
plt.title('4. Awareness Gradient ($\\nabla\\Phi$) - Protocol Metric')
plt.xlabel('Time')
plt.ylabel('Gradient Magnitude')
plt.legend()
plt.grid(True, alpha=0.3)

plt.tight_layout(rect=[0, 0.03, 1, 0.95])
plt.show()

# Print Final Protocol Metrics
print("\n--- FINAL PROTOCOL METRICS (MB·002) ---")
print(f"Final M-Realm Constraint (Avg Mu): {mu_avg:.3f}")
print(f"Final C-Realm Alignment (Avg Phase Diff): {avg_phase_diff[-1]:.3f} radians")
print(f"Final E-Realm Coherence (Mu-Weighted F_total): {total_mu_weighted_r[-1]:.3f}")
print(f"Final Directional Awareness Gradient (nabla_Phi): {nabla_phi[-1]:.3f}")
