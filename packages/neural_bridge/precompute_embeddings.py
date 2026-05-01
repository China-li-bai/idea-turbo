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

print("Loading EmbeddingGemma 300M ONNX model...", flush=True)
tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
onnx_model_path = os.path.join(MODEL_DIR, 'onnx', 'model_quantized.onnx')
sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
session = ort.InferenceSession(onnx_model_path, sess_options, providers=['CPUExecutionProvider'])
print(f"Model loaded. Outputs: {[(o.name, o.shape) for o in session.get_outputs()]}", flush=True)


def embed_texts(texts, batch_size=16, max_length=512):
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        encoded = tokenizer(
            batch, padding=True, truncation=True,
            max_length=max_length, return_tensors='np',
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

        if (i // batch_size) % 20 == 0:
            print(f"  {min(i + batch_size, len(texts))}/{len(texts)}", end='', flush=True)
        else:
            print('.', end='', flush=True)

    print(flush=True)
    full_emb = np.vstack(all_embeddings)
    print(f"  Shape: {full_emb.shape}", flush=True)

    results = {}
    for dim in MRL_DIMS:
        truncated = full_emb[:, :dim].copy()
        norms = np.linalg.norm(truncated, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        truncated = truncated / norms
        results[dim] = truncated
    return results


def save_dataset(texts, embeddings_dict, dataset_name):
    texts_path = os.path.join(OUTPUT_DIR, f'{dataset_name}_texts.json')
    with open(texts_path, 'w', encoding='utf-8') as f:
        json.dump(texts, f, ensure_ascii=False)

    for dim in MRL_DIMS:
        npy_path = os.path.join(OUTPUT_DIR, f'{dataset_name}_dim{dim}.npy')
        np.save(npy_path, embeddings_dict[dim])

    print(f"  Saved {len(texts)} texts + embeddings for {dataset_name}", flush=True)


def collect_locomo_texts():
    texts = []
    seen = set()
    data_path = os.path.join(FIXTURES_DIR, 'locomo', 'data', 'locomo10.json')
    if os.path.exists(data_path):
        with open(data_path, 'r') as f:
            data = json.load(f)
        for conv in data:
            conversation = conv.get('conversation', {})
            for key in conversation:
                if key.startswith('session_') and not key.endswith('date_time'):
                    session = conversation[key]
                    if isinstance(session, list):
                        for turn in session:
                            content = turn.get('text', '').strip() if isinstance(turn, dict) else ''
                            if content and content not in seen:
                                texts.append(content)
                                seen.add(content)
            for qa in conv.get('qa', []):
                q = qa.get('question', '').strip()
                if q and q not in seen:
                    texts.append(q)
                    seen.add(q)
                a = qa.get('answer', '').strip() if isinstance(qa.get('answer'), str) else ''
                if a and a not in seen:
                    texts.append(a)
                    seen.add(a)
    return texts


def collect_beir_texts():
    texts = []
    seen = set()
    corpus_path = os.path.join(FIXTURES_DIR, 'beir', 'scifact', 'corpus.jsonl')
    if os.path.exists(corpus_path):
        with open(corpus_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line: continue
                doc = json.loads(line)
                title = doc.get('title', '').strip()
                text = doc.get('text', '').strip()
                full_text = f'{title}. {text}'.strip() if title else text
                for t in [full_text, title, text]:
                    if t and t not in seen:
                        texts.append(t)
                        seen.add(t)
    queries_path = os.path.join(FIXTURES_DIR, 'beir', 'scifact', 'queries.jsonl')
    if os.path.exists(queries_path):
        with open(queries_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line: continue
                query = json.loads(line)
                q = query.get('text', '').strip()
                if q and q not in seen:
                    texts.append(q)
                    seen.add(q)
    return texts


def collect_longmemeval_texts():
    texts = []
    seen = set()
    oracle_path = os.path.join(FIXTURES_DIR, 'longmemeval', 'longmemeval_oracle.json')
    if os.path.exists(oracle_path):
        with open(oracle_path, 'r') as f:
            data = json.load(f)
        for instance in data:
            q = instance.get('question', '').strip()
            if q and q not in seen:
                texts.append(q)
                seen.add(q)
            for session in instance.get('haystack_sessions', []):
                for turn in session:
                    content = turn.get('content', '').strip() if isinstance(turn, dict) else ''
                    if content and content not in seen:
                        texts.append(content)
                        seen.add(content)
    return texts


datasets = {
    'locomo': collect_locomo_texts,
    'beir': collect_beir_texts,
    'longmemeval': collect_longmemeval_texts,
}

for name, collector in datasets.items():
    print(f"\n=== Processing {name} ===", flush=True)
    texts = collector()
    print(f"  Collected {len(texts)} unique texts", flush=True)

    if len(texts) == 0:
        print(f"  Skipping {name} - no texts found", flush=True)
        continue

    embeddings_dict = embed_texts(texts, batch_size=16)
    save_dataset(texts, embeddings_dict, name)

print("\n=== All datasets processed! ===", flush=True)
print(f"Output directory: {OUTPUT_DIR}", flush=True)
for f in sorted(os.listdir(OUTPUT_DIR)):
    size_mb = os.path.getsize(os.path.join(OUTPUT_DIR, f)) / (1024 * 1024)
    print(f"  {f}: {size_mb:.1f} MB", flush=True)
