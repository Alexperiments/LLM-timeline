# LLM Timeline

## Writing math in lessons

Lesson Markdown supports LaTeX math rendered with KaTeX. Use `$p_i$` for inline
math and `$$` on separate lines for display equations:

```md
The position embedding is $p_i$.

$$
z_i = x_i + p_i
$$
```

Use dollar delimiters rather than `\( … \)` or `\[ … \]`. Escape literal dollar
signs as `\$` in prose. Math inside inline code or fenced code blocks stays literal.

## TODO
- [x] Handle crowded ideas areas: overlapping punctual ideas collapse into an aggregated node showing their count; clicking zooms the timeline to expand them, or shows a dropdown when they cannot be separated (e.g. same day).
- [ ] Design the practice idea visualization.
- [ ] Improve idea name label on hover. Maybe it's better to transform the point into the label, keeping the style and animation.
- [ ] Fix slider's thumbs overlap
- [ ] Fix lane width

## Ideas roadmap

### Pretraining & Training Recipes

- [ ] Generative pretraining followed by task fine-tuning
- [ ] Pretraining recipe optimization
- [ ] Dynamic masking
- [ ] Permutation language modeling
- [ ] Span-corruption pretraining
- [ ] Denoising sequence-to-sequence pretraining
- [ ] Empirical scaling-law modeling
- [ ] Compute-optimal model and data allocation
- [ ] Extensive pretraining of compact models
- [ ] Controlled synthetic pretraining corpora
- [ ] Proxy-based data-mixture optimization
- [ ] Long-context adaptation after base pretraining
- [ ] Low-precision large-model training
- [ ] Early text-vision fusion during pretraining

#### Training Objectives & Tokenization
- [ ] Masked-language modeling
- [ ] Next-sentence prediction
- [ ] Sentence-order prediction
- [ ] Sentence embedding training
- [ ] Byte-level text tokenization
- [ ] Replaced-token detection
- [ ] Factorized token embeddings
- [ ] Fill-in-the-middle training
- [ ] Multi-token prediction objectives
- [ ] Masked diffusion language modeling

### Model Architecture

- [ ] Bidirectional encoder attention
- [ ] Relative positional attention
- [ ] Root-mean-square normalization
- [ ] Gated feed-forward layers
- [ ] Cross-layer parameter sharing
- [ ] Multi-query attention
- [ ] Rotary position embeddings
- [ ] Linear positional attention biases
- [ ] Grouped-query attention
- [ ] Multi-head latent attention
- [ ] Selective state-space sequence modeling
- [ ] Hybrid attention and state-space layers
- [ ] Gated delta-network sequence layers

#### Attention Efficiency
- [ ] Memory-aware exact attention
- [ ] Paged attention-cache management
- [ ] Learned selection for sparse attention
- [ ] Compressed sparse attention
- [ ] Heavily compressed attention

#### Local & Sparse Attention
- [ ] Local-window attention with global tokens
- [ ] Random connections in sparse attention

#### Mixture of Experts
- [ ] Sparse expert routing
- [ ] Fine-grained expert specialization
- [ ] Shared experts alongside routed experts
- [ ] Auxiliary-loss-free expert load balancing

#### Multimodal Architecture
- [ ] Visual feature resampling
- [ ] Gated visual cross-attention
- [ ] Query-based vision-language bridging
- [ ] Broad multimodal model families

#### Residual Connections
- [ ] Manifold-constrained hyper-connections

### Post-Training & Alignment

- [ ] Instruction tuning
- [ ] Preference reward modeling
- [ ] Reinforcement learning from human feedback
- [ ] Direct preference optimization
- [ ] Reinforcement learning from AI preferences
- [ ] Process-level reward supervision
- [ ] Group-relative policy optimization
- [ ] Synthetic instruction-data generation
- [ ] Principle-guided critique and revision
- [ ] Training controllable thinking modes

#### Efficient Adaptation
- [ ] Adapter-based fine-tuning
- [ ] Continuous prefix tuning
- [ ] Low-rank adaptation
- [ ] Low-rank adaptation of quantized models

#### Reasoning RL Pipelines
- [ ] Bootstrapping reasoning training data
- [ ] Cold-start reasoning supervision before RL
- [ ] Reasoning RL without preliminary supervised fine-tuning
- [ ] Asymmetric policy-ratio clipping
- [ ] Dynamic sampling for informative RL groups
- [ ] Token-level policy-loss aggregation
- [ ] Length-aware reward handling

#### Distillation & Specialist Training
- [ ] Teacher-student language-model distillation
- [ ] Reasoning-trace distillation
- [ ] Training domain specialists before consolidation
- [ ] On-policy specialist distillation
- [ ] MuonClip optimizer stabilization
- [ ] Muon optimization for model training

### Agent Systems & Inference

- [ ] Retrieval-augmented generation
- [ ] Few-shot in-context learning
- [ ] Chain-of-thought prompting
- [ ] Self-consistency decoding
- [ ] Reasoning-action-observation loops
- [ ] Program-aided reasoning
- [ ] Search over intermediate reasoning states
- [ ] Structured function calling
- [ ] Schema-constrained decoding

#### Agent Memory & Skills
- [ ] Reflection stored in external memory
- [ ] Persistent executable skill libraries
- [ ] Automatic agent curricula

#### Agent Coordination
- [ ] Conversation-based multi-agent coordination
- [ ] Standardized tool and context interfaces
- [ ] Routing between fast and reasoning models
- [ ] Reinforcement learning for parallel delegation
- [ ] Asynchronous agent reinforcement-learning infrastructure

#### Interactive Agents
- [ ] Training browsing policies from demonstrations and feedback
- [ ] Screenshot-driven computer interaction
- [ ] Generating interactive tasks for agent training
- [ ] Reinforcement learning from interactive task outcomes

#### Code
- [ ] Code-specialized language-model training
- [ ] Execution-based evaluation of generated code
- [ ] Prediction-based filtering of synthetic tool calls

### Model Execution & Serving

- [ ] Tensor model parallelism
- [ ] Training-state sharding
- [ ] Speculative decoding
- [ ] Outlier-aware mixed-precision quantization
- [ ] Error-compensated weight quantization

### Capability Landmarks (Validation & Evaluation)

- [ ] Zero-shot task behavior from language-model pretraining
- [ ] Broad image-and-text question answering
- [ ] Million-token multimodal context
- [ ] Unified text-vision-audio interaction
- [ ] RL-trained extended reasoning
- [ ] Tool use integrated into extended reasoning
- [ ] Parallel inference-time reasoning