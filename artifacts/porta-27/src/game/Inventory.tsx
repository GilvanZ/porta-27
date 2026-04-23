import type { Item } from "./types";
import type { AggregatedEffects } from "./generate";

export function Inventory({
  items,
  onClose,
  eff,
}: {
  items: Item[];
  onClose: () => void;
  eff: AggregatedEffects;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-bg border-2 border-ember max-w-[600px] w-full p-6 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="text-[12px] text-ember-bright text-shadow-ember tracking-[0.3em]">
            INVENTARIO
          </div>
          <button onClick={onClose} className="text-[10px] text-ink-dim hover:text-ember">
            [X]
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-[10px] text-ink-dim italic">Vazio. So voce e o corredor.</div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="border border-ink-dim/50 p-3 flex gap-3 items-start hover:border-ember/60 transition-colors"
              >
                <div className="text-[24px]" style={{ color: rarityColor(it.rarity), filter: `drop-shadow(0 0 4px ${rarityColor(it.rarity)}80)` }}>
                  {it.glyph}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] text-ink">
                    {it.name}{" "}
                    <span className="text-[8px]" style={{ color: rarityColor(it.rarity) }}>
                      [{it.rarity}]
                    </span>
                  </div>
                  <div className="text-[9px] text-ink-dim italic mt-1">{it.desc}</div>
                  <div className="text-[9px] text-mind-bright mt-1">+ {it.upside}</div>
                  {it.downside && <div className="text-[9px] text-blood mt-[2px]">- {it.downside}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 border-t border-ink-dim/30 pt-3 text-[9px] text-ink-dim space-y-1">
          <div className="text-ink">EFEITOS COMBINADOS</div>
          {eff.hintClarity > 0 && <div>+ {eff.hintClarity} clareza nas pistas</div>}
          {eff.lootMod > 0 && <div>+ {Math.round(eff.lootMod * 100)}% loot</div>}
          {eff.difficultyMod > 0 && <div className="text-blood">+ {Math.round(eff.difficultyMod * 100)}% dificuldade</div>}
          {eff.sanityDrainPerRoom > 0 && <div className="text-blood">- {eff.sanityDrainPerRoom} sanidade por sala</div>}
          {eff.sanityDrainPerRoom < 0 && <div className="text-mind-bright">+ {-eff.sanityDrainPerRoom} sanidade poupada</div>}
          {eff.trapResist > 0 && <div>{Math.round(eff.trapResist * 100)}% resistencia a armadilhas</div>}
          {eff.enemyDmgMod < 0 && <div>{Math.round(-eff.enemyDmgMod * 100)}% menos dano de inimigos</div>}
          {eff.enemyDmgMod > 0 && <div className="text-blood">+ {Math.round(eff.enemyDmgMod * 100)}% dano sofrido</div>}
          {eff.rareChanceBonus > 0 && <div className="text-rare">+ {Math.round(eff.rareChanceBonus * 100)}% chance de salas raras</div>}
          {eff.skipChance > 0 && <div>+ {Math.round(eff.skipChance * 100)}% chance de atalho</div>}
          {eff.visionBonus && <div className="text-rare">visao revela 1 porta por escolha</div>}
          {eff.mapBonus && <div className="text-mind">mapa parcial das proximas portas</div>}
          {eff.goldGainOnDoor > 0 && <div>+ {eff.goldGainOnDoor} ouro por porta</div>}
        </div>
      </div>
    </div>
  );
}

function rarityColor(r: Item["rarity"]) {
  switch (r) {
    case "comum":
      return "#c9c4b0";
    case "incomum":
      return "#9bd1ff";
    case "raro":
      return "#b87fc9";
    case "amaldicoado":
      return "#8b1a1a";
  }
}
