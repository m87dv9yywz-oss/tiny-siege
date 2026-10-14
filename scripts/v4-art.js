// Original lightweight vector artwork; sources stay editable in the repository.
import { writeFileSync } from "node:fs";
const svg = (body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 200"><defs><linearGradient id="stone" x2="0" y2="1"><stop stop-color="#fff0b9"/><stop offset="1" stop-color="#b0a185"/></linearGradient><radialGradient id="glow"><stop stop-color="#fffbd5"/><stop offset="1" stop-color="#88e4f5" stop-opacity=".2"/></radialGradient></defs><ellipse cx="96" cy="179" rx="76" ry="12" fill="#254c4d" opacity=".2"/><g stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`;
for (const type of ["wind", "rune"])
  for (let path = 0; path < 3; path++)
    for (let tier = 0; tier <= 3; tier++) {
      const color = (
        type === "wind"
          ? ["#71dbe9", "#75dfb0", "#ffd278"]
          : ["#b78cec", "#f49a72", "#84ccec"]
      )[path];
      const base = `<path d="M37 151H155L167 177H25Z" fill="url(#stone)" stroke="#69776b" stroke-width="5"/><path d="M49 149V94Q96 75 143 94V149" fill="#a9b7ad" stroke="#586c68" stroke-width="5"/><path d="M62 147V104M130 147V104" stroke="#f7e6b1" stroke-width="10"/><path d="M62 160H130" stroke="#f5e0a6" stroke-width="5"/>`;
      let top;
      if (type === "wind") {
        if (path === 0 && tier >= 2)
          top = `<ellipse cx="96" cy="66" rx="55" ry="53" fill="url(#glow)"/><path d="M43 40Q157 0 147 48Q133 64 65 69Q30 84 135 83Q155 101 79 107Q64 115 106 125" fill="none" stroke="${color}" stroke-width="${tier === 3 ? 18 : 11}"/><path d="M48 40Q108 20 142 43M73 74L130 66" stroke="#f5ffff" stroke-width="5" fill="none"/>`;
        else if (path === 2 && tier >= 2)
          top = `<path d="M30 51Q25 20 55 25Q80-4 103 18Q145 6 157 41Q176 63 145 73H49Q20 77 30 51" fill="#90b7c6" stroke="#526f88" stroke-width="5"/><path d="M90 66L70 100H101L90 133L132 87H106L125 66" fill="#ffe591" stroke="#d2a743" stroke-width="3"/>${tier === 3 ? '<path d="M48 85L28 114M151 81L172 115" stroke="#e0fcff" stroke-width="8"/>' : ""}`;
        else
          top = `<path d="M96 42V140" stroke="#8b7151" stroke-width="13"/><g fill="${color}" stroke="#527e7e" stroke-width="4"><path d="M92 66L53 15Q9 31 54 63Z"/><path d="M105 63L158 33Q177 78 133 84Z"/><path d="M105 85L127 135Q77 156 82 110Z"/></g><circle cx="96" cy="74" r="14" fill="#fff0ac" stroke="#89774f" stroke-width="5"/>${tier ? '<path d="M44 113Q30 84 51 77M145 113Q168 89 148 78" fill="none" stroke="#d4fcff" stroke-width="6"/>' : ""}`;
      } else {
        if (path === 0 && tier >= 2)
          top = `<ellipse cx="96" cy="68" rx="62" ry="46" fill="url(#glow)"/><ellipse cx="96" cy="70" rx="54" ry="33" fill="none" stroke="${color}" stroke-width="${tier === 3 ? 12 : 7}"/><path d="M96 22L111 55L142 68L110 81L96 117L81 81L49 68L81 55Z" fill="#eed4ff" stroke="#8760b7" stroke-width="5"/>${tier === 3 ? '<circle cx="30" cy="68" r="10" fill="#ffe99e"/><circle cx="162" cy="68" r="10" fill="#ffe99e"/>' : ""}`;
        else if (path === 2 && tier >= 2)
          top = `${[47, 96, 145].map((x, i) => `<path d="M${x - 17} 134V${i === 1 ? 17 : 42}L${x} ${i === 1 ? 5 : 29}L${x + 17} ${i === 1 ? 17 : 42}V134Z" fill="#7774a2" stroke="#4e526e" stroke-width="5"/><path d="M${x - 8} 67L${x + 8} 80L${x - 8} 94L${x + 8} 110" fill="none" stroke="${color}" stroke-width="6"/>`).join("")}`;
        else
          top = `<path d="M40 69H156L139 92H108V123H72V91L45 88Z" fill="#6b7188" stroke="#46536b" stroke-width="6"/><path d="M44 68H151" stroke="#c5d8df" stroke-width="9"/><path d="M117 56L148 17" stroke="#926446" stroke-width="13"/><path d="M126 14L155 0L176 23L151 47Z" fill="${color}" stroke="#635774" stroke-width="5"/><path d="M72 89L97 104L76 120" fill="none" stroke="${color}" stroke-width="5"/>`;
      }
      const trim = tier
        ? `<path d="M45 143H147" stroke="${color}" stroke-width="${tier * 3}"/><circle cx="96" cy="156" r="${5 + tier * 2}" fill="${color}"/>`
        : "";
      const art = svg(base + top + trim);
      const variant =
        tier === 0
          ? "base"
          : tier === 1
            ? `tier1-${path}`
            : tier === 2
              ? `tier2-${path}`
              : path;
      writeFileSync(`public/portraits/${type}-${variant}.svg`, art);
    }
const dragon = `<path d="M53 129Q15 94 37 53L82 95M111 96L159 42Q184 98 137 128" fill="#69bbd6" stroke="#34788c" stroke-width="6"/><path d="M55 139Q18 151 21 174Q61 165 76 150" fill="#ec9e57" stroke="#976843" stroke-width="5"/><ellipse cx="101" cy="130" rx="43" ry="40" fill="#f3ad6b" stroke="#96613d" stroke-width="5"/><ellipse cx="101" cy="137" rx="24" ry="29" fill="#ffe4a0"/><path d="M61 90Q54 37 99 27Q146 29 148 77Q174 77 167 96Q160 107 121 99" fill="#f3ad6b" stroke="#96613d" stroke-width="5"/><path d="M74 35L68 13L88 29M115 29L133 11L130 40" fill="#ffe4aa" stroke="#96613d" stroke-width="4"/><circle cx="119" cy="57" r="12" fill="white"/><circle cx="122" cy="59" r="7" fill="#263d40"/><circle cx="125" cy="55" r="2" fill="white"/><path d="M128 88Q142 98 151 87" fill="none" stroke="#754832" stroke-width="4"/><path d="M72 161L63 176H88M117 162L114 178H141" fill="#f3ad6b" stroke="#96613d" stroke-width="6"/>`;
const dinosaur = `<path d="M78 132Q24 155 17 108Q13 95 29 110L75 111" fill="#73b986" stroke="#437951" stroke-width="6"/><ellipse cx="101" cy="130" rx="43" ry="43" fill="#87c77a" stroke="#437951" stroke-width="6"/><path d="M77 114L78 74Q55 62 68 33Q89 9 134 26Q160 40 160 69Q151 89 120 79L127 119" fill="#87c77a" stroke="#437951" stroke-width="6"/><path d="M80 34L70 18L92 23M63 105L49 93L55 120M55 135L43 136L55 152" fill="#f2dc86"/><ellipse cx="107" cy="135" rx="22" ry="28" fill="#d7e6a1"/><circle cx="123" cy="47" r="12" fill="white"/><circle cx="125" cy="48" r="7" fill="#253e36"/><path d="M131 73Q145 81 153 69M74 159L65 177H89M122 159L120 178H148" fill="#87c77a" stroke="#437951" stroke-width="6"/>`;
const tiger = `<path d="M144 119Q182 111 167 68" fill="none" stroke="#9f642c" stroke-width="16"/><path d="M144 119Q182 111 167 68" fill="none" stroke="#ffc267" stroke-width="10"/><ellipse cx="102" cy="132" rx="51" ry="30" fill="#ffc267" stroke="#9f642c" stroke-width="5"/><path d="M55 131L43 168H63L78 141M127 137L130 169H151L147 128" fill="#ffc267" stroke="#9f642c" stroke-width="6"/><path d="M54 56L45 22Q76 18 83 48M101 47L121 18Q145 40 121 65" fill="#ffc267" stroke="#9f642c" stroke-width="5"/><ellipse cx="83" cy="81" rx="42" ry="40" fill="#ffc267" stroke="#9f642c" stroke-width="5"/><path d="M67 46L76 69L85 44M44 75L65 82L45 92M110 62L96 76L116 78M93 106L108 92" fill="#724930"/><ellipse cx="78" cy="102" rx="24" ry="15" fill="#fff5d8"/><circle cx="65" cy="79" r="8" fill="#fff"/><circle cx="96" cy="79" r="8" fill="#fff"/><circle cx="66" cy="80" r="5" fill="#273e37"/><circle cx="97" cy="80" r="5" fill="#273e37"/><path d="M76 95L86 95L81 102M82 103Q73 112 66 103M82 103Q92 112 99 103" fill="#725046" stroke="#725046" stroke-width="3"/><path d="M89 108L94 126L100 108M116 110L116 131L126 116M139 119L131 135" stroke="#724930" stroke-width="6"/>`;
for (const [name, body] of Object.entries({ dragon, dinosaur, tiger }))
  writeFileSync(`public/heroes/${name}.svg`, svg(body));
const relicArt = {
  purse:
    '<path d="M51 98Q50 169 96 177Q145 168 142 97Z" fill="#e8b957" stroke="#9d7638" stroke-width="6"/><path d="M45 96Q95 36 149 95L139 112H53Z" fill="#987e4a" stroke="#655d40" stroke-width="6"/><path d="M96 63V38" stroke="#8b7445" stroke-width="10"/><path d="M95 131L96 158" stroke="#fff2ad" stroke-width="9"/>',
  banner:
    '<path d="M52 179V27" stroke="#9f7b42" stroke-width="10"/><circle cx="52" cy="25" r="9" fill="#ffde85"/><path d="M59 32H147L133 80L147 128H59Z" fill="#b381d6" stroke="#715986" stroke-width="6"/><path d="M96 52L117 79L96 107L75 79Z" fill="#f8e3a1"/>',
  shield:
    '<path d="M40 46Q96 22 151 46V114Q139 154 96 178Q51 153 40 114Z" fill="#91c6a4" stroke="#557c69" stroke-width="7"/><path d="M96 47L134 72L126 132L96 153L65 132L58 72Z" fill="#cedeb3" stroke="#77a58b" stroke-width="5"/><path d="M96 47V153M60 78L130 124M133 78L65 125" stroke="#77a58b" stroke-width="5"/>',
  lens: '<circle cx="93" cy="84" r="54" fill="#c3f3f8" stroke="#967ac3" stroke-width="12"/><circle cx="93" cy="84" r="40" fill="#8ed5e9"/><path d="M64 77Q60 47 97 46" stroke="#f2ffff" stroke-width="8" fill="none"/><path d="M130 130L155 169" stroke="#7e6a91" stroke-width="21"/>',
  ember:
    '<path d="M96 158Q23 112 43 63Q65 26 96 62Q128 25 150 63Q171 111 96 158Z" fill="#f2958b" stroke="#ab6966" stroke-width="6"/><path d="M92 126Q69 110 82 92L96 74L110 98Q128 120 98 134" fill="#ffe296"/><path d="M96 134Q83 119 98 108Q110 127 96 134" fill="#ffab68"/>',
  crown:
    '<path d="M36 66L66 104L97 47L128 104L159 64L144 151H51Z" fill="#e7bc60" stroke="#9d7a39" stroke-width="6"/><path d="M52 153H144" stroke="#ffeb9e" stroke-width="13"/><circle cx="97" cy="122" r="14" fill="#ab83cc" stroke="#775689" stroke-width="4"/><circle cx="36" cy="63" r="9" fill="#ffe797"/><circle cx="97" cy="46" r="9" fill="#ffe797"/><circle cx="158" cy="63" r="9" fill="#ffe797"/>',
};
for (const [id, body] of Object.entries(relicArt))
  writeFileSync(`public/relics/${id}.svg`, svg(body));
