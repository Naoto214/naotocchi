(() => {
  const scene = new URLSearchParams(location.search).get('scene');
  const scenes = document.querySelector('#compare select');
  if ([...scenes.options].some(option => option.value === scene)) scenes.value = scene;
  const roster = window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;
  const form = document.getElementById('scenario');
  const mainKey = 'naotocchi-v14-scenario-v1';
  const label = document.getElementById('error');
  const regions = [roster.regions.home, ...roster.regions.normal, ...roster.regions.special];
  for (const {id, label} of regions) form.elements.region.add(new Option(label, id));
  form.elements.region.value = 'forest';
  const resume = document.getElementById('resume');
  try {
    resume.hidden = !localStorage.getItem(mainKey);
  } catch { label.textContent = '試遊用セーブを読み込めませんでした。'; }
  resume.onclick = () => location.assign('./game/trial.html');
  document.getElementById('ordinary').onclick = () => location.assign('./game/');
  form.onsubmit = event => {
    event.preventDefault();
    if (!resume.hidden && !confirm('前の試遊用セーブを置き換えますか？')) return;
    const {region, time, count} = form.elements;
    const n = Number(count.value);
    const friends = [...roster.companions.normal, ...roster.companions.rare];
    const partner = roster.partners.find(entry => entry.id === 'forest_bear');
    const state = {
      stage:'growing', speciesLine:'dog', stageIndex:5, ageTicks:500, sodachi:55, maxSodachi:55,
      regionId:region.value, savedAt:Date.now(), happiness:95, hunger:95, energy:95, health:100,
      companions:friends.slice(0, Math.max(0, n - 2)).map(({id}) => ({id, bond:85})),
      partner:n > 1 ? {...partner, gender:'male', orientationId:'bi', married:true, affection:80, bondCount:3} : null,
      schemaVersion:5, romanceCompatibilityVersion:2,
      lifetime:{timeMode:time.value, ownedShopItems:['ribbon']}
    };
    try {
      localStorage.setItem(mainKey, JSON.stringify(state));
      for (const key of Object.keys(localStorage)) {
        if (key !== mainKey && key.startsWith(mainKey)) localStorage.removeItem(key);
      }
      localStorage.setItem(mainKey + ':home-guide-v1', 'done');
      location.assign('./game/trial.html');
    } catch { label.textContent = '試遊用セーブを保存できません。空き容量と保存の設定を確認してください。'; }
  };
})();
