import { TextSegmenter } from './party/modules/segmenter';

const segmenter = new TextSegmenter();

const testText = "这是一个测试句子。这是第二个句子！这是第三个句子？\n\n这是第二段的第一句。这是第二段的第二句。";

console.log('Testing sentence-splitter integration...');
console.log('Input text:', testText);

const segments = segmenter.segment(testText);

console.log('Segments:', segments);
console.log('Number of segments:', segments.length);

if (segments.length > 0) {
  console.log('✓ Sentence-splitter is working correctly');
  segments.forEach((segment: any, index: number) => {
    console.log(`Segment ${index}: "${segment.text}"`);
  });
} else {
  console.log('✗ Sentence-splitter returned no segments');
}
