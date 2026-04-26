const POKEMON_API = "https://pokeapi.co/api/v2/pokemon";
const SPECIES_API = "https://pokeapi.co/api/v2/pokemon-species";
const MAX_POKEMON_ID = 1025;

const randomBtn = document.getElementById("random-btn");
const card = document.getElementById("pokemon-card");
const imageEl = document.getElementById("pokemon-image");
const nameEl = document.getElementById("pokemon-name");
const idEl = document.getElementById("pokemon-id");
const typesEl = document.getElementById("pokemon-types");
const heightEl = document.getElementById("pokemon-height");
const weightEl = document.getElementById("pokemon-weight");
const abilitiesEl = document.getElementById("pokemon-abilities");
const statusEl = document.getElementById("status");

function setStatus(message) {
  statusEl.textContent = message;
}

function pickImageUrl(pokemon) {
  const sprites = pokemon.sprites || {};
  const official = sprites.other?.["official-artwork"]?.front_default;
  const dreamWorld = sprites.other?.dream_world?.front_default;
  return official || dreamWorld || sprites.front_default || "";
}

function pickJapaneseName(species) {
  const entry = species?.names?.find((n) => n.language?.name === "ja" || n.language?.name === "ja-Hrkt");
  return entry?.name || "";
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function loadRandomPokemon() {
  randomBtn.disabled = true;
  setStatus("読み込み中...");

  const id = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
  try {
    const pokemon = await fetchJson(`${POKEMON_API}/${id}`);
    let species = null;
    try {
      species = await fetchJson(`${SPECIES_API}/${id}`);
    } catch {
      // species lookup failure shouldn't block display
    }

    renderPokemon(pokemon, species);
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("ポケモンの取得に失敗しました。もう一度お試しください。");
  } finally {
    randomBtn.disabled = false;
  }
}

function renderPokemon(pokemon, species) {
  card.classList.remove("hidden");

  const jaName = pickJapaneseName(species);
  nameEl.textContent = jaName ? `${jaName} (${pokemon.name})` : pokemon.name;
  idEl.textContent = String(pokemon.id).padStart(4, "0");

  const imageUrl = pickImageUrl(pokemon);
  imageEl.src = imageUrl;
  imageEl.alt = jaName || pokemon.name;

  typesEl.innerHTML = "";
  for (const t of pokemon.types) {
    const span = document.createElement("span");
    const typeName = t.type.name;
    span.className = `type-badge type-${typeName}`;
    span.textContent = typeName;
    typesEl.appendChild(span);
  }

  heightEl.textContent = (pokemon.height / 10).toFixed(1);
  weightEl.textContent = (pokemon.weight / 10).toFixed(1);

  abilitiesEl.innerHTML = "";
  for (const a of pokemon.abilities) {
    const li = document.createElement("li");
    li.textContent = a.ability.name.replace(/-/g, " ");
    abilitiesEl.appendChild(li);
  }
}

randomBtn.addEventListener("click", loadRandomPokemon);
