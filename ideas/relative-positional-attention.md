---
category: Mechanism
date: 2018-03-06
title: Relative positional attention
track: Model architecture
---

Relative positional attention modifies [self-attention](/?idea=self-attention) so attention between token positions can depend explicitly on their **relative displacement** rather than relying only on absolute position vectors added to token embeddings [1].

Core idea: relation between positions $i$ and $j$ is represented by learned embedding indexed by clipped distance $j-i$. Position information therefore enters attention pairwise.

Legacy: relative position became broad design family. Later systems changed exact parameterization substantially: Transformer-XL decomposed attention scores to support recurrence across segments [4]; T5 later used scalar learned relative-position biases rather than Shaw-style vector representations [5]. [RoPE](/?idea=rotary-poisition-embeddings) and [ALiBi](/?idea=attention-linear-biases) pursue same high-level goal, making attention position-aware through relative relationships.

## What problem does it solve?

Original Transformer [2] has no recurrence or convolution, so self-attention itself has no inherent notion of token order. Vaswani et al. solved this by adding sinusoidal or learned **absolute positional encodings** to input embeddings:

$$
z_i = x_i + p_i
$$

[self-attention](/?idea=self-attention) then computes, schematically,

$$
e_{ij} = \frac{(x_iW^Q)(x_jW^K)^T}{\sqrt{d_k}}.
$$

Position can affect $e_{ij}$ only indirectly because position vector has already been mixed into token representation.

Problem: many sequence relations are naturally relative. "Token immediately before me," "token 5 positions back," or "same motif 20 events ago" depend on distance $j-i$, not absolute coordinates $i$ and $j$.

Shaw et al. explicitly encode those pairwise distances. On WMT 2014 translation, their relative-position model improved over their absolute-position baseline by 1.3 BLEU for English→German and 0.3 BLEU for English→French; combining relative and absolute representations gave no further improvement [1].

## How does it solve it?

For sequence positions $i$ and $j$, Shaw et al. define learned relative-position vectors for key-side and value-side interactions:

$$
a_{ij}^{K} = w_{\mathrm{clip}(j-i,k)}^{K}
$$

$$
a_{ij}^{V} = w_{\mathrm{clip}(j-i,k)}^{V}
$$

where $k$ is maximum relative distance represented distinctly. Distances outside $[-k,k]$ share boundary embeddings:

$$
\mathrm{clip}(x,k)=\max(-k,\min(k,x)).
$$

Standard attention compatibility score is changed from

$$
e_{ij} = \frac{q_i k_j^T}{\sqrt{d_k}}
$$

to

$$
e_{ij} =
\frac{q_i(k_j+a_{ij}^{K})^T}{\sqrt{d_k}}.
$$

After softmax,

$$
\alpha_{ij} =
\frac{\exp(e_{ij})}{\sum_l \exp(e_{il})}.
$$

Output also receives relative information:

$$
z_i =
\sum_j \alpha_{ij}(v_j+a_{ij}^{V}).
$$

So relative distance affects two places:

1. **Attention weight:** $a_{ij}^{K}$ changes how strongly position $i$ attends to $j$.
2. **Attention value:** $a_{ij}^{V}$ changes information returned from that relation.

Key conceptual shift:

$$
\text{“where is token }j\text{?”}
\quad\longrightarrow\quad
\text{“where is token }j\text{ relative to }i\text{?”}
$$

Shaw et al. also frame mechanism more generally as **relation-aware self-attention**: relative position is one relation label on edge $(i,j)$; same construction can encode arbitrary labeled graph relations [1].

## References

1. Peter Shaw, Jakob Uszkoreit, Ashish Vaswani. **Self-Attention with Relative Position Representations.** arXiv submission, 2018-03-06; NAACL-HLT 2018. [arXiv](https://arxiv.org/abs/1803.02155) · [ACL Anthology](https://aclanthology.org/N18-2074/)
2. Ashish Vaswani et al. **Attention Is All You Need.** arXiv, 2017; NeurIPS 2017. [arXiv](https://arxiv.org/abs/1706.03762)
3. Cheng-Zhi Anna Huang et al. **Music Transformer: Generating Music with Long-Term Structure.** arXiv, 2018; ICLR 2019. [arXiv](https://arxiv.org/abs/1809.04281) · [Google Research](https://research.google/pubs/music-transformer-generating-music-with-long-term-structure/)
4. Zihang Dai et al. **Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context.** arXiv, 2019; ACL 2019. [arXiv](https://arxiv.org/abs/1901.02860) · [ACL Anthology](https://aclanthology.org/P19-1285/)
5. Colin Raffel et al. **Exploring the Limits of Transfer Learning with a Unified Text-to-Text Transformer.** arXiv, 2019; JMLR 2020. [arXiv](https://arxiv.org/abs/1910.10683) · [JMLR](https://jmlr.org/papers/v21/20-074.html)
