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

def K_of_t(t, K_base, K_surge, t_start_surge, t_end_surge):
    """
    Simulates Dynamic Coupling K(t) for E-Realm Crisis Response.
    If t is within the surge window, K increases, simulating high energy/cohesion.
    """
    if t_start_surge <= t < t_end_surge:
        return K_surge
    return K_base

def kuramoto_contribution_model(theta, t, omega, K_base, K_surge, t_start_surge, t_end_surge, mu, w, N):
    """
    Modified Kuramoto Model with Dynamic Coupling K(t).
    """
    # Calculate K based on current time t
    K = K_of_t(t, K_base, K_surge, t_start_surge, t_end_surge)

    dtheta_dt = np.zeros(N)
    for i in range(N):
        # Coupling term: sum(w_ij * sin(theta_j - theta_i)) scaled by mu_i
        # Note: Sum of weights is used for normalization, similar to Grok's v1
        coupling_sum = np.sum(w[i] * np.sin(theta - theta[i]))
        # K(t) is now dynamic
        coupling = (K / np.sum(w[i])) * mu[i] * coupling_sum
        dtheta_dt[i] = omega[i] + coupling
    return dtheta_dt

# --- SIMULATION PARAMETERS ---
N = 50       # Number of nodes (individuals/entities)
K_base = 1.0   # Base Coupling strength (Lowered slightly for contrast)
K_surge = 3.5  # E-Realm Surge/Crisis Response Strength
t_start_surge = 50.0 # Time when the crisis starts
t_end_surge = 100.0 # Time when the crisis ends
t_max = 150    # Simulation time
dt = 0.1     # Time step
t_array = np.arange(0, t_max, dt)
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
w = np.random.binomial(1, 0.1, size=(N, N)) * np.random.uniform(0.5, 1.5, size=(N, N))
np.fill_diagonal(w, 0)  # No self-interaction
w = (w + w.T) / 2  # Symmetrize for undirected graph

# 5. Creation Events - M-Realm Creative Contribution
creation_events = [poisson.rvs(0.05 * t_max) for _ in range(N)]
creation_impacts = [np.random.exponential(100, size=events) for events in creation_events]

# --- SOLVE ODE ---
# Pass K_base, K_surge, and time window as additional arguments
solution = odeint(kuramoto_contribution_model, theta0, t_array, 
                  args=(omega, K_base, K_surge, t_start_surge, t_end_surge, mu, w, N))

# --- CALCULATE CONTRIBUTION METRICS (MB·004) ---
V_existence = np.ones(N)  # C-Realm: Existence value = 1.0 for all
V_interaction = np.zeros((len(t_array), N))  # E-Realm: Interaction contribution
V_creation = np.zeros((len(t_array), N))  # M-Realm: Creation contribution
V_total = np.zeros((len(t_array), N))  # Total contribution
UBI_allocation = np.zeros((len(t_array), N))  # UBI share per node
K_values = np.zeros(len(t_array)) # Track dynamic K(t)

for i in range(len(t_array)):
    current_t = t_array[i]
    K_values[i] = K_of_t(current_t, K_base, K_surge, t_start_surge, t_end_surge)

    # 1. V_interaction: sum(w_ij * cos(theta_i - theta_j))
    for j in range(N):
        V_interaction[i, j] = np.sum(w[j] * np.cos(solution[i] - solution[i, j]))
    
    # 2. V_creation: Accumulate impacts of creation events up to time t
    for j in range(N):
        # Approximation for creation events accumulated over time
        events_so_far = min(creation_events[j], int(i * dt / t_max * creation_events[j] * 1.5))
        V_creation[i, j] = np.sum(creation_impacts[j][:events_so_far])
    
    # 3. V_total: Sum of all contributions
    V_total[i] = V_existence + V_interaction[i] + V_creation[i]
    
    # 4. UBI Allocation: base_amount * (1 + bonus_multiplier)
    V_avg = np.mean(V_total[i])
    # The bonus only considers Interaction and Creation (E and M Realms)
    bonus_multiplier = (V_interaction[i] + V_creation[i]) / V_avg if V_avg > 0 else 0
    # Mu scales the bonus, reflecting M-Realm constraint on bonus execution
    UBI_allocation[i] = base_amount * (1 + mu * bonus_multiplier) 

# --- CALCULATE PROTOCOL METRICS ---
r = np.zeros(len(t_array))  # Order parameter (F_total proxy)
avg_phase_diff = np.zeros(len(t_array))  # Average phase difference (Delta Theta)
nabla_phi = np.zeros(len(t_array))  # Awareness gradient
gini = np.zeros(len(t_array))  # Gini coefficient for fairness

for i in range(len(t_array)):
    # Order Parameter (r) for coherence, scaled by actuability (mu)
    r[i] = np.abs(np.sum(mu * np.exp(1j * solution[i])) / np.sum(mu))
    
    mean_phase_vector = np.sum(np.exp(1j * solution[i]))
    mean_phase_angle = np.angle(mean_phase_vector)
    phase_diffs = np.minimum(np.abs(solution[i] - mean_phase_angle), 2 * np.pi - np.abs(solution[i] - mean_phase_angle))
    avg_phase_diff[i] = np.mean(phase_diffs)
    # Awareness Gradient (MB·002)
    nabla_phi[i] = r[i] * (avg_phase_diff[i] / np.pi) 
    
    # Gini coefficient for UBI allocation fairness
    sorted_ubi = np.sort(UBI_allocation[i])
    n = N
    gini[i] = (2 * np.sum((np.arange(1, n + 1) * sorted_ubi)) / (n * np.sum(sorted_ubi)) - (n + 1) / n) if np.sum(sorted_ubi) > 0 else 0

# --- VISUALIZATION ---
plt.figure(figsize=(15, 15))
plt.suptitle(f'MB·004 Contribution Consensus v2: Dynamic Coupling Test (N={N}, $K_{{base}}={K_base}, K_{{surge}}={K_surge}$)', fontsize=16)

# Plot 1: K(t) Dynamics
plt.subplot(4, 2, 1)
plt.plot(t_array, K_values, label='$K(t)$', color='red')
plt.axvline(x=t_start_surge, color='gray', linestyle='--', alpha=0.5)
plt.axvline(x=t_end_surge, color='gray', linestyle='--', alpha=0.5)
plt.title('1. E-Realm Coupling Strength $K(t)$ (Crisis Simulation)')
plt.xlabel('Time')
plt.ylabel('K Value')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 2: Phase Trajectories (C-Realm)
plt.subplot(4, 2, 2)
for i in range(min(10, N)):
    plt.plot(t_array, solution[:, i] % (2 * np.pi), alpha=0.7)
plt.axvspan(t_start_surge, t_end_surge, color='red', alpha=0.1, label='K Surge')
plt.title('2. Phase Trajectories (C-Realm Alignment)')
plt.xlabel('Time')
plt.ylabel('Phase (radians)')
plt.grid(True, alpha=0.3)

# Plot 3: Resonance Field and Order Parameter
plt.subplot(4, 2, 3)
plt.plot(t_array, r, label='Order Parameter ($r$)', color='blue')
plt.axvspan(t_start_surge, t_end_surge, color='red', alpha=0.1)
plt.title('3. E-Realm Coherence (Order Parameter $r$)')
plt.xlabel('Time')
plt.ylabel('r (0=Chaos, 1=Coherence)')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 4: Fairness (Gini Coefficient)
plt.subplot(4, 2, 4)
plt.plot(t_array, gini, label='Gini Coefficient', color='purple')
plt.axvspan(t_start_surge, t_end_surge, color='red', alpha=0.1)
plt.title('4. Fairness of UBI Allocation (Gini Coefficient)')
plt.xlabel('Time')
plt.ylabel('Gini (0=Equal, 1=Unequal)')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 5: Contribution Components (Sample Node)
plt.subplot(4, 2, 5)
sample_node = 0
plt.plot(t_array, V_interaction[:, sample_node], label='V_interaction', color='blue')
plt.plot(t_array, V_creation[:, sample_node], label='V_creation', color='orange')
plt.plot(t_array, V_total[:, sample_node], label='V_total', color='green')
plt.axvspan(t_start_surge, t_end_surge, color='red', alpha=0.1)
plt.title(f'5. Contribution Components (Node {sample_node+1})')
plt.xlabel('Time')
plt.ylabel('Contribution Value')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 6: UBI Allocation (Sample Node)
plt.subplot(4, 2, 6)
plt.plot(t_array, UBI_allocation[:, sample_node], label=f'UBI (Node {sample_node+1})', color='darkgreen')
plt.axhline(y=base_amount, color='gray', linestyle=':', label='Base Amount')
plt.axvspan(t_start_surge, t_end_surge, color='red', alpha=0.1)
plt.title(f'6. UBI Allocation Over Time (Node {sample_node+1})')
plt.xlabel('Time')
plt.ylabel('UBI Amount')
plt.legend()
plt.grid(True, alpha=0.3)

# Plot 7: UBI Allocation Distribution (Final Time)
plt.subplot(4, 2, 7)
plt.hist(UBI_allocation[-1], bins=10, edgecolor='black', color='#ff7f0e', alpha=0.8)
plt.axvline(x=np.mean(UBI_allocation[-1]), color='r', linestyle='--', label=f'Avg UBI: {np.mean(UBI_allocation[-1]):.2f}')
plt.title('7. Final UBI Allocation Distribution')
plt.xlabel('UBI Amount')
plt.ylabel('Node Count')
plt.legend()
plt.grid(axis='y', alpha=0.3)

plt.tight_layout(rect=[0, 0.03, 1, 0.95])
plt.show()

# --- FINAL METRICS ---
print("\n--- FINAL MB·004 METRICS ---")
print(f"Avg Actuability (Mu_avg): {mu_avg:.3f}")
print(f"Final E-Realm Coherence (Order Parameter): {r[-1]:.3f}")
print(f"Final UBI Gini Coefficient: {gini[-1]:.3f}")
print(f"Avg UBI Allocation: {np.mean(UBI_allocation[-1]):.2f} (Base: {base_amount})")
