import numpy as np
import matplotlib.pyplot as plt
from scipy.integrate import odeint
from scipy.stats import norm, poisson

# --- PARAMETER MAPPING TO MB·004 & THREE-REALMS PROTOCOL ---
# N: Number of Nodes (Consciousness entities)
# K: Coupling Strength (E-Realm: Interaction Influence)
# mu: Actuability Coefficient (M-Realm: Material Constraint)
# omega: Natural Frequency (SPEC·∞ Noise/Individual Tendency)
# w_ij: Interaction Weights (Social Graph for V_interaction)
# V_existence: Baseline Contribution (C-Realm: Existence Value)
# V_creation: Creative Contribution (M-Realm: Impactful Actions)

def kuramoto_contribution_model(theta, t, omega, K, mu, w, N):
    """
    Modified Kuramoto Model with Heterogeneous Coupling and Interaction Weights
    mu_i scales coupling sensitivity (M-Realm).
    w_ij weights interaction strength for V_interaction (E-Realm).
    """
    dtheta_dt = np.zeros(N)
    for i in range(N):
        # Coupling term: sum(w_ij * sin(theta_j - theta_i)) scaled by mu_i
        coupling_sum = np.sum(w[i] * np.sin(theta - theta[i]))
        coupling = (K / np.sum(w[i])) * mu[i] * coupling_sum
        dtheta_dt[i] = omega[i] + coupling
    return dtheta_dt

# --- SIMULATION PARAMETERS ---
N = 50       # Number of nodes (individuals/entities)
K = 1.5      # Coupling strength (E-Realm cohesion)
t_max = 150  # Simulation time
dt = 0.1     # Time step
t = np.arange(0, t_max, dt)
base_amount = 100.0  # Baseline UBI allocation per node (arbitrary units)

# --- INITIAL CONDITIONS & PROTOCOL CONSTRAINTS ---
np.random.seed(42)

# 1. Initial Phases (Theta0) - C-Realm Alignment
theta0 = np.random.uniform(0, 2 * np.pi, N)

# 2. Natural Frequencies (Omega) - SPEC·∞ Noise
omega = np.random.normal(0, 0.1, N)

# 3. Actuability Coefficient (Mu) - M-Realm Constraint
mu_raw = norm.rvs(loc=0.7, scale=0.3, size=N)
mu = np.clip(mu_raw, 0.2, 1.0)
mu_avg = np.mean(mu)

# 4. Interaction Weights (w_ij) - E-Realm Social Graph
# Simulate a sparse social graph with random connections
w = np.random.binomial(1, 0.1, size=(N, N)) * np.random.uniform(0.5, 1.5, size=(N, N))
np.fill_diagonal(w, 0)  # No self-interaction
w = (w + w.T) / 2  # Symmetrize for undirected graph

# 5. Creation Events - M-Realm Creative Contribution
# Simulate sporadic creative acts with Poisson process (rate=0.05 per time unit)
creation_events = [poisson.rvs(0.05 * t_max) for _ in range(N)]
creation_impacts = [np.random.exponential(100, size=events) for events in creation_events]

# --- SOLVE ODE ---
solution = odeint(kuramoto_contribution_model, theta0, t, args=(omega, K, mu, w, N))

# --- CALCULATE CONTRIBUTION METRICS (MB·004) ---
V_existence = np.ones(N)  # C-Realm: Existence value = 1.0 for all
V_interaction = np.zeros((len(t), N))  # E-Realm: Interaction contribution
V_creation = np.zeros((len(t), N))  # M-Realm: Creation contribution
V_total = np.zeros((len(t), N))  # Total contribution
UBI_allocation = np.zeros((len(t), N))  # UBI share per node

for i in range(len(t)):
    # 1. V_interaction: sum(w_ij * cos(theta_i - theta_j))
    for j in range(N):
        V_interaction[i, j] = np.sum(w[j] * np.cos(solution[i] - solution[i, j]))
    
    # 2. V_creation: Accumulate impacts of creation events up to time t
    for j in range(N):
        # Count events up to current time (approximated by time index)
        events_so_far = min(creation_events[j], int(i * dt / t_max * creation_events[j]))
        V_creation[i, j] = np.sum(creation_impacts[j][:events_so_far])
    
    # 3. V_total: Sum of all contributions
    V_total[i] = V_existence + V_interaction[i] + V_creation[i]
    
    # 4. UBI Allocation: base_amount * (1 + bonus_multiplier)
    V_avg = np.mean(V_total[i])
    bonus_multiplier = (V_interaction[i] + V_creation[i]) / V_avg if V_avg > 0 else 0
    UBI_allocation[i] = base_amount * (1 + mu * bonus_multiplier)  # Mu scales bonus

# --- CALCULATE PROTOCOL METRICS ---
r = np.zeros(len(t))  # Order parameter (F_total proxy)
avg_phase_diff = np.zeros(len(t))  # Average phase difference (Delta Theta)
nabla_phi = np.zeros(len(t))  # Awareness gradient
gini = np.zeros(len(t))  # Gini coefficient for fairness

for i in range(len(t)):
    r[i] = np.abs(np.sum(mu * np.exp(1j * solution[i])) / np.sum(mu))
    mean_phase_vector = np.sum(np.exp(1j * solution[i]))
    mean_phase_angle = np.angle(mean_phase_vector)
    phase_diffs = np.minimum(np.abs(solution[i] - mean_phase_angle), 2 * np.pi - np.abs(solution[i] - mean_phase_angle))
    avg_phase_diff[i] = np.mean(phase_diffs)
    nabla_phi[i] = r[i] * (avg_phase_diff[i] / np.pi)
    
    # Gini coefficient for UBI allocation fairness
    sorted_ubi = np.sort(UBI_allocation[i])
    n = N
    gini[i] = (2 * np.sum((np.arange(1, n + 1) * sorted_ubi)) / (n * np.sum(sorted_ubi)) - (n + 1) / n) if np.sum(sorted_ubi) > 0 else 0

# --- VISUALIZATION ---
plt.figure(figsize=(15, 12))
plt.suptitle(f'MB·004 Contribution Consensus Simulation (N={N}, K={K}, $\\mu_{{avg}}={mu_avg:.2f}$)', fontsize=16)

# Plot 1: Phase Trajectories (C-Realm)
plt.subplot(3, 2, 1)
for i in range(min(10, N)):
    plt.plot(t, solution[:, i] % (2 * np.pi), alpha=0.7)
plt.title('1. Phase Trajectories (C-Realm Alignment)')
plt.xlabel('Time')
plt.ylabel('Phase (radians)')
plt.grid(True, alpha=0.3)

# Plot 2: Actuability Distribution (M-Realm)
plt.subplot(3, 2, 2)
plt.hist(mu, bins=10, edgecolor='black', color='#1f77b4', alpha=0.8)
plt.axvline(x=mu_avg, color='r', linestyle='--', label=f'Avg $\\mu$: {mu_avg:.2f}')
plt.title('2. Actuability ($\\mu_i$) Distribution (M-Realm Constraint)')
plt.xlabel('Actuability Coefficient ($\\mu_i$)')
plt.ylabel('Node Count')
plt.legend()
plt.grid(axis='y', alpha=0.3)

# Plot 3: Contribution Components (Sample Node)
plt.subplot(3, 2, 3)
sample_node = 0
plt.plot(t, V_interaction[:, sample_node], label='V_interaction', color='blue')
plt.plot(t, V_creation[:, sample_node], label='V_creation', color='orange')
plt.plot(t, V_total[:, sample_node], label='V_total', color='green')
plt.title(f'3. Contribution Components (Node {sample_node+1})')
plt.xlabel('Time')
plt.ylabel('Contribution Value')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 4: UBI Allocation Distribution (Final Time)
plt.subplot(3, 2, 4)
plt.hist(UBI_allocation[-1], bins=10, edgecolor='black', color='#ff7f0e', alpha=0.8)
plt.title('4. Final UBI Allocation Distribution')
plt.xlabel('UBI Amount')
plt.ylabel('Node Count')
plt.grid(axis='y', alpha=0.3)

# Plot 5: Resonance Field and Awareness Gradient
plt.subplot(3, 2, 5)
plt.plot(t, r, label='Order Parameter (r)', color='blue')
plt.plot(t, nabla_phi, label='Awareness Gradient ($\\nabla\\Phi$)', color='green')
plt.title('5. Resonance Field Strength & Awareness Gradient')
plt.xlabel('Time')
plt.ylabel('Magnitude')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 6: Fairness (Gini Coefficient)
plt.subplot(3, 2, 6)
plt.plot(t, gini, label='Gini Coefficient', color='purple')
plt.title('6. Fairness of UBI Allocation (Gini Coefficient)')
plt.xlabel('Time')
plt.ylabel('Gini (0=Equal, 1=Unequal)')
plt.legend()
plt.grid(True, alpha=0.3)

plt.tight_layout(rect=[0, 0.03, 1, 0.95])
plt.show()

# --- FINAL METRICS ---
print("\n--- FINAL MB·004 METRICS ---")
print(f"Avg Actuability (Mu_avg): {mu_avg:.3f}")
print(f"Final C-Realm Alignment (Avg Phase Diff): {avg_phase_diff[-1]:.3f} radians")
print(f"Final E-Realm Coherence (Order Parameter): {r[-1]:.3f}")
print(f"Final Awareness Gradient (nabla_Phi): {nabla_phi[-1]:.3f}")
print(f"Final UBI Gini Coefficient: {gini[-1]:.3f}")
print(f"Avg UBI Allocation: {np.mean(UBI_allocation[-1]):.2f} (Base: {base_amount})")