---
title: Self-attention
track: Model architecture
category: Landmark
date: "2017-06-12"
---

Self-attention is a sequence-processing mechanism in which each position constructs a new representation by selectively aggregating information from positions in the same sequence. In *Attention Is All You Need* [1], this mechanism became the central operation of the Transformer, replacing recurrence and convolution as the means by which information moves between sequence positions.

Here, **self-attention** refers specifically to the formulation popularized by Vaswani et al. [1]: learned query, key, and value projections combined through scaled dot-product attention. Earlier mechanisms now recognizable as forms of self- or intra-attention existed before the Transformer. Parikh et al. [2] used intra-sentence attention in a natural-language-inference model, while Lin et al. [3] explicitly described a self-attention mechanism for sentence embeddings. Transformer formulation nevertheless became widespread reference meaning of self-attention.

## What problem does it solve?

Earlier sequence models primarily propagated information through recurrence or convolution. Recurrent neural networks, including LSTMs [4], process sequence positions through recurrent state transitions. Information from position $j$ therefore reaches a later position $i$ through intermediate recurrent states, creating a sequential computation path and limiting parallelization across sequence positions.

Convolutional sequence models offered substantially greater parallelism. Gehring et al. [5], for example, proposed a fully convolutional sequence-to-sequence architecture whose computations over sequence elements could be parallelized during training. Convolutions, however, aggregate information over bounded receptive fields; connecting distant positions requires wider kernels or multiple stacked layers.

Self-attention instead provides a direct interaction between every pair of positions within one layer. Maximum path length between positions becomes $O(1)$, while computation across positions can be performed in parallel [1]. Cost is an $O(n^2)$ attention matrix for sequence length $n$.

Self-attention alone, however, has no intrinsic representation of sequence order: permuting input positions correspondingly permutes outputs. Transformer therefore supplements token representations with positional information.

## How does it solve it?

Given input sequence

$$
X = [x_1,\ldots,x_n],
$$

each position is projected into three learned representations:

$$
Q=XW^Q,\qquad K=XW^K,\qquad V=XW^V.
$$

For position $i$, query $q_i$ describes what information that position seeks. Keys $k_j$ determine how strongly other positions match that query. Values $v_j$ contain information actually retrieved.

### Scaled dot-product attention

Transformer computes all pairwise query-key compatibility scores through dot products:

$$
S = QK^\top.
$$

Scores are scaled by key dimension $d_k$:

$$
S = \frac{QK^\top}{\sqrt{d_k}}.
$$

Without scaling, dot-product magnitudes tend to increase with dimensionality, pushing softmax toward regions with very small gradients. Division by $\sqrt{d_k}$ keeps score magnitudes better conditioned [1].

Applying softmax row-wise produces attention weights:

$$
A=\operatorname{softmax}\left(\frac{QK^\top}{\sqrt{d_k}}\right).
$$

Output is weighted combination of values:

$$
\operatorname{Attention}(Q,K,V)
=
\operatorname{softmax}\left(
\frac{QK^\top}{\sqrt{d_k}}
\right)V.
$$

Thus representation at position $i$ becomes

$$
z_i=\sum_j A_{ij}v_j.
$$

Each position can therefore retrieve information directly from every permitted position in sequence.

### Masking

Attention can restrict which positions participate by modifying scores before softmax:

$$
A=
\operatorname{softmax}
\left(
\frac{QK^\top}{\sqrt{d_k}}+M
\right).
$$

For prohibited connections, corresponding entries of $M$ are set to $-\infty$, making their softmax weights zero.

Transformer decoder uses **causal masking**:

$$
M_{ij}=
\begin{cases}
0 & j\le i\\
-\infty & j>i.
\end{cases}
$$

Position $i$ can therefore attend only to itself and earlier positions. This prevents future-token information from leaking into predictions while still allowing all training positions to be processed in parallel [1].

Encoder self-attention is unmasked with respect to sequence direction, allowing every position to attend to both earlier and later positions.

### Multi-head self-attention

Rather than perform one attention operation over full representation space, Transformer performs several attention operations in parallel.

For head $h$:

$$
\operatorname{head}_h
=
\operatorname{Attention}
\left(
XW_h^Q,
XW_h^K,
XW_h^V
\right).
$$

Heads are concatenated and projected:

$$
\operatorname{MultiHead}(X)
=
\operatorname{Concat}
(\operatorname{head}_1,\ldots,\operatorname{head}_H)W^O.
$$

Each head has independent query, key, and value projections. This allows different heads to construct different compatibility functions and operate in different learned representation subspaces. Vaswani et al. describe this as allowing model to jointly attend to information from different positions and representation subspaces [1].

Multi-head attention therefore does not change core self-attention operation. It runs several independently parameterized scaled dot-product self-attention operations in parallel and combines their outputs.

### Absolute positional encoding

Self-attention itself contains no notion of absolute position. Transformer therefore adds a position-dependent vector to each token embedding before first attention layer:

$$
x_i=e_i+p_i.
$$

Vaswani et al. used fixed sinusoidal absolute positional encodings:

$$
PE_{(pos,2i)}
=
\sin\left(
\frac{pos}{10000^{2i/d_{\text{model}}}}
\right),
$$

$$
PE_{(pos,2i+1)}
=
\cos\left(
\frac{pos}{10000^{2i/d_{\text{model}}}}
\right).
$$

Different dimensions encode position using sinusoids of different wavelengths. Since positional vector is added to token embedding, subsequent query, key, and value projections can use both token identity and position when computing attention.

Paper also tested learned absolute positional embeddings and reported similar performance, choosing sinusoidal encoding partly because it could potentially extrapolate to sequence lengths not encountered during training [1].

### Residual connection

Self-attention output does not directly replace incoming representation. In original Transformer, each attention sublayer is wrapped in residual connection followed by layer normalization:

$$
y=
\operatorname{LayerNorm}
\left(
x+\operatorname{MultiHeadSelfAttention}(x)
\right).
$$

Residual connections were introduced as a general deep-network architecture by He et al. [6], while layer normalization was introduced by Ba, Kiros, and Hinton [7]. Transformer combines both around each sublayer [1].

Residual path preserves a direct route for existing representation while attention contributes a context-dependent update and supports optimization of stacked layers. Residual connection and layer normalization are therefore not parts of mathematical attention operation itself, but parts of Transformer self-attention **sublayer**.

## Visualizations

Most useful original visualization is **Figure 2** of *Attention Is All You Need* [1]. Left diagram decomposes scaled dot-product attention into:

$$
Q,K
\rightarrow
QK^\top
\rightarrow
\text{Scale}
\rightarrow
\text{Mask (optional)}
\rightarrow
\text{Softmax}
\rightarrow
\times V.
$$

Right diagram shows multi-head attention: independent learned linear projections feed parallel attention heads; outputs are concatenated and projected.

**Figure 1** [1] places self-attention in full Transformer architecture and shows positional encoding, masked decoder self-attention, and residual `Add & Norm` paths.

For historical comparison, Figure 1 of Gehring et al. [5] illustrates a convolutional sequence-to-sequence architecture, useful for contrasting stacked local convolutional processing with direct all-to-all interactions in self-attention.

## Individual ideas in this landmark
- Scaled dot-product self-attention
- Multi-head attention
- Sinusoidal absolute positional encodings
- Residual self-attention

## References

1. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017). [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762). NeurIPS 2017.
2. Parikh, A. P., Täckström, O., Das, D., & Uszkoreit, J. (2016). [*A Decomposable Attention Model for Natural Language Inference*](https://aclanthology.org/D16-1244/). EMNLP 2016.
3. Lin, Z., Feng, M., dos Santos, C. N., Yu, M., Xiang, B., Zhou, B., & Bengio, Y. (2017). [*A Structured Self-attentive Sentence Embedding*](https://arxiv.org/abs/1703.03130). ICLR 2017.
4. Hochreiter, S., & Schmidhuber, J. (1997). [*Long Short-Term Memory*](https://doi.org/10.1162/neco.1997.9.8.1735). Neural Computation, 9(8), 1735–1780.
5. Gehring, J., Auli, M., Grangier, D., Yarats, D., & Dauphin, Y. N. (2017). [*Convolutional Sequence to Sequence Learning*](https://arxiv.org/abs/1705.03122). ICML 2017.
6. He, K., Zhang, X., Ren, S., & Sun, J. (2016). [*Deep Residual Learning for Image Recognition*](https://arxiv.org/abs/1512.03385). CVPR 2016.
7. Ba, J. L., Kiros, J. R., & Hinton, G. E. (2016). [*Layer Normalization*](https://arxiv.org/abs/1607.06450).
