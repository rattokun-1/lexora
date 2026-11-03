/* Exploration rules are independent from WebGL and vocabulary selection. */
(function (root) {
  "use strict";
  const ZONES = [
    {
      id: 0,
      name: "風待ちの草原",
      north: -12,
      south: 48,
      center: 0,
      width: 46,
      need: 0,
      color: 0xb8cb87,
      tree: 0x71966b,
    },
    {
      id: 1,
      name: "木漏れ日の森",
      north: -36,
      south: -12,
      center: 4,
      width: 44,
      need: 1,
      color: 0x8eac88,
      tree: 0x3e7564,
    },
    {
      id: 2,
      name: "せせらぎの渓谷",
      north: -60,
      south: -36,
      center: -3,
      width: 43,
      need: 3,
      color: 0xb9b79a,
      tree: 0x77917b,
    },
    {
      id: 3,
      name: "湖畔の遺跡",
      north: -84,
      south: -60,
      center: 2,
      width: 45,
      need: 5,
      color: 0xa8b4a4,
      tree: 0x77958b,
    },
    {
      id: 4,
      name: "白明の山道",
      north: -112,
      south: -84,
      center: 0,
      width: 42,
      need: 8,
      color: 0xe3e8e4,
      tree: 0x8ba9a7,
    },
    {
      id: 5,
      name: "星渡りの高原",
      north: -146,
      south: -112,
      center: 3,
      width: 46,
      need: 12,
      color: 0xa8b9be,
      tree: 0x6f859d,
    },
  ];
  const month = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
    }).format(new Date()),
  );
  const season =
    month >= 3 && month <= 5
      ? "春"
      : month >= 6 && month <= 8
        ? "夏"
        : month >= 9 && month <= 11
          ? "秋"
          : "冬";
  for (const z of ZONES) {
    if (z.id === 4) continue;
    if (season === "秋") {
      z.tree = 0xa97745;
      z.color = z.id === 0 ? 0xc6bb87 : z.color;
    }
    if (season === "冬") {
      z.tree = 0x9cb6ad;
      z.color = 0xd4ded6;
    }
    if (season === "春" && z.id === 0) z.tree = 0xc498b2;
  }
  const eventTitle =
    season === "秋"
      ? "紅葉の散策"
      : season === "冬"
        ? "冬灯りの散策"
        : season === "春"
          ? "花の散策"
          : "星涼みの散策";
  const EVENTS = [
    { id: "winter-lights", start: 1215, end: 108, title: "冬灯りの集い" },
    { id: "spring-blossoms", start: 320, end: 410, title: "花の便り" },
    { id: "summer-stars", start: 701, end: 815, title: "星涼みの夜" },
    { id: "autumn-leaves", start: 1101, end: 1120, title: "紅葉の便り" },
  ];
  function eventAt(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const key =
      Number(parts.find((p) => p.type === "month").value) * 100 +
      Number(parts.find((p) => p.type === "day").value);
    return (
      EVENTS.find((e) =>
        e.start <= e.end ? key >= e.start && key <= e.end : key >= e.start || key <= e.end,
      ) || null
    );
  }
  const POINTS = [
    {
      id: "season-camp",
      kind: "camp",
      x: -14,
      z: 25,
      zone: 0,
      title: eventAt()?.title || eventTitle,
      text: "季節の景色を眺めながら、今日の復習を進められます。通常の学習と同じ出題です。",
    },
    {
      id: "highland-camp",
      kind: "camp",
      x: 0,
      z: -126,
      zone: 5,
      title: "星渡りの野営地",
      text: "高原の灯を目印に、次の復習を確かめよう。",
    },
    {
      id: "wish-shrine",
      kind: "shrine",
      x: -6,
      z: 18,
      zone: 0,
      title: "星灯の祠",
      text: "旅で集めたコインを捧げると、贈り物が届きます。",
    },
    {
      id: "camp",
      kind: "camp",
      x: 0,
      z: 11,
      zone: 0,
      title: "草原の焚き火",
      text: "ひと休みしながら、今のあなたに合う単語を確認できます。",
    },
    {
      id: "keeper",
      kind: "npc",
      x: 5,
      z: 4,
      zone: 0,
      title: "道守のミナ",
      text: "この先の門は、記憶の灯を失っているんだ。ここでも石碑でも、言葉の記憶を確かめてくれないかな。道が戻れば、森へ進めるよ。",
    },
    {
      id: "grass-stone",
      kind: "stone",
      x: -3,
      z: -7,
      zone: 0,
      title: "風の石碑",
      text: "消えかけた文字が、あなたの手の模様に応えている。言葉の記憶を確かめると、門の灯が戻る。",
    },
    {
      id: "forest-stone",
      kind: "stone",
      x: 4,
      z: -29,
      zone: 1,
      title: "森の石碑",
      text: "木々の間から水音が聞こえる。学習を重ねると、渓谷へ続く道が開く。",
    },
    {
      id: "forest-camp",
      kind: "camp",
      x: 8,
      z: -20,
      zone: 1,
      title: "森の野営地",
      text: "次の道へ向かう前に、忘れかけた言葉を確かめよう。",
    },
    {
      id: "valley-keeper",
      kind: "npc",
      x: -5,
      z: -45,
      zone: 2,
      title: "湯守のソウ",
      text: "向こうの遺跡にも、まだ灯が残っているらしい。ここで休んで、旅の記憶を整えていくといい。",
    },
    {
      id: "valley-stone",
      kind: "stone",
      x: 1,
      z: -54,
      zone: 2,
      title: "水音の石碑",
      text: "水面に文字が映っている。言葉を確かめると、湖畔への道が応える。",
    },
    {
      id: "ruins-stone",
      kind: "stone",
      x: 3,
      z: -77,
      zone: 3,
      title: "月の石碑",
      text: "石の扉の奥から、かすかな光が漏れている。記憶を重ねると、山道が開く。",
    },
    {
      id: "snow-camp",
      kind: "camp",
      x: 0,
      z: -96,
      zone: 4,
      title: "山小屋の灯",
      text: "ここまで歩いてきた記憶を、ゆっくり確かめよう。復習は、いつでも続けられる。",
    },
    {
      id: "last-stone",
      kind: "stone",
      x: 4,
      z: -106,
      zone: 4,
      title: "白明の石碑",
      text: "遠くの山並みに灯が連なっている。旅の先でも、新しい言葉と出会えるだろう。",
    },
  ];
  const CHESTS = [
    { id: "highland-chest", x: 10, z: -136, zone: 5, coins: 50 },
    { id: "grass-chest", x: -10, z: 9, zone: 0, coins: 15 },
    { id: "forest-chest", x: 13, z: -25, zone: 1, coins: 20 },
    { id: "valley-chest", x: -12, z: -50, zone: 2, coins: 25 },
    { id: "ruins-chest", x: 13, z: -69, zone: 3, coins: 30 },
    { id: "snow-chest", x: -9, z: -103, zone: 4, coins: 40 },
  ];
  const OBSTACLES = [];
  for (const zone of ZONES)
    for (let i = 0; i < 30; i++) {
      const x = zone.center + Math.sin(i * 2.399 + zone.id) * (zone.width - 4),
        z = zone.north + 4 + ((i * 11.3) % Math.max(8, zone.south - zone.north - 8));
      if (Math.abs(x) < 5) continue;
      if ([...POINTS, ...CHESTS].some((p) => Math.hypot(p.x - x, p.z - z) < 3.5)) continue;
      OBSTACLES.push({
        x,
        z,
        radius: 0.85,
        zone: zone.id,
        kind: zone.id === 2 && i % 4 === 0 ? "rock" : "tree",
      });
    }
  for (const p of POINTS)
    OBSTACLES.push({
      x: p.x,
      z: p.z,
      radius: p.kind === "camp" ? 0.45 : 0.6,
      zone: p.zone,
      kind: "interaction",
    });
  for (const c of CHESTS) OBSTACLES.push({ ...c, radius: 0.7, kind: "chest" });
  OBSTACLES.push(
    { x: 10, z: 15, radius: 3, zone: 0, kind: "building" },
    { x: -7, z: -94, radius: 3, zone: 4, kind: "building" },
  );
  function zoneAt(z) {
    return ZONES.find((zone) => z >= zone.north && z <= zone.south) || null;
  }
  function highest(completed) {
    return ZONES.filter((z) => completed >= z.need).at(-1).id;
  }
  function canWalk(x, z, completed) {
    const zone = zoneAt(z);
    if (!zone || completed < zone.need) return false;
    const bank = zone.width + Math.sin(z * 0.24) * 1.2;
    if (Math.abs(x - zone.center) > bank - 0.6) return false;
    for (const gate of ZONES.slice(1)) {
      if (completed < gate.need && Math.abs(z - gate.south) < 1) return false;
      if (Math.abs(z - gate.south) < 2.2 && Math.abs(x) > 2.4) return false;
    }
    return !OBSTACLES.some(
      (o) => o.zone === zone.id && Math.hypot(x - o.x, z - o.z) < o.radius + 0.38,
    );
  }
  function normalize(saved) {
    const completed = Math.max(0, Math.min(100000, Math.floor(Number(saved?.completed) || 0)));
    const x = Number(saved?.position?.x),
      z = Number(saved?.position?.z);
    return {
      version: 1,
      completed,
      lastLessonId: typeof saved?.lastLessonId === "string" ? saved.lastLessonId.slice(0, 100) : "",
      position:
        Number.isFinite(x) && Number.isFinite(z) && canWalk(x, z, completed)
          ? { x, z }
          : { x: 0, z: 14 },
      chests: [
        ...new Set(
          Array.isArray(saved?.chests)
            ? saved.chests.filter((id) => CHESTS.some((c) => c.id === id))
            : [],
        ),
      ],
    };
  }
  function move(position, dx, dz, completed) {
    let { x, z } = position;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.25));
    for (let i = 0; i < steps; i++) {
      if (canWalk(x + dx / steps, z, completed)) x += dx / steps;
      if (canWalk(x, z + dz / steps, completed)) z += dz / steps;
    }
    return { x, z };
  }
  function nearby(position, saved) {
    const state = normalize(saved);
    return (
      [...POINTS, ...CHESTS.map((c) => ({ ...c, kind: "chest", title: "旅の宝箱" }))]
        .filter(
          (p) =>
            state.completed >= ZONES[p.zone].need &&
            !(p.kind === "chest" && state.chests.includes(p.id)),
        )
        .map((p) => ({
          ...p,
          distance: Math.hypot(p.x - position.x, p.z - position.z),
        }))
        .filter((p) => p.distance <= 3.4)
        .sort((a, b) => a.distance - b.distance)[0] || null
    );
  }
  function complete(saved, id) {
    const state = normalize(saved);
    if (!id || id === state.lastLessonId) return state;
    return { ...state, completed: state.completed + 1, lastLessonId: id };
  }
  function claim(saved, id) {
    const state = normalize(saved),
      chest = CHESTS.find((c) => c.id === id);
    if (
      !chest ||
      state.chests.includes(id) ||
      state.completed < ZONES[chest.zone].need ||
      Math.hypot(state.position.x - chest.x, state.position.z - chest.z) > 3.4
    )
      return null;
    return {
      state: { ...state, chests: [...state.chests, id] },
      coins: chest.coins,
    };
  }
  function objective(saved) {
    const state = normalize(saved),
      next = ZONES.find((z) => z.need > state.completed);
    return next
      ? {
          title: next.id === 1 ? "森のゲートを開く" : next.name + "のゲートを開く",
          remaining: next.need - state.completed,
          zone: next.id,
        }
      : { title: "開いた世界を探索する", remaining: 0, zone: ZONES.length - 1 };
  }
  const api = {
    season,
    eventTitle,
    EVENTS,
    eventAt,
    ZONES,
    POINTS,
    CHESTS,
    OBSTACLES,
    zoneAt,
    highest,
    canWalk,
    normalize,
    move,
    nearby,
    complete,
    claim,
    objective,
  };
  root.TangoAdventure = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
