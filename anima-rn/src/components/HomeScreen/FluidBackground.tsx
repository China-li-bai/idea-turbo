import React, { useMemo } from 'react'
import { Canvas, useClock, Shader, Fill, vec, Skia } from '@shopify/react-native-skia'
import { useDerivedValue } from 'react-native-reanimated'

interface FluidBackgroundProps {
  mood?: string
  intensity?: number
  timeSpeed?: number
}

const MOOD_COLORS: Record<string, { primary: number[]; secondary: number[]; ambient: number[] }> = {
  idle: {
    primary: [15, 23, 42],
    secondary: [30, 41, 59],
    ambient: [51, 65, 105],
  },
  happy: {
    primary: [45, 20, 60],
    secondary: [80, 30, 90],
    ambient: [120, 50, 140],
  },
  sad: {
    primary: [10, 25, 45],
    secondary: [18, 35, 60],
    ambient: [30, 50, 80],
  },
  excited: {
    primary: [60, 15, 50],
    secondary: [100, 30, 80],
    ambient: [150, 50, 120],
  },
  thinking: {
    primary: [20, 30, 50],
    secondary: [35, 50, 75],
    ambient: [55, 75, 110],
  },
  love: {
    primary: [70, 20, 40],
    secondary: [120, 35, 60],
    ambient: [160, 55, 90],
  },
  sleepy: {
    primary: [12, 15, 30],
    secondary: [22, 28, 48],
    ambient: [38, 45, 70],
  },
  angry: {
    primary: [50, 15, 15],
    secondary: [80, 25, 25],
    ambient: [110, 38, 38],
  },
}

const FLUID_SHADER_SKSL = `
uniform float2 resolution;
uniform float time;
uniform float3 colorPrimary;
uniform float3 colorSecondary;
uniform float3 colorAmbient;
uniform float intensity;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187,
                      0.366025403784439,
                     -0.577350269189626,
                      0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m;
  m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0+h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

vec4 main(vec2 pos) {
  vec2 uv = pos / resolution;

  float t = time * 0.001 * 0.15;

  float noise1 = snoise(uv * 2.0 + vec2(t * 0.3, t * 0.2));
  float noise2 = snoise(uv * 4.0 + vec2(-t * 0.2, t * 0.4) + 100.0);
  float noise3 = snoise(uv * 8.0 + vec2(t * 0.5, -t * 0.3) + 200.0);

  float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
  combinedNoise = combinedNoise * 0.5 + 0.5;

  float flow = sin(uv.x * 3.0 + t) * cos(uv.y * 2.0 + t * 0.7) * 0.15;
  combinedNoise += flow * intensity;

  vec3 deepColor = colorPrimary / 255.0;
  vec3 midColor = colorSecondary / 255.0;
  vec3 highlightColor = colorAmbient / 255.0;

  vec3 finalColor;
  if (combinedNoise < 0.4) {
    finalColor = mix(deepColor, midColor, combinedNoise / 0.4);
  } else {
    finalColor = mix(midColor, highlightColor, (combinedNoise - 0.4) / 0.6);
  }

  float vignette = 1.0 - length((uv - 0.5) * 1.5);
  vignette = smoothstep(0.0, 0.7, vignette);

  finalColor *= (0.7 + vignette * 0.3);

  float glow = pow(max(0.0, combinedNoise - 0.6), 2.0) * intensity * 0.5;
  finalColor += highlightColor * glow;

  return vec4(finalColor, 1.0);
}
`

function FluidShader({ mood = 'idle', intensity = 1.0, timeSpeed = 1.0 }: FluidBackgroundProps) {
  const clock = useClock()
  
  const fluidShaderSource = useMemo(() => {
    return Skia.RuntimeEffect.Make(FLUID_SHADER_SKSL)
  }, [])

  if (!fluidShaderSource) {
    return null
  }

  const colors = MOOD_COLORS[mood] || MOOD_COLORS.idle
  
  const uniforms = useDerivedValue(() => {
    return {
      resolution: vec(375, 812),
      time: clock.value * timeSpeed,
      colorPrimary: [colors.primary[0], colors.primary[1], colors.primary[2]],
      colorSecondary: [colors.secondary[0], colors.secondary[1], colors.secondary[2]],
      colorAmbient: [colors.ambient[0], colors.ambient[1], colors.ambient[2]],
      intensity: intensity,
    }
  })

  return (
    <Fill>
      <Shader source={fluidShaderSource} uniforms={uniforms} />
    </Fill>
  )
}

export function FluidBackground({
  mood = 'idle',
  intensity = 1.0,
  timeSpeed = 1.0,
}: FluidBackgroundProps) {
  return (
    <Canvas style={{ flex: 1 }}>
      <FluidShader
        mood={mood}
        intensity={intensity}
        timeSpeed={timeSpeed}
      />
    </Canvas>
  )
}

export default FluidBackground
