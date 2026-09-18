---
category: Mechanism
date: 2017-08-08
title: Pre layer normalization
track: Model architecture
---

Pre-layer normalization addresses a problem in the original Transformer architecture [1], where post-layer normalization was instead employed.
The resulting architecture, later called the Pre-LN Transformer, was first introduced by Noam Shazeer [2] and later formalized in several papers [3], [4].
Pre-LN is a step forward in stabilizing Transformer training, but it has its shortcomings, and it led to improvements such as the [Dual Residual Transformer](/LLM-timeline/?idea=dual-residual-connections) [5].

## What problem does it solve?

In the original Transformer paper, the post-LN [attention](/LLM-timeline/?idea=self-attention) block made it necessary to carefully fine-tune the optimizer parameters and to use a custom learning-rate schedule (with a warm-up window) to stabilize training and ensure convergence [1].
This was later found to be the case because of large gradients near the output layer and the exponential decay of the gradient norm during the backward pass, which leads to vanishing gradients in deep networks [4].
The problem was solved by moving the normalization before the attention block or the MLP layers, which in addition helped simplifying the training phase.

![post-LN vs pre-LN attention blocks](/LLM-timeline/images/pre-post-ln.png)
*Post-LN and Pre-LN attention block - [Source](https://deeprevision.github.io/posts/001-transformer/)*

Formally, let $x$ denote the input to a sublayer, $F$ the sublayer function (attention or MLP). The Post-LN sublayer computes

$$
x_{k+1} = \operatorname{LayerNorm}\big(x_k + F_k(x_k)\big),
$$

whereas the Pre-LN sublayer computes

$$
x_{k+1} = x_k + F_k\big(\operatorname{LayerNorm}(x_k)\big).
$$

The resulting architecture stabilizes training and allows faster convergence, without the need for the warm-up phase.

However, it was later shown that this architecture leads to representation collapse.
Let $x_a^k$ be the input to block $k$ (the output of the attention plus residual path) and $x_f^k$ the output of its feed-forward sublayer.
The ratio

$$
\frac{\operatorname{Var}\!\left[x_f^k\right]}{\operatorname{Var}\!\left[x_a^k + x_f^k\right]}
$$

is likely to be smaller for higher blocks (i.e., larger $k$). This means that the output of the later blocks ($x_f^k$) contributes little to the total variance of $x_a^k$ [6].

## References

1. Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I. (2017). [*Attention Is All You Need*](https://arxiv.org/abs/1706.03762). NeurIPS 2017.
2. Shazeer, N. (2017). [*Tensors2Tensor commit: Pre-LN Transformer*](https://github.com/tensorflow/tensor2tensor/commit/f5c9b17e617ea9179b7d84d36b1e8162cb369f25).
3. Baevski, A., & Auli, M. (2018). [*Adaptive Input Representations for Neural Language Modeling*](https://arxiv.org/abs/1809.10853). ICLR 2019.
4. Xiong, R., Yang, Y., He, D., Zheng, K., Zheng, S., Xing, C., Zhang, H., Lan, Y., Wang, L., & Liu, T.-Y. (2020). [*On Layer Normalization in the Transformer Architecture*](https://arxiv.org/abs/2002.04745). ICML 2020.
5. Xie, S., Zhang, H., Guo, J., Tan, X., Bian, J., Xu, H., & Wu, Y. (2023). [*ResiDual: Transformer with Dual Residual Connections*](https://arxiv.org/abs/2304.14802).
6. Liu, L., Liu, X., Gao, J., Chen, W., & Han, J. (2020). [*Understanding the Difficulty of Training Transformers*](https://arxiv.org/abs/2004.08249). EMNLP 2020.