# Strategic Decision Intelligence
## Multi-Framework Strategic Analysis Toolkit

**A comprehensive system for transforming complex strategic decisions into structured insight using cross-disciplinary frameworks.**

---

## Table of Contents

1. [Overview & When to Use](#overview)
2. [Analysis Workflow](#workflow)
3. [Framework #1: Game Theory](#game-theory)
4. [Framework #2: Systems Thinking](#systems-thinking)
5. [Framework #3: Behavioral Economics](#behavioral-economics)
6. [Framework #4: Scenario Analysis](#scenario-analysis)
7. [Framework #5: Real Options](#real-options)
8. [Decision Support Scripts](#scripts)
9. [Framework Quick Reference](#reference)
10. [Example Applications](#examples)
11. [Best Practices & Pitfalls](#practices)

---

## 1. Overview & When to Use {#overview}

Strategic Decision Intelligence transforms complex strategic decisions into structured analysis using five cross-disciplinary frameworks. This skill provides rigorous analytical lenses and decision support tools for high-stakes choices, competitive strategy, and system design.

### When to Trigger This Skill:

- ✅ **Complex strategic decisions** with multiple stakeholders, uncertainties, or trade-offs
- ✅ **Competitive analysis** requiring game-theoretic or positioning frameworks
- ✅ **System design** where feedback loops, delays, and emergent behavior matter
- ✅ **Scenario planning** for high-uncertainty environments
- ✅ **Choice architecture** leveraging behavioral insights
- ✅ **Portfolio decisions** requiring option value thinking
- ✅ **Decision quality checks** to stress-test existing plans

**Not for:** Simple tactical choices, purely operational decisions, or situations with clear optimal answers.

---

## 2. Analysis Workflow {#workflow}

### Step 1: Frame the Decision

- What specific choice or strategy are we evaluating?
- Who are the decision-makers and key stakeholders?
- What's the time horizon and scope?
- What constraints or irreversibilities exist?
- What metrics define success?

### Step 2: Select Analytical Frameworks

**High strategic interaction** (competitors, negotiators, coalitions):
→ **Game Theory** - Strategic move analysis, Nash equilibrium, commitment dynamics

**Complex systems** (feedback loops, delays, emergent behavior):
→ **Systems Thinking** - Causal mapping, leverage points, unintended consequences

**Human behavior central** (adoption, compliance, choice architecture):
→ **Behavioral Economics** - Bias analysis, nudge design, framing effects

**High uncertainty** (multiple plausible futures, irreversible commitments):
→ **Scenario Analysis** - Robust strategy, signpost identification, adaptive planning

**Flexibility valuable** (staged investment, learning possible, optionality):
→ **Real Options** - Valuing flexibility, designing modular systems, staging commitments

**Competitive differentiation** (market positioning, strategic canvas):
→ **Strategy Canvas** - Blue Ocean analysis, ERRC grid, positioning gaps

### Step 3: Apply Frameworks

1. Load the relevant reference file
2. Follow the analysis protocol
3. Generate structured insights (maps, matrices, scenarios)
4. Document key findings

**Multi-framework synthesis:** Integrate insights across frameworks. Game theory informs scenario dynamics; behavioral economics reveals friction in system design; real options value flexibility in scenarios.

### Step 4: Generate Decision Support

Use scripts to create structured outputs:

**Decision matrices** (`decision_matrix.py`):
```python
from decision_matrix import create_decision_matrix, sensitivity_analysis

options = ["Option A", "Option B", "Option C"]
criteria = ["Cost", "Risk", "Speed", "Impact"]
scores = {
    "Option A": {"Cost": 7, "Risk": 5, "Speed": 8, "Impact": 6},
    # ... additional options
}
weights = {"Cost": 0.3, "Risk": 0.2, "Speed": 0.2, "Impact": 0.3}

print(create_decision_matrix(options, criteria, scores, weights))
print(sensitivity_analysis(options, criteria, scores, weights, "Risk"))
```

**Strategy canvas** (`strategy_canvas.py`):
```python
from strategy_canvas import create_strategy_canvas, suggest_errc_grid

factors = ["Price", "Quality", "Service", "Innovation"]
competitors = {
    "Competitor A": [8, 6, 5, 4],
    "Competitor B": [5, 8, 7, 6],
    "Your Company": [6, 7, 8, 7]
}

print(create_strategy_canvas(factors, competitors))
print(suggest_errc_grid(factors, competitors["Your Company"]))
```

### Step 5: Synthesize Recommendations

Integrate findings into actionable strategy:

- **What's the recommendation?** State the preferred option/strategy clearly
- **Why?** Summarize key reasoning from frameworks
- **What are the risks?** Identify failure modes, worst-case scenarios, critical assumptions
- **How do we monitor?** Define signposts, triggers for reassessment, adaptive mechanisms
- **What should we preserve?** Note flexibility, options, capabilities to maintain

---

## 3. Framework #1: Game Theory {#game-theory}

**Competitive Dynamics & Strategic Interaction**

### Core Concepts

- **Nash Equilibrium**: Strategy profile where no player can improve by unilaterally changing strategy
- **Dominant Strategy**: Best choice regardless of what others do
- **Pareto Efficiency**: No player can be made better off without making another worse off

### Key Game Types

| Game Type | Structure | Real-World Examples |
|-----------|-----------|---------------------|
| **Prisoner's Dilemma** | Cooperation > defection, but incentive to defect | Price wars, arms races, cartel stability |
| **Coordination** | Multiple equilibria, need alignment | Tech standards, network effects |
| **Chicken/Hawk-Dove** | Escalation costly, commit first | Market entry, negotiations |
| **Zero-Sum** | One's gain = another's loss | Market share battles |
| **Sequential** | Players move in turns | Entry deterrence, bargaining |

### Analysis Protocol

1. **Define the game** - Players, strategies, payoffs, timing, information structure
2. **Find equilibria** - Check for dominant strategies, identify Nash equilibria
3. **Assess stability** - Is equilibrium Pareto efficient? Commitment problems?
4. **Identify strategic moves** - Commitment, threats, promises, pre-emption
5. **Consider complications** - Incomplete info, reputation effects, signaling

### Strategic Insights

- **First-mover advantage** when commitment/pre-emption valuable
- **Second-mover advantage** when learning/flexibility valuable
- **Mixed strategies** to avoid exploitation
- **Focal points** coordinate without communication
- **Costly signaling** for credible communication when incentives misaligned

---

## 4. Framework #2: Systems Thinking {#systems-thinking}

**Feedback Loops & Emergent Behavior**

### Core Concepts

- **Stock**: Resource that accumulates (inventory, reputation, knowledge, cash)
- **Flow**: Rate of change in a stock (sales rate, burn rate, learning velocity)
- **Feedback Loop (Reinforcing)**: Amplifies change (network effects, compounding growth, vicious cycles)
- **Feedback Loop (Balancing)**: Resists change toward equilibrium (supply/demand, market saturation)
- **Delays**: Time lag between action and consequence - critical for system behavior

### Leverage Points (Meadows' Hierarchy)

Ordered from weakest (12) to strongest (1):

12. Constants, parameters, numbers
11. Buffer sizes (stock capacity)
10. Stock-and-flow structures
9. Delays relative to rate of change
8. Balancing feedback loop strength
7. Reinforcing feedback loop strength
6. Information flows
5. Rules of the system
4. Power to add, change, evolve system structure
3. Goals of the system
2. Mindsets or paradigms
1. Power to transcend paradigms

### Analysis Protocol

1. **Map the system** - Identify stocks, flows, causal connections, feedback loops, delays
2. **Identify feedback loops** - Reinforcing or balancing? Purpose/pattern? Activation triggers?
3. **Find leverage points** - Highest-order intervention points that are accessible
4. **Anticipate behavior** - Tipping points? Unintended consequences? Pattern recognition

### Common System Patterns

- **Limits to Growth**: Reinforcing loop drives growth until balancing loop dominates → slowdown/plateau
- **Shifting the Burden**: Quick fix creates dependency, weakens fundamental solution
- **Escalation**: Two actors mutually escalate competitive behavior (arms race)
- **Success to the Successful**: Winner gains advantage that enables continued winning
- **Tragedy of the Commons**: Individual rational behavior depletes shared resource
- **Fixes that Fail**: Solution works short-term but creates worse long-term problem

---

## 5. Framework #3: Behavioral Economics {#behavioral-economics}

**Cognitive Biases & Choice Architecture**

### Core Deviations from Rationality

#### Prospect Theory (Kahneman & Tversky)

- **Loss Aversion**: Losses hurt ~2× more than equivalent gains feel good
- **Reference Dependence**: Outcomes evaluated relative to reference point, not absolute
- **Diminishing Sensitivity**: $100→$200 feels bigger than $1000→$1100
- **Probability Weighting**: Overweight small probabilities, underweight moderate/high

#### Mental Accounting

- **Non-fungibility**: Money in different "accounts" treated differently (windfall vs. salary)
- **Sunk Cost Fallacy**: Past unrecoverable costs influence future decisions
- **Payment Decoupling**: Pain of payment separated from consumption (credit cards, subscriptions)
- **House Money Effect**: Gains treated as "play money" with higher risk tolerance

#### Temporal Discounting

- **Hyperbolic Discounting**: Steep discounting near-term, shallow long-term (preference reversals)
- **Present Bias**: Overvalue immediate rewards vs. delayed
- **Planning Fallacy**: Underestimate time/cost/difficulty of future tasks

### Key Heuristics & Biases

- **Anchoring**: Initial number influences subsequent estimates
- **Availability**: Judge frequency/probability by ease of recall
- **Representativeness**: Judge probability by similarity to stereotype
- **Affect Heuristic**: Feelings guide judgments ("it feels risky")
- **Confirmation Bias**: Seek/interpret evidence that confirms beliefs
- **Overconfidence**: Overestimate accuracy of knowledge/forecasts
- **Framing Effects**: Same info, different presentation → different choices
- **Default Bias**: Stick with pre-selected option (status quo bias)
- **Social Proof**: Conform to others' behavior
- **Endowment Effect**: Value owned items more than identical unowned items

### Nudge Typology

- **Defaults**: Pre-selected option (organ donation, retirement savings)
- **Friction**: Add/remove effort (unsubscribe complexity, commitment devices)
- **Salience**: Make information prominent (calorie labels, carbon footprint)
- **Social proof**: Highlight others' choices (energy usage comparison, ratings)
- **Commitment devices**: Lock in future behavior (gym contracts, public pledges)
- **Reminders**: Prompt action (text messages, notifications)
- **Disclosure**: Reveal conflicts/incentives (reduce information asymmetry)
- **Warnings**: Highlight risks/costs (cigarette labels, overdraft fees)

### Applications

- **Pricing**: Anchoring (strike-through prices), decoy effects, payment decoupling
- **Product Design**: Defaults, friction reduction, social proof, loss framing
- **Negotiation**: Anchoring first offers, framing concessions as losses
- **Change Management**: Status quo bias, loss aversion, endowment effect
- **Messaging**: Framing (gain/loss), social proof, scarcity/urgency

---

## 6. Framework #4: Scenario Analysis {#scenario-analysis}

**Planning for Multiple Plausible Futures**

### Core Methodology

Scenario analysis explores multiple plausible futures to stress-test strategies and identify robust options.

**Not predictions**: Scenarios describe possibilities, not probabilities. Focus on plausibility, not likelihood.

### Scenario Construction

#### 1. Identify Critical Uncertainties

**Key uncertainties** are:
- High impact on outcomes
- High uncertainty in direction/magnitude
- Outside your control

**Avoid:**
- Predetermined trends (aging population, Moore's law)
- Events you can control
- Minor variables with low impact

#### 2. Select Scenario Axes

Choose 2 critical uncertainties → 4 quadrants (2×2 matrix)

**Criteria for good axes:**
- Independent (not causally linked)
- High impact
- True uncertainty (not just unknown)
- Challenging to conventional wisdom

**Example: Future of Remote Work**
- Axis 1: Company Culture (Synchronous ↔ Asynchronous)
- Axis 2: Geographic Arbitrage (Compressed ↔ Expanded wage gaps)

#### 3. Develop Scenario Narratives

For each quadrant, construct a coherent story:

**Elements:**
- **Trigger events**: What shifts the world toward this scenario?
- **Internal logic**: How do factors reinforce each other?
- **Implications**: What changes for key stakeholders?
- **Weak signals**: What early indicators would suggest this path?

#### 4. Test Strategies Against Scenarios

For each strategic option, evaluate:
- **Performance**: How well does it work in each scenario?
- **Robustness**: Does it perform acceptably across all scenarios?
- **Flexibility**: Can it adapt as scenarios clarify?
- **Hedging**: Does it protect against worst cases?

### Decision Strategies

| Strategy Type | Approach | Examples |
|--------------|----------|----------|
| **Robust** | Work reasonably well across multiple scenarios | Diversification, modularity, core competencies |
| **Hedging** | Protect against specific downside scenarios | Insurance/options, portfolio approach, reversible commitments |
| **Adaptive** | Commit to learning and pivoting as scenarios clarify | Stage-gate processes, real options, signpost monitoring |
| **Shaping** | Attempt to influence which scenario occurs | Standards setting, coalition building, regulatory engagement |

### Analysis Protocol

1. **Frame the decision** - What decision? Time horizon? Focal question?
2. **Identify uncertainties** - Brainstorm, rank by impact × uncertainty, select top 2
3. **Build scenarios** - Name, narrative, characteristics, implications for each quadrant
4. **Identify signposts** - Early indicators, metrics to monitor, triggers for review
5. **Evaluate options** - Score each option in each scenario (robustness, worst case, regret)
6. **Synthesize strategy** - Most robust option? Where to hedge? Flexibility to preserve?

---

## 7. Framework #5: Real Options {#real-options}

**Valuing Flexibility & Staged Investment**

### Core Concept

Real options apply financial option theory to strategic decisions. A real option is the right (but not obligation) to take an action at a predetermined cost (strike price) for a predetermined period (expiration).

**Key insight**: Flexibility has value. The ability to learn and adapt is worth preserving even if it costs money upfront.

### Option Types

| Option Type | Description | Examples |
|------------|-------------|----------|
| **Call (Growth)** | Right to expand/invest | R&D → commercialize, market entry → scale, platform → build on it |
| **Put (Abandonment)** | Right to exit/divest | Modular design, leasing vs. buying, joint ventures with exit clauses |
| **Flexibility (Switch)** | Right to change course | Multi-use facilities, flexible supply chains, platform architecture |
| **Defer (Timing)** | Right to wait | Staged rollouts, land banking, patent filing |

### Valuation Drivers

Options are more valuable when:

1. **High volatility/uncertainty**: More upside potential, limited downside
2. **Long time to expiration**: More time to learn/adapt
3. **Low strike price**: Cheaper to exercise
4. **High underlying asset value**: More to gain if things go well
5. **Low dividends/costs of waiting**: Lower opportunity cost of deferring

### Strategic Insights

**Flexibility Premium**
- Flexibility is valuable even if you never exercise it
- **Implication**: Modular, reversible designs worth paying for

**Information Value**
- Options convert uncertainty into opportunity by enabling learning before commitment
- **Implication**: Stage investments to buy information

**Abandonment Asymmetry**
- Options create asymmetric payoffs: participate in upside, limit downside
- **Implication**: Small bets on high-variance opportunities beat large safe bets

### Analysis Protocol

1. **Identify options** - Expand/abandon/defer/switch? Flexibility preserved or destroyed?
2. **Map option structure** - Underlying asset, strike price, expiration, volatility, holding cost
3. **Value the option** - Qualitative or quantitative assessment
4. **Design for optionality** - Staged investments, modular architecture, flexibility clauses
5. **Compare alternatives** - Option-adjusted value vs. rigid approaches

### Design Patterns for Optionality

- **Sequential Investment**: Stage commitments with go/no-go gates (Seed → Series A → Series B)
- **Modular Architecture**: Decompose system into independently valuable pieces (microservices)
- **Platform Strategy**: Invest in shared infrastructure enabling multiple applications (AWS)
- **Strategic Alliances**: JVs, partnerships, minority stakes (learning with abandonment protection)
- **Portfolio Approach**: Multiple small bets rather than one large bet (VC model)

---

## 8. Decision Support Scripts {#scripts}

### Script #1: decision_matrix.py

**Purpose:** Create weighted decision matrices with sensitivity analysis

**Key Functions:**

```python
create_decision_matrix(
    options: List[str],           # ["Option A", "Option B", "Option C"]
    criteria: List[str],          # ["Cost", "Risk", "Speed", "Impact"]
    scores: Dict[str, Dict],      # {option: {criterion: score}}
    weights: Dict[str, float],    # {criterion: weight}
    normalize: bool = True        # Normalize scores to 0-10 scale
) -> str  # Returns markdown table
```

**Example Output:**
```
| Option | Cost | Risk | Speed | Impact | Weighted Total |
|--------|------|------|-------|--------|----------------|
| Option A | 7.0 | 5.0 | 8.0 | 6.0 | 6.50 |
| Option B | 8.0 | 3.0 | 6.0 | 8.0 | 6.40 |
| Weight | 0.30 | 0.20 | 0.20 | 0.30 | |
```

```python
sensitivity_analysis(
    options, criteria, scores, base_weights,
    varying_criterion: str,       # Which criterion to vary
    weight_range: Tuple = (0.0, 1.0),
    steps: int = 5
) -> str  # Shows how winner changes with weight variation
```

### Script #2: strategy_canvas.py

**Purpose:** Blue Ocean Strategy positioning analysis

**Key Functions:**

```python
create_strategy_canvas(
    factors: List[str],                # ["Price", "Quality", "Service"]
    competitors: Dict[str, List[int]], # {name: [scores 1-10]}
    show_average: bool = True
) -> str  # Returns markdown table + ASCII visualization
```

**Outputs:**
- Comparative factor table showing all competitors
- ASCII visualization of positioning
- Strategic insights on differentiation and convergence
- Blue Ocean opportunities (underinvested factors)

```python
suggest_errc_grid(
    factors: List[str],
    current_scores: List[int]
) -> str  # Returns Eliminate-Reduce-Raise-Create recommendations
```

---

## 9. Framework Quick Reference {#reference}

| Framework | Best For | Key Output |
|-----------|----------|------------|
| **Game Theory** | Strategic interaction, competition, negotiation | Equilibria, strategic moves, commitment analysis |
| **Systems Thinking** | Complex systems, feedback, unintended consequences | Causal maps, leverage points, loop identification |
| **Behavioral Economics** | Human behavior, choice architecture, adoption | Bias analysis, nudge design, framing strategies |
| **Scenario Analysis** | High uncertainty, robust strategy, future planning | Scenario matrix, signposts, adaptive strategies |
| **Real Options** | Flexibility, staged investment, learning value | Option identification, modularity design, staging plans |
| **Strategy Canvas** | Competitive positioning, differentiation, Blue Ocean | ERRC grid, positioning gaps, convergence analysis |

---

## 10. Example Applications {#examples}

The power of Strategic Decision Intelligence comes from combining multiple frameworks:

### Market Entry Decision
**Game theory** (competitive response) + **Real options** (staging) + **Scenario analysis** (demand uncertainty)

### Product Positioning
**Strategy canvas** (competitive gaps) + **Behavioral economics** (messaging) + **Systems thinking** (adoption loops)

### Partnership Negotiation
**Game theory** (bargaining dynamics) + **Behavioral economics** (framing) + **Real options** (flexibility clauses)

### Change Management
**Systems thinking** (feedback loops) + **Behavioral economics** (adoption barriers) + **Decision matrix** (approach comparison)

### R&D Portfolio
**Real options** (project staging) + **Decision matrix** (prioritization) + **Scenario analysis** (technology trajectories)

### Pricing Strategy
**Behavioral economics** (anchoring/framing) + **Game theory** (competitive dynamics) + **Systems thinking** (feedback effects)

### Platform Business Model
**Systems thinking** (network effects) + **Real options** (expansion paths) + **Game theory** (multi-sided markets)

### Crisis Response
**Scenario analysis** (multiple futures) + **Real options** (adaptive response) + **Game theory** (stakeholder management)

---

## 11. Best Practices & Common Pitfalls {#practices}

### Best Practices

- **Start broad, then deep**: Begin with multiple frameworks to explore the decision space, then go deep on the most revealing 1-2 frameworks

- **Expose reasoning**: Make assumptions explicit. Show the logic chain from framework → insight → recommendation

- **Quantify when possible**: Use scripts for structured comparison. Numbers create clarity and enable sensitivity analysis

- **Challenge consensus**: Apply frameworks specifically to surface blind spots, test conventional wisdom, identify hidden assumptions

- **Design for learning**: Structure decisions to generate information. Stage commitments. Build in feedback loops

- **Stress-test recommendations**: Run pre-mortems. Identify conditions where recommendation fails. Design contingencies

### Common Pitfalls

- **Framework overfit**: Forcing reality into framework rather than using framework to illuminate reality

- **Analysis paralysis**: Over-analyzing without threshold for decision

- **Ignoring constraints**: Elegant strategy that's politically or operationally impossible

- **Missing interactions**: Treating frameworks in isolation vs. synthesizing insights

- **Static thinking**: Assuming competitors/systems won't adapt to your strategy

- **Sunk cost trap**: Not exercising abandonment options identified in analysis

---

## File Structure

```
strategic-decision-intelligence/
├── SKILL.md (5.5KB) - Main instructions
├── references/
│   ├── game-theory.md (2.8KB)
│   ├── systems-thinking.md (2.4KB)
│   ├── behavioral-economics.md (3.7KB)
│   ├── scenario-analysis.md (3.5KB)
│   └── real-options.md (3.2KB)
└── scripts/
    ├── decision_matrix.py (1.8KB)
    └── strategy_canvas.py (2.7KB)

Total: ~23KB of strategic intelligence
```

---

**This skill represents the condensed wisdom of strategy consulting, behavioral economics, game theory, and systems science. Use it to transform complexity into clarity, uncertainty into options, and analysis into action.**
