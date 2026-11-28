// Estádio moderno do Morais Football, adaptado ao campo e à câmera do jogo principal.
export function buildModernStadium(THREE, scene, mobile = true) {
  const arena = new THREE.Group();
  arena.name = 'Morais Football Modern Arena';
  arena.scale.setScalar(0.44);
  scene.add(arena);

  const material = (color, roughness = 0.78, metalness = 0.08) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const addBox = (w, h, d, mat, x, y, z, parent = arena) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = h > 1.2;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Piso externo e anel estrutural.
  const apron = new THREE.Mesh(new THREE.PlaneGeometry(210, 170), material(0x263443, 0.92));
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.39;
  apron.receiveShadow = true;
  arena.add(apron);

  const concrete = material(0x354454, 0.88);
  const dark = material(0x101d2c, 0.82);
  const seatMats = [0x173e68, 0xb3263b, 0xd6b54b, 0xd9e2e8, 0x176747].map(c => material(c, 0.72));
  const crowdPalette = [0xe8edf4, 0x2f75b9, 0xb92e42, 0xe0bd4d, 0x23845b, 0x252f3d, 0x8a5ab5, 0xd77c43];
  const crowdGeo = new THREE.CapsuleGeometry(0.23, 0.36, 3, 6);
  const crowdMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 });
  const crowd = [];
  const addSpectator = (x, y, z, seed) => crowd.push({ x, y, z, seed });

  // Arquibancadas laterais em cinco níveis, com assentos e corredores.
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 5; tier++) {
      const y = 0.95 + tier * 1.05;
      const z = side * (20.7 + tier * 1.55);
      addBox(119 - tier * 1.3, 0.72, 1.52, concrete, 0, y, z);
      addBox(117 - tier * 1.3, 0.12, 0.16, dark, 0, y + 0.39, z - side * 0.58);
      for (let i = 0; i < 34; i++) {
        const x = -24.5 + i * 1.48;
        addBox(1.15, 0.42, 0.58, seatMats[(i + tier * 2 + (side > 0 ? 0 : 2)) % seatMats.length], x, y + 0.43, z - side * 0.22);
        if (tier % 2 === 0 || i % 2 === 0) addSpectator(x, y + 0.95, z - side * 0.28, i * 13 + tier * 31 + side * 7);
      }
    }
    // Cobertura suspensa e anel luminoso.
    addBox(128, 0.72, 18, material(0x172638, 0.34, 0.62), 0, 18.1, side * 30.2);
    addBox(126, 0.18, 0.34, material(0x39bdf8, 0.28, 0.38), 0, 17.62, side * 38.4);
    for (const x of [-24, -12, 0, 12, 24]) {
      addBox(0.8, 8.5, 0.8, concrete, x, 4.7, side * 29.2);
      addBox(0.9, 0.28, 14, material(0x7f95a8, 0.38, 0.55), x, 17.2, side * 30.2);
    }
  }

  // Arquibancadas atrás dos gols fecham os quatro lados da arena.
  for (const side of [-1, 1]) {
    for (let tier = 0; tier < 5; tier++) {
      const x = side * (25.5 + tier * 1.55);
      const y = 0.9 + tier * 1.05;
      addBox(1.55, 0.72, 76 - tier * 1.5, concrete, x, y, 0);
      addBox(0.16, 0.12, 74 - tier * 1.5, dark, x - side * 0.58, y + 0.39, 0);
      for (let i = 0; i < 23; i++) {
        const z = -16.5 + i * 1.48;
        addBox(0.58, 0.42, 1.12, seatMats[(i + tier + (side > 0 ? 1 : 3)) % seatMats.length], x - side * 0.22, y + 0.43, z);
        if (tier % 2 === 0 || i % 2 === 0) addSpectator(x - side * 0.28, y + 0.95, z, i * 17 + tier * 23 + side * 11);
      }
    }
    addBox(18, 0.72, 88, material(0x172638, 0.34, 0.62), side * 34.1, 18.0, 0);
    addBox(0.34, 0.18, 86, material(0x39bdf8, 0.28, 0.38), side * 43.3, 17.55, 0);
    for (const z of [-16, -8, 0, 8, 16]) addBox(8, 0.28, 0.8, material(0x7f95a8, 0.38, 0.55), side * 34.1, 17.2, z);
  }

  // Público em instâncias: muitos torcedores com poucas chamadas de desenho.
  const fanMesh = new THREE.InstancedMesh(crowdGeo, crowdMat, crowd.length);
  const dummy = new THREE.Object3D();
  crowd.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    dummy.rotation.y = ((p.seed % 9) - 4) * 0.035;
    dummy.scale.set(0.82, 0.9 + (p.seed % 5) * 0.045, 0.82);
    dummy.updateMatrix();
    fanMesh.setMatrixAt(i, dummy.matrix);
    fanMesh.setColorAt(i, new THREE.Color(crowdPalette[Math.abs(p.seed) % crowdPalette.length]));
  });
  fanMesh.instanceMatrix.needsUpdate = true;
  if (fanMesh.instanceColor) fanMesh.instanceColor.needsUpdate = true;
  fanMesh.castShadow = false;
  arena.add(fanMesh);

  // Túneis de acesso atrás das metas, com moldura iluminada.
  const portalMat = new THREE.MeshStandardMaterial({ color: 0x071827, emissive: 0x075985, emissiveIntensity: 0.55 });
  const portalTrim = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 1.1 });
  for (const side of [-1, 1]) {
    for (const z of [-12, 0, 12]) {
      addBox(0.5, 3.7, 5.6, portalMat, side * 25.15, 1.95, z);
      addBox(0.18, 3.9, 5.9, portalTrim, side * 24.86, 1.95, z);
    }
  }

  // Bancos técnicos com cobertura de vidro e estrutura metálica.
  const glass = new THREE.MeshStandardMaterial({ color: 0x65c9ed, transparent: true, opacity: 0.28, roughness: 0.18 });
  const frame = material(0x14263a, 0.42, 0.5);
  for (const zSide of [-1, 1]) {
    const x = 0;
    const z = zSide * 18.5;
    addBox(9.2, 2.1, 0.16, glass, x, 1.12, z);
    addBox(9.5, 0.16, 2.25, glass, x, 2.25, z + zSide * 0.45);
    addBox(8.7, 0.42, 0.62, frame, x, 0.46, z);
    addBox(9.1, 0.12, 0.12, frame, x, 0.38, z - zSide * 1.0);
    addBox(0.14, 2.0, 1.9, glass, -4.55, 1.1, z);
    addBox(0.14, 2.0, 1.9, glass, 4.55, 1.1, z);
  }

  // Painéis de LED perimetrais com textura animada.
  const ledCanvas = document.createElement('canvas');
  ledCanvas.width = 2048; ledCanvas.height = 128;
  const ctx = ledCanvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 2048, 0);
  gradient.addColorStop(0, '#0ea5e9'); gradient.addColorStop(0.5, '#102f4e'); gradient.addColorStop(1, '#16a34a');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 2048, 128);
  ctx.fillStyle = '#f8fafc'; ctx.font = '900 54px Arial'; ctx.textBaseline = 'middle';
  ctx.fillText('MORAIS FOOTBALL  •  JOGUE COM PAIXÃO  •  MORAIS ARENA  •  ', 24, 64);
  const ledTexture = new THREE.CanvasTexture(ledCanvas);
  ledTexture.wrapS = THREE.RepeatWrapping; ledTexture.colorSpace = THREE.SRGBColorSpace;
  const ledMat = new THREE.MeshStandardMaterial({ map: ledTexture, emissiveMap: ledTexture, emissive: 0xffffff, emissiveIntensity: 0.78, roughness: 0.4 });
  for (const side of [-1, 1]) {
    const board = new THREE.Mesh(new THREE.BoxGeometry(112, 1.05, 0.32), ledMat);
    board.position.set(0, 0.58, side * 16.4); arena.add(board);
  }
  const endLedMat = material(0x153d5a, 0.38, 0.25);
  endLedMat.emissive = new THREE.Color(0x0b6b92); endLedMat.emissiveIntensity = 0.65;
  for (const side of [-1, 1]) addBox(0.32, 1.05, 70, endLedMat, side * 25.0, 0.58, 0);

  // Refletores nos quatro cantos: luz sem sombras para preservar FPS no celular.
  const lampHousing = new THREE.MeshStandardMaterial({ color: 0xf4faff, emissive: 0xc9e9ff, emissiveIntensity: 2.0, metalness: 0.25 });
  for (const xSide of [-1, 1]) for (const zSide of [-1, 1]) {
    const x = xSide * 29.5, z = zSide * 26.5;
    addBox(0.42, 8.8, 0.42, material(0x64798c, 0.42, 0.65), x, 4.4, z);
    addBox(3.8, 0.55, 0.85, lampHousing, x, 8.9, z);
    for (let i = 0; i < 5; i++) addBox(0.48, 0.24, 0.1, lampHousing, x - 1.35 + i * 0.68, 8.9, z - 0.46);
    const light = new THREE.PointLight(0xdbeeff, mobile ? 8 : 12, 62, 2);
    light.position.set(x, 8.3, z); light.castShadow = false; arena.add(light);
  }

  // Bandeiras superiores discretas, animadas pelo vento no loop do jogo.
  scene.userData.stadiumFlags = [];
  const flagColors = [0xb8e83f, 0x2d8ed0, 0xe33d50, 0xf0c94e, 0xf2f5f7];
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    const poleGroup = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 3.3, 7), material(0xcbd5df, 0.45, 0.45));
    pole.position.y = 1.65; poleGroup.add(pole);
    const flagGeo = new THREE.BufferGeometry();
    flagGeo.setAttribute('position', new THREE.Float32BufferAttribute([0,3.0,0, 1.55,2.55,0, 0,2.1,0], 3));
    flagGeo.setIndex([0,1,2]); flagGeo.computeVertexNormals();
    const cloth = new THREE.Mesh(flagGeo, new THREE.MeshStandardMaterial({ color: flagColors[(i + (side > 0 ? 0 : 2)) % flagColors.length], side: THREE.DoubleSide, roughness: 0.78 }));
    poleGroup.add(cloth);
    poleGroup.position.set(-21 + i * 8.4, 7.9, side * 29.0);
    arena.add(poleGroup);
    scene.userData.stadiumFlags.push({ cloth, phase: i * 0.75 + side });
  }

  scene.userData.stadiumLEDTextures = [ledTexture];
  scene.userData.stadiumArena = arena;
  return arena;
}
