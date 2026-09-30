/* Witherholm — shaders.
   1. Post-process pass: low-res render upscaled with barrel warp, chromatic
      aberration, film grain, scanlines, colour grade, ordered dithering and
      damage / low-health effects.
   2. World material patch: fungal mould that spreads across every surface and
      glows faintly, getting thicker the closer you get to the chapel.
   3. Flesh material patch: breathing vertex displacement, pulsing veins,
      hit flash and a burning dissolve when a monster dies.
   4. Dust motes that only show up inside the flashlight beam.
   5. A small particle system for blood and sparks. */

const GLSL_NOISE = /* glsl */`
float wh_hash3(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float wh_noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(wh_hash3(i + vec3(0,0,0)), wh_hash3(i + vec3(1,0,0)), f.x),
                 mix(wh_hash3(i + vec3(0,1,0)), wh_hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(wh_hash3(i + vec3(0,0,1)), wh_hash3(i + vec3(1,0,1)), f.x),
                 mix(wh_hash3(i + vec3(0,1,1)), wh_hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
`;

const Shaders = (() => {
  // shared by every patched world material
  const worldUniforms = {
    uTime: { value: 0 },
    uInfect: { value: new THREE.Vector2(0, 0) },
  };

  // ---------- 1. post-processing ----------
  function makePostMaterial(texture) {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: texture },
        uRes: { value: new THREE.Vector2(320, 180) },
        uTime: { value: 0 },
        uDamage: { value: 0 },
        uLow: { value: 0 },
        uBeat: { value: 0 },
        uFade: { value: 0 },
        uRed: { value: 0 },
        uWarp: { value: 0 },
      },
      depthTest: false, depthWrite: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: /* glsl */`
        uniform sampler2D tDiffuse;
        uniform vec2 uRes;
        uniform float uTime, uDamage, uLow, uBeat, uFade, uRed, uWarp;
        varying vec2 vUv;

        float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
        float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
        float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

        void main() {
          vec2 cc = vUv - 0.5;
          float r2 = dot(cc, cc);

          // lens barrel + a sickly wobble when badly hurt or when the boss screams
          float wob = (uLow * 0.004 + uWarp * 0.012) * sin(uTime * 2.3 + vUv.y * 9.0);
          vec2 uv = 0.5 + cc * (1.0 + 0.085 * r2) + vec2(wob, 0.0);

          // chromatic aberration grows toward the edges and when hit
          float ab = (0.0012 + uDamage * 0.012 + uLow * 0.003 + uWarp * 0.01) * (0.4 + r2 * 3.0);
          vec2 dir = normalize(cc + 1e-5);
          vec3 col;
          col.r = texture2D(tDiffuse, uv + dir * ab).r;
          col.g = texture2D(tDiffuse, uv).g;
          col.b = texture2D(tDiffuse, uv - dir * ab).b;

          // colour grade: cold desaturated shadows, dirty warm highlights
          float l = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(l), col, 0.8 - uLow * 0.45);
          col = mix(col * vec3(0.86, 1.0, 0.96), col * vec3(1.08, 1.0, 0.86), smoothstep(0.05, 0.6, l));
          col = pow(max(col, 0.0), vec3(0.95));

          // vignette, pulsing with the heartbeat when low
          float vig = smoothstep(0.95, 0.25, length(cc * vec2(1.15, 1.0)) * (1.25 + uLow * 0.3 + uBeat * uLow * 0.25));
          col *= mix(0.25, 1.0, vig);

          // blood at the edges when taking damage
          float edge = 1.0 - vig;
          col = mix(col, vec3(0.55, 0.0, 0.02), clamp(uDamage * 0.9 + uLow * uBeat * 0.35, 0.0, 1.0) * edge);
          col = mix(col, col * vec3(1.2, 0.25, 0.2), uRed);

          // film grain in low-res pixel space
          vec2 px = floor(vUv * uRes);
          col += (rand(px + fract(uTime * 13.7)) - 0.5) * 0.075;

          // faint scanlines and a rolling bar
          col *= 0.93 + 0.07 * sin(vUv.y * uRes.y * 3.14159);
          col *= 1.0 - 0.035 * smoothstep(0.0, 0.08, abs(fract(vUv.y * 0.5 - uTime * 0.05) - 0.5));

          // ordered dither + colour quantisation
          float levels = 30.0;
          col = floor(col * levels + bayer4(px)) / levels;

          // outside the lens stays black
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);

          gl_FragColor = vec4(col * (1.0 - uFade), 1.0);
        }
      `,
    });
  }

  // ---------- 2. world surfaces ----------
  function patchWorld(mat, { mould = 1 } = {}) {
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = worldUniforms.uTime;
      shader.uniforms.uInfect = worldUniforms.uInfect;
      shader.uniforms.uMould = { value: mould };
      shader.vertexShader = 'varying vec3 vWPos;\n' + shader.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
      shader.fragmentShader = 'uniform float uTime; uniform vec2 uInfect; uniform float uMould; varying vec3 vWPos;\n' + GLSL_NOISE +
        shader.fragmentShader.replace('#include <emissivemap_fragment>', /* glsl */`
          #include <emissivemap_fragment>
          {
            float infect = smoothstep(34.0, 3.0, distance(vWPos.xz, uInfect));
            float m = wh_noise(vWPos * 0.7) * 0.6 + wh_noise(vWPos * 2.1 + 7.0) * 0.4;
            float th = 0.64 - infect * 0.24;
            float mould = smoothstep(th, th + 0.12, m) * uMould;
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.35, 0.38, 0.22), mould * 0.8);
            float spots = smoothstep(0.83, 0.9, wh_noise(vWPos * 5.5)) * mould;
            float pulse = 0.55 + 0.45 * sin(uTime * 1.6 + vWPos.x * 1.3 + vWPos.z * 0.7);
            totalEmissiveRadiance += vec3(0.62, 0.55, 0.14) * spots * pulse * (0.12 + infect * 0.7);
          }
        `);
    };
    mat.customProgramCacheKey = () => 'wh-world';
    return mat;
  }

  // ---------- 3. monster flesh ----------
  function makeFleshUniforms(glow) {
    return {
      uTime: { value: 0 },
      uHit: { value: 0 },
      uDissolve: { value: 0 },
      uPulse: { value: 0.02 },
      uGlow: { value: new THREE.Color(glow || 0xd8c040) },
      uRage: { value: 0 },
    };
  }
  function patchFlesh(mat, U, { veins = 1 } = {}) {
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, U);
      shader.uniforms.uVeins = { value: veins };
      shader.vertexShader = 'uniform float uTime; uniform float uPulse; varying vec3 vObj;\n' + GLSL_NOISE +
        shader.vertexShader.replace('#include <begin_vertex>', /* glsl */`
          #include <begin_vertex>
          vObj = position;
          float bn = wh_noise(position * 5.0 + vec3(0.0, uTime * 1.7, uTime * 0.6));
          transformed += normal * (bn - 0.5) * uPulse * 2.0;
        `);
      shader.fragmentShader = 'uniform float uTime, uHit, uDissolve, uRage, uVeins; uniform vec3 uGlow; varying vec3 vObj;\n' + GLSL_NOISE +
        shader.fragmentShader
          .replace('#include <clipping_planes_fragment>', /* glsl */`
            #include <clipping_planes_fragment>
            float dn = wh_noise(vObj * 9.0) * 0.7 + wh_noise(vObj * 23.0) * 0.3;
            if (dn < uDissolve * 1.15 - 0.05) discard;
          `)
          .replace('#include <emissivemap_fragment>', /* glsl */`
            #include <emissivemap_fragment>
            float vn = abs(wh_noise(vObj * 11.0 + vec3(0.0, uTime * 0.15, 0.0)) - 0.5);
            float vein = smoothstep(0.06, 0.0, vn) * uVeins;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.02, 0.03), vein * 0.7);
            float beat = 0.5 + 0.5 * sin(uTime * (3.0 + uRage * 5.0) - vObj.y * 6.0);
            totalEmissiveRadiance += uGlow * vein * beat * (0.35 + uRage * 0.8);
            totalEmissiveRadiance += vec3(0.5, 0.05, 0.02) * uRage * 0.25;
            float edge = (1.0 - smoothstep(0.0, 0.07, dn - (uDissolve * 1.15 - 0.05))) * step(0.001, uDissolve);
            totalEmissiveRadiance += vec3(1.0, 0.5, 0.12) * edge * 2.5;
            totalEmissiveRadiance += vec3(1.0, 0.85, 0.8) * uHit;
          `);
    };
    mat.customProgramCacheKey = () => 'wh-flesh';
    return mat;
  }

  // ---------- 4. dust in the beam ----------
  function makeDust(count = 700) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3), seed = new Float32Array(count);
    for (let i = 0; i < count; i++) { pos[i * 3] = Math.random(); pos[i * 3 + 1] = Math.random(); pos[i * 3 + 2] = Math.random(); seed[i] = Math.random(); }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(14, 3.3, 14) },
        uFlashPos: { value: new THREE.Vector3() }, uFlashDir: { value: new THREE.Vector3(0, 0, -1) }, uFlashOn: { value: 1 },
        uScale: { value: 200 },
      },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        attribute float seed;
        uniform float uTime, uFlashOn, uScale;
        uniform vec3 uCenter, uBox, uFlashPos, uFlashDir;
        varying float vA;
        void main() {
          vec3 p = position * uBox;
          p += vec3(sin(uTime * 0.21 + seed * 40.0) * 0.6, -uTime * (0.03 + seed * 0.05), cos(uTime * 0.17 + seed * 25.0) * 0.6);
          vec3 base = vec3(uCenter.x - uBox.x * 0.5, 0.0, uCenter.z - uBox.z * 0.5);
          p = base + mod(p - base, uBox);
          vec3 toP = p - uFlashPos;
          float d = length(toP);
          float c = dot(toP / max(d, 0.001), uFlashDir);
          float beam = smoothstep(0.9, 0.97, c) * uFlashOn * smoothstep(13.0, 1.0, d);
          vA = beam * 0.85 + 0.03;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = max(1.0, (0.018 + seed * 0.02) * uScale / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying float vA;
        void main() {
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5) discard;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.8) * vA * (1.0 - r * 1.6), 1.0);
        }
      `,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }

  // ---------- 5. blood & sparks ----------
  function makeParticles(max = 500) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(max * 3), col = new Float32Array(max * 3), size = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('pcolor', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('psize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 200 } },
      transparent: true, depthWrite: false,
      vertexShader: /* glsl */`
        attribute vec3 pcolor; attribute float psize; uniform float uScale; varying vec3 vC;
        void main() {
          vC = pcolor;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize <= 0.0 ? 0.0 : max(1.0, psize * uScale / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */`
        varying vec3 vC;
        void main() { if (length(gl_PointCoord - 0.5) > 0.5) discard; gl_FragColor = vec4(vC, 1.0); }
      `,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    const P = [];
    for (let i = 0; i < max; i++) P.push({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 0, g: 0, b: 0, s: 0, grav: 9, glow: false });
    let cursor = 0;

    function emit(x, y, z, n, kind, dir) {
      for (let k = 0; k < n; k++) {
        const p = P[cursor]; cursor = (cursor + 1) % max;
        p.x = x; p.y = y; p.z = z;
        const sp = kind === 'spark' ? 4 + Math.random() * 4 : 1.5 + Math.random() * 3.5;
        let vx = (Math.random() - 0.5), vy = Math.random() * 0.9, vz = (Math.random() - 0.5);
        if (dir) { vx += dir.x * 0.9; vy += dir.y * 0.9; vz += dir.z * 0.9; }
        const l = Math.hypot(vx, vy, vz) || 1;
        p.vx = vx / l * sp; p.vy = vy / l * sp; p.vz = vz / l * sp;
        p.life = kind === 'spark' ? 0.25 + Math.random() * 0.2 : 0.6 + Math.random() * 0.6;
        p.grav = kind === 'spark' ? 6 : 11;
        if (kind === 'spark') { p.r = 1.0; p.g = 0.65 + Math.random() * 0.3; p.b = 0.25; p.s = 0.03; }
        else if (kind === 'spore') { p.r = 0.75; p.g = 0.68; p.b = 0.25; p.s = 0.04; p.grav = -0.4; p.life = 1.5 + Math.random(); p.vx *= 0.3; p.vy *= 0.3; p.vz *= 0.3; }
        else if (kind === 'dust') { p.r = 0.35; p.g = 0.33; p.b = 0.3; p.s = 0.05; p.grav = 1; }
        else { const v = 0.25 + Math.random() * 0.2; p.r = v; p.g = 0.01; p.b = 0.02; p.s = 0.035 + Math.random() * 0.04; }
      }
    }

    function update(dt) {
      for (let i = 0; i < max; i++) {
        const p = P[i];
        if (p.life > 0) {
          p.life -= dt;
          p.vy -= p.grav * dt;
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          if (p.y < 0.02) { p.y = 0.02; p.vx *= 0.3; p.vz *= 0.3; p.vy = 0; }
          pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
          col[i * 3] = p.r; col[i * 3 + 1] = p.g; col[i * 3 + 2] = p.b;
          size[i] = p.life > 0 ? p.s : 0;
        } else size[i] = 0;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.pcolor.needsUpdate = true;
      geo.attributes.psize.needsUpdate = true;
    }
    function clear() { P.forEach(p => { p.life = 0; }); }
    return { points: pts, emit, update, clear, material: mat };
  }

  return { worldUniforms, makePostMaterial, patchWorld, makeFleshUniforms, patchFlesh, makeDust, makeParticles };
})();
