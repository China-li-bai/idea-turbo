import { TextSegmenter } from './lib/textSegmenter';

const segmenter = new TextSegmenter('zh-CN', {
  minLength: 50,
  maxLength: 200
});

const text = '短句一。短句二。短句三。短句四。短句五。短句六。短句七。短句八。短句九。短句十。';
const segments = segmenter.segment(text);

console.log('Segments:', segments);
console.log('Number of segments:', segments.length);
segments.forEach((segment, index) => {
  console.log(`Segment ${index}: length=${segment.text.length}, text="${segment.text}"`);
});
