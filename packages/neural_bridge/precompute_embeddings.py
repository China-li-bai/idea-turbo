import json
import os
import sys
import numpy as np
import onnxruntime as ort
from transformers import AutoTokenizer

FIXTURES_DIR = os.path.join(os.path.dirname(__file__), 'test', 'fixtures')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), 'test', 'fixtures', 'embeddings')
MODEL_DIR = os.path.expanduser(
    '~/.cache/huggingface/hub/models--onnx-community--embeddinggemma-300m-ONNX/'
    'snapshots/5090578d9565bb06545b4552f76e6bc2c93e4a66'
)

os.makedirs(OUTPUT_DIR, exist_ok=True)

MRL_DIMS = [768, 256]

print("Loading EmbeddingGemma 300M ONNX model...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
onnx_model_path = os.path.join(MODEL_DIR, 'onnx', 'model_quantized.onnx')
sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
session = ort.InferenceSession(onnx_model_path, sess_options, providers=['CPUExecutionProvider'])
print(f"Model loaded. Inputs: {[i.name for i in session.get_inputs()]}")
print(f"Outputs: {[(o.name, o.shape) for o in session.get_outputs()]}")


def embed_texts(texts, batch_size=16, max_length=512):
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        encoded = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=max_length,
            return_tensors='np',
        )
        input_ids = encoded['input_ids'].astype(np.int64)
        attention_mask = encoded['attention_mask'].astype(np.int64)

        outputs = session.run(['sentence_embedding'], {
            'input_ids': input_ids,
            'attention_mask': attention_mask,
        })
        sentence_emb = outputs[0]

        norms = np.linalg.norm(sentence_emb, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        normalized = sentence_emb / norms

        all_embeddings.append(normalized)

        if (i // batch_size) % 10 == 0:
            pct = min(i + batch_size, len(texts))
            print(f"  Embedded {pct}/{len(texts)} texts")

    full_emb = np.vstack(all_embeddings)
    print(f"  Full embedding shape: {full_emb.shape}")

    results = {}
    for dim in MRL_DIMS:
        truncated = full_emb[:, :dim].copy()
        norms = np.linalg.norm(truncated, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        truncated = truncated / norms
        results[dim] = truncated
    return results


def save_embeddings(texts, embeddings_dict, output_path):
    data = {}
    for i, text in enumerate(texts):
        entry = {}
        for dim in MRL_DIMS:
            entry[f"dim_{dim}"] = embeddings_dict[dim][i].tolist()
        data[text] = entry
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  Saved {len(texts)} embeddings ({size_mb:.1f} MB) to {output_path}")


def collect_locomo_texts():
    texts = set()
    data_path = os.path.join(FIXTURES_DIR, 'locomo', 'data', 'locomo10.json')
    if os.path.exists(data_path):
        with open(data_path, 'r') as f:
            data = json.load(f)
        for conv in data:
            for session in conv.get('conversation', {}).get('sessions', []):
                for turn in session.get('turns', []):
                    content = turn.get('content', '').strip()
                    if content:
                        texts.add(content)
            for qa in conv.get('qa', []):
                q = qa.get('question', '').strip()
                if q:
                    texts.add(q)
                for a in qa.get('answers', []):
                    a_text = a.get('answer', '').strip() if isinstance(a, dict) else str(a).strip()
                    if a_text:
                        texts.add(a_text)
    return list(texts)


def collect_membench_texts():
    texts = set()
    membench_dir = os.path.join(FIXTURES_DIR, 'membench', 'MemData')
    if not os.path.isdir(membench_dir):
        return list(texts)
    for agent in os.listdir(membench_dir):
        agent_path = os.path.join(membench_dir, agent)
        if not os.path.isdir(agent_path):
            continue
        for fname in os.listdir(agent_path):
            if not fname.endswith('.json'):
                continue
            fpath = os.path.join(agent_path, fname)
            with open(fpath, 'r') as f:
                data = json.load(f)
            if not isinstance(data, dict):
                continue
            for category_key, category in data.items():
                if not isinstance(category, dict):
                    continue
                for diff_key, diff_data in category.items():
                    items = diff_data if isinstance(diff_data, list) else [diff_data] if isinstance(diff_data, dict) else []
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        for msg in item.get('message_list', []):
                            if isinstance(msg, dict):
                                content = msg.get('message', '') or msg.get('user_message', '') or msg.get('assistant_message', '')
                                if isinstance(content, str) and content.strip():
                                    texts.add(content.strip())
                            elif isinstance(msg, list):
                                for sub in msg:
                                    if isinstance(sub, dict):
                                        for k in ['message', 'user_message', 'assistant_message']:
                                            c = sub.get(k, '')
                                            if isinstance(c, str) and c.strip():
                                                texts.add(c.strip())
                        for qa in item.get('QA', []):
                            if isinstance(qa, dict):
                                q = qa.get('question', '').strip()
                                if q:
                                    texts.add(q)
    return list(texts)


def collect_beir_texts():
    texts = set()
    corpus_path = os.path.join(FIXTURES_DIR, 'beir', 'scifact', 'corpus.jsonl')
    if os.path.exists(corpus_path):
        with open(corpus_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                doc = json.loads(line)
                title = doc.get('title', '').strip()
                text = doc.get('text', '').strip()
                if title:
                    texts.add(title)
                if text:
                    texts.add(text)
    queries_path = os.path.join(FIXTURES_DIR, 'beir', 'scifact', 'queries.jsonl')
    if os.path.exists(queries_path):
        with open(queries_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                query = json.loads(line)
                q = query.get('text', '').strip()
                if q:
                    texts.add(q)
    return list(texts)


def collect_longmemeval_texts():
    texts = set()
    oracle_path = os.path.join(FIXTURES_DIR, 'longmemeval', 'longmemeval_oracle.json')
    if os.path.exists(oracle_path):
        with open(oracle_path, 'r') as f:
            data = json.load(f)
        for instance in data:
            q = instance.get('question', '').strip()
            if q:
                texts.add(q)
            a = instance.get('answer')
            a_str = str(a).strip() if a is not None else ''
            if a_str and len(a_str) > 5:
                texts.add(a_str)
            for session in instance.get('haystack_sessions', []):
                for turn in session:
                    content = turn.get('content', '').strip() if isinstance(turn, dict) else ''
                    if content:
                        texts.add(content)
    return list(texts)


print("\n=== Collecting texts from all datasets ===")
all_texts = set()
datasets = {
    'locomo': collect_locomo_texts,
    'membench': collect_membench_texts,
    'beir': collect_beir_texts,
    'longmemeval': collect_longmemeval_texts,
}

for name, collector in datasets.items():
    texts = collector()
    print(f"  {name}: {len(texts)} unique texts")
    all_texts.update(texts)

all_texts = list(all_texts)
print(f"\nTotal unique texts to embed: {len(all_texts)}")

if len(all_texts) == 0:
    print("No texts found! Check fixture paths.")
    sys.exit(1)

print(f"\n=== Computing EmbeddingGemma embeddings ===")
embeddings_dict = embed_texts(all_texts, batch_size=16)

output_path = os.path.join(OUTPUT_DIR, 'embeddinggemma_300m.json')
save_embeddings(all_texts, embeddings_dict, output_path)

print(f"\n=== Done! ===")
print(f"Output: {output_path}")
print(f"Total entries: {len(all_texts)}")
print(f"Dimensions: {MRL_DIMS}")
