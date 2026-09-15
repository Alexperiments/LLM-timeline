---
title: Relative positional embedding
track: Model architecture
category: Mechanism
date: "2018-03-06"
---

## What problem does it solve?

Transformer self-attention has no inherent notion of token order. Without positional information, permuting tokens permutes outputs correspondingly: attention itself cannot distinguish `"dog bites man"` from `"man bites dog"` based on position.

Original Transformer solved this with **absolute positional encodings** added to token embeddings:

$$
z_i = x_i + p_i
$$

where $p_i$ identifies absolute position $i$. Vaswani et al. used fixed sinusoidal encodings, while also testing learned absolute embeddings.

Problem: many linguistic relationships depend more naturally on **relative displacement** than absolute coordinates.

For query at position 20, useful distinction may be:

- key is previous token: $j-i=-1$
- key is 5 tokens earlier: $j-i=-5$

rather than:

- query is token 20
- key is token 19

Absolute encoding forces model to infer these relative relationships from two independently encoded absolute positions.

This also creates problems when positions shift or when representations need reuse across segments. Same pairwise relationship can occur at many absolute coordinates.

### Previous SoTA

Immediate predecessor: **Transformer sinusoidal absolute positional encoding**, introduced in *Attention Is All You Need* (2017).

Important nuance: sinusoidal encoding was deliberately chosen partly because fixed offsets could theoretically be represented as linear transformations of positional vectors. Original Transformer therefore already gave model structure from which relative position could potentially be derived.

Relative position representations made this relationship explicit inside attention.

## How does it solve it?

Shaw, Uszkoreit, and Vaswani introduced **Self-Attention with Relative Position Representations** on arXiv on March 6, 2018; later published at NAACL-HLT 2018.

Core idea: represent edge between query position $i$ and key position $j$ using embedding determined by relative distance:

$$
r = j-i
$$

Instead of positional information existing only inside token representation, inject relative-distance representation directly into attention.

Simplified Shaw attention score:

$$
e_{ij}
=
\frac{
q_i^\top(k_j+a^K_{ij})
}{
\sqrt{d_k}
}
$$

where

$$
a^K_{ij}=w^K_{\operatorname{clip}(j-i,k)}
$$

and $w^K_r$ is learned embedding for relative displacement $r$.

Distances are clipped:

$$
\operatorname{clip}(j-i,k)
=
\max(-k,\min(k,j-i))
$$

So model learns concepts roughly equivalent to:

```text
≤ -k ... -3 -2 -1 0 +1 +2 +3 ... ≥ +k
```

rather than unique representation for every absolute sequence position.

Shaw et al. also introduce relative representations on value side:

$$
z_i =
\sum_j
\alpha_{ij}(v_j+a^V_{ij})
$$

Thus position can influence both:

1. **which token receives attention** — key-side relative embedding;
2. **information retrieved from that token** — value-side relative embedding.

Paper interprets this more generally as **relation-aware self-attention**: sequence is complete directed graph, tokens are nodes, relative-position representations are edge labels. Same machinery can therefore represent arbitrary labeled graph relations.

### Why relative coordinates help

Consider:

```text
A B C D E
```

For query `D`, relationship to `C` is $-1$.

Shift sequence:

```text
X X X A B C D E
```

`D` and `C` now have different absolute coordinates, but relationship remains $-1$.

Relative positional representation directly preserves this translation-like invariance.

### Initial result

On WMT 2014 machine translation, Shaw et al. reported improvements over absolute positional representations of:

- +1.3 BLEU, English→German
- +0.3 BLEU, English→French

Combining relative and absolute representations produced no additional translation-quality improvement in their experiments.

### Refinements

#### Transformer-XL — 2019

Transformer-XL needed hidden states from previous segments to be reusable in later segments. Absolute coordinates become problematic: cached representation's apparent position changes depending on segment from which it is viewed.

Dai et al. therefore developed a new relative-position formulation.

Attention decomposes into content and relative-position interactions, approximately:

$$
A^{rel}_{ij}
=
q_i^\top k_j
+
q_i^\top R_{i-j}
+
u^\top k_j
+
v^\top R_{i-j}
$$

where $R_{i-j}$ represents relative displacement and $u,v$ are learned global biases.

This retains Shaw's central idea—**attention should reason about $i-j$, not merely absolute $i,j$**—while changing parameterization. It was especially important for Transformer-XL's segment recurrence and long-context modeling.

#### T5 relative position bias — 2019/2020

T5 simplified relative position representation substantially.

Rather than adding full relative vectors to keys/values, it adds learned **scalar bias** to attention logits based on relative position bucket:

$$
e_{ij}
=
\frac{q_i^\top k_j}{\sqrt{d_k}}
+
b_{\operatorname{bucket}(j-i)}
$$

Nearby distances receive fine-grained buckets; increasingly distant positions share coarser buckets.

Concept remains relative-position-aware attention, but implementation becomes cheaper: position modifies attention score directly rather than contributing another full vector representation.

#### RoPE — related descendant, but separate named mechanism

Rotary Position Embedding (RoPE, 2021) should usually receive its **own milestone**, not be treated merely as Shaw refinement.

RoPE rotates query/key coordinates according to absolute position such that their dot product depends naturally on relative displacement.

It preserves relative-position principle but changes mechanism enough to acquire distinct name and literature.

Conceptual lineage:

```text
Absolute positional encoding
Vaswani et al., 2017
        │
        ▼
Explicit relative position in attention
Shaw et al., 2018
        │
        ├── Transformer-XL relative formulation, 2019
        │
        ├── T5 relative attention bias, 2019/2020
        │
        └── later distinct mechanisms
             └── RoPE, 2021
```

## Visualizations (optional)

Best primary-source visualization: equations and architecture discussion in Shaw et al., *Self-Attention with Relative Position Representations*.

For understanding transition from absolute to relative attention, Transformer-XL's derivation is especially useful: it expands absolute attention into content/position interaction terms, then constructs corresponding relative formulation.

Useful mental diagram:

```text
ABSOLUTE

token i ── position i ──┐
                        ├── token representation ── attention
token j ── position j ──┘


RELATIVE

token i ── query ───────────────┐
                                ├── attention score
token j ── key ─────────────────┤
                                │
         relative distance i-j ─┘
```

Key conceptual shift:

```text
"Where is this token?"
        ↓
"Where is this token relative to me?"
```

## References

1. Vaswani et al. (2017), *Attention Is All You Need*. Original Transformer and sinusoidal absolute positional encoding.  
   https://arxiv.org/abs/1706.03762

2. Shaw, Uszkoreit & Vaswani (2018), *Self-Attention with Relative Position Representations*. arXiv submission: 2018-03-06; NAACL-HLT 2018, pp. 464–468. Primary milestone.  
   https://arxiv.org/abs/1803.02155  
   https://aclanthology.org/N18-2074/

3. Dai et al. (2019), *Transformer-XL: Attentive Language Models beyond a Fixed-Length Context*. Refined relative positional formulation for segment recurrence and long-context modeling.  
   https://arxiv.org/abs/1901.02860  
   https://aclanthology.org/P19-1285/

4. Raffel et al. (2020), *Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer*. T5; simplified relative-position attention bias.  
   https://arxiv.org/abs/1910.10683  
   https://www.jmlr.org/papers/v21/20-074.html

5. Su et al. (2021), *RoFormer: Enhanced Transformer with Rotary Position Embedding*. Separate descendant mechanism: RoPE.  
   https://arxiv.org/abs/2104.09864
