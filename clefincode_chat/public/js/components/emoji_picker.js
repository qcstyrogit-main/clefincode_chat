/**
 * EmojiPicker — Messenger-style full emoji picker for ClefinCode Chat
 * Supports: search, categories, recently used, skin tones, two modes (input / reaction)
 */

// ── Compact emoji dataset grouped by category ─────────────────────────────────
const EMOJI_CATEGORIES = [
  {
    id: "recent",
    label: "Recently Used",
    icon: "🕐",
    emojis: [] // populated at runtime from localStorage
  },
  {
    id: "smileys",
    label: "Smileys & People",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩",
      "😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨",
      "😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕",
      "🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁",
      "☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣",
      "😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹",
      "👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾",
      "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆",
      "🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🤲","🤝","🙏","✍️","💅",
      "🤳","💪","🦾","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁️","👅",
      "👤","👥","🫂","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵"
    ]
  },
  {
    id: "animals",
    label: "Animals & Nature",
    icon: "🐻",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵",
      "🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄",
      "🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🦎","🐍","🦖","🦕","🐙",
      "🦑","🦐","🦞","🦀","🐡","🐟","🐠","🐬","🦭","🐳","🐋","🦈","🐊","🐅","🐆","🦓",
      "🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖",
      "🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🪶","🐓","🦃","🦤","🦚","🦜","🦢",
      "🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔","🐾","🐉","🐲",
      "🌵","🎄","🌲","🌳","🌴","🪵","🌱","🌿","☘️","🍀","🎍","🎋","🍃","🍂","🍁","🪺",
      "🪸","🍄","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🍋","🌛","🌜"
    ]
  },
  {
    id: "food",
    label: "Food & Drink",
    icon: "🍔",
    emojis: [
      "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥝",
      "🍅","🫒","🥥","🥑","🍆","🥔","🥕","🌽","🌶️","🫑","🥒","🥬","🥦","🧄","🧅","🍄",
      "🥜","🌰","🍞","🥐","🥖","🫓","🥨","🥯","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩",
      "🍗","🍖","🌭","🍔","🍟","🍕","🫔","🌮","🌯","🥙","🧆","🥚","🍳","🥘","🍲","🫕",
      "🥣","🥗","🍿","🧂","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤",
      "🍥","🥮","🍡","🥟","🥠","🥡","🦀","🦞","🦐","🦑","🦪","🍦","🍧","🍨","🍩","🍪",
      "🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🫖","🍵","🧃","🥤",
      "🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾","🧊","🥄","🍴","🍽️","🥢"
    ]
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🥍","🏑",
      "🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌",
      "🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","⛹️","🤺","🏇","🧘","🏄","🏊","🚣","🧗","🚵",
      "🚴","🏆","🥇","🥈","🥉","🏅","🎖️","🏵️","🎗️","🎫","🎟️","🎪","🤹","🎭","🩰","🎨",
      "🎬","🎤","🎧","🎼","🎹","🪘","🥁","🎷","🎺","🎸","🪕","🎻","🎲","♟️","🎯","🎳",
      "🎮","🎰","🧩"
    ]
  },
  {
    id: "travel",
    label: "Travel & Places",
    icon: "🚗",
    emojis: [
      "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵",
      "🦽","🦼","🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️","⛽","🚧","⚓","🛟","⛵","🚤",
      "🛥️","🛳️","⛴️","🚢","✈️","🛩️","🛫","🛬","🪂","💺","🚁","🚟","🚠","🚡","🛰️","🚀",
      "🛸","🌍","🌎","🌏","🌐","🗺️","🧭","🏔️","⛰️","🌋","🗻","🏕️","🏖️","🏜️","🏝️","🏞️",
      "🏟️","🏛️","🏗️","🧱","🪨","🪵","🛖","🏘️","🏚️","🏠","🏡","🏢","🏣","🏤","🏥","🏦",
      "🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","💒","🗼","🗽","⛪","🕌","🛕","🕍","⛩️",
      "🕋","⛲","⛺","🌁","🌃","🏙️","🌄","🌅","🌆","🌇","🌉","♨️","🎠","🎡","🎢","🎪"
    ]
  },
  {
    id: "objects",
    label: "Objects",
    icon: "💡",
    emojis: [
      "⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","💽","💾","💿","📀","🧮","📷","📸",
      "📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🧭","⏱️","⏲️","⏰","🕰️","⌛",
      "⏳","📡","🔋","🪫","🔌","💡","🔦","🕯️","🪔","🧱","🔧","🪛","🔨","⛏️","⚒️","🛠️",
      "🗡️","⚔️","🔫","🪃","🛡️","🪚","🔩","⚙️","🗜️","🔗","⛓️","🪝","🧲","🪜","⚗️","🧪",
      "🧫","🧬","🔭","🔬","🩺","🩻","🩹","🩼","💊","💉","🩸","🩴","🧴","🧷","🧹","🧺",
      "🧻","🪣","🧼","🫧","🪥","🧽","🪒","🛒","🚪","🪞","🪟","🛏️","🛋️","🪑","🚽","🪠",
      "🚿","🛁","🪤","🧹","🧺","🧻","🪣","🧼","🫧","🪥","🧽","🪒","🛒","💰","💴","💵"
    ]
  },
  {
    id: "symbols",
    label: "Symbols",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓",
      "💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐",
      "⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️",
      "☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵",
      "🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢",
      "♨️","🚷","🚯","🚳","🚱","🔞","📵","🔕","🔇","❗","❕","❓","❔","‼️","⁉️","🔅",
      "🔆","🔱","⚜️","🔰","♻️","✅","🈯","💹","❎","🌐","💠","Ⓜ️","🌀","💤","🅿️","🏧",
      "🈳","🚾","♿","🛗","🈂️","🛃","🛄","🛅","🚹","🚺","🚼","⚧️","🚻","🚮","🎦","📶",
      "🈁","🔣","ℹ️","🔤","🔡","🔠","🆖","🆗","🆙","🆒","🆕","🆓","🔟","🔢","#️⃣","*️⃣"
    ]
  },
  {
    id: "flags",
    label: "Flags",
    icon: "🏳️",
    emojis: [
      "🏳️","🏴","🚩","🏁","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️",
      "🇦🇫","🇦🇽","🇦🇱","🇩🇿","🇦🇸","🇦🇩","🇦🇴","🇦🇮","🇦🇶","🇦🇬","🇦🇷","🇦🇲","🇦🇼","🇦🇺","🇦🇹","🇦🇿",
      "🇧🇸","🇧🇭","🇧🇩","🇧🇧","🇧🇾","🇧🇪","🇧🇿","🇧🇯","🇧🇲","🇧🇹","🇧🇴","🇧🇦","🇧🇼","🇧🇷","🇧🇳","🇧🇬",
      "🇧🇫","🇧🇮","🇨🇻","🇰🇭","🇨🇲","🇨🇦","🇮🇨","🇨🇫","🇹🇩","🇨🇱","🇨🇳","🇨🇽","🇺🇸","🇬🇧","🇫🇷","🇩🇪",
      "🇮🇹","🇯🇵","🇰🇷","🇸🇦","🇮🇳","🇦🇪","🇧🇷","🇷🇺","🇨🇦","🇦🇺","🇪🇸","🇲🇽","🇮🇩","🇵🇭","🇹🇷","🇵🇰"
    ]
  }
];

// Skin tone modifiers
const SKIN_TONES = [
  { label: "Default", modifier: "" },
  { label: "Light", modifier: "🏻" },
  { label: "Medium-Light", modifier: "🏼" },
  { label: "Medium", modifier: "🏽" },
  { label: "Medium-Dark", modifier: "🏾" },
  { label: "Dark", modifier: "🏿" }
];

const SKIN_TONE_SUPPORT = new Set([
  "👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕",
  "👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🤲","🙏","✍️","💅","🤳","💪","🦾",
  "🦵","🦶","👂","🦻","👃","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵"
]);

const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/";

/**
 * Returns a Twemoji SVG URL for a given emoji character.
 */
export function twemojiUrl(emoji) {
  const codePoints = [];
  for (const char of emoji) {
    codePoints.push(char.codePointAt(0).toString(16));
  }
  // Remove variation selector-16 (fe0f) if it's not needed for the filename, 
  // but Twemoji usually expects it for specific sequences.
  let fileName = codePoints.join("-");
  // Some standard cleaning for Twemoji filenames
  if (fileName.indexOf("200d") === -1 && fileName.endsWith("-fe0f")) {
    fileName = fileName.replace("-fe0f", "");
  }
  return `${TWEMOJI_BASE}${fileName}.svg`;
}

/**
 * Returns an <img> tag for the emoji.
 */
export function renderEmoji(emoji, className = "cc-twemoji") {
  return `<img class="${className}" src="${twemojiUrl(emoji)}" draggable="false" alt="${emoji}" />`;
}

/**
 * Scans a string for all native emojis and replaces them with Twemoji SVGs.
 */
export function parseMessageTwemoji(html) {
  if (!html) return html;
  
  // Robust regex for emojis
  const emojiRegex = /((\ud83c[\udde6-\uddff]){2}|[\u2700-\u27bf]|(?:\ud83c[\udf00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff])(?:[\ufe0f\u200d](?:\ud83c[\udf00-\udfff]|\ud83d[\udc00-\udfff]|\ud83e[\udc00-\udfff]))*|[\u2000-\u3fff])/g;

  // Split by HTML tags and only replace emojis in text segments
  // This prevents double-parsing emojis inside attributes (like <img alt="🇵🇭">)
  const segments = html.split(/(<[^>]*>)/g);
  
  const parsedSegments = segments.map(segment => {
    // If it's a tag, return as is
    if (segment.startsWith("<") && segment.endsWith(">")) {
      return segment;
    }
    // If it's text, parse emojis
    return segment.replace(emojiRegex, (match) => {
      if (match.length === 1 && match.charCodeAt(0) < 200) return match;
      return renderEmoji(match);
    });
  });

  return parsedSegments.join("");
}

// Map of emojis to list of keywords for search
const EMOJI_KEYWORDS = {
  // Smileys
  "😀": "grinning face happy smile", "😃": "smiley happy smile", "😄": "smile happy", "😁": "grin happy smile",
  "😆": "laughing happy", "😅": "sweat smile happy", "🤣": "rofl laughing", "😂": "joy laughing tears",
  "🙂": "slightly smiling", "🙃": "upside down", "😉": "wink winking", "😊": "blush happy", "😇": "innocent halo",
  "🥰": "smiling face hearts love", "😍": "heart eyes love", "🤩": "star struck star eyes", "😘": "kissing heart love",
  "😛": "stuck out tongue", "😜": "wink tongue", "🤑": "money mouth", "🤔": "thinking", "🤐": "zipper mouth",
  "🤨": "raised eyebrow", "😐": "neutral face", "😑": "expressionless", "😶": "no mouth", "😏": "smirk smirking",
  "😒": "unamused bored", "🙄": "face with rolling eyes", "😬": "grimacing", "🤥": "lying face", "😌": "relieved",
  "😔": "pensive sad", "😪": "sleepy", "🤤": "drooling", "😴": "sleeping", "😷": "mask", "🤒": "thermometer fever",
  "🤕": "bandage", "🤢": "nauseated vomit", "🤮": "vomiting", "🤧": "sneezing", "🥵": "hot heat", "🥶": "cold ice",
  "🥴": "woozy", "😵": "dizzy", "🤯": "exploding", "🤠": "cowboy", "🥳": "partying party", "😎": "glasses cool",
  "🤓": "nerd", "🧐": "monocle", "😕": "confused", "😟": "worried", "🙁": "frown", "☹️": "frowning",
  "😮": "open mouth surprise", "😯": "hushed", "😲": "astonished", "😳": "flushed", "🥺": "pleading begging",
  "😦": "frowning open", "😧": "anguished", "😨": "fearful", "😰": "anxious", "😥": "sad relieved", "😢": "cry crying",
  "😭": "loudly crying sad", "😱": "scream scared", "😖": "confounded", "😣": "persevering", "😞": "disappointed",
  "😓": "sweat", "😩": "weary", "😫": "tired", "🥱": "yawning", "😤": "triumph steam", "😡": "pouty angry",
  "😠": "angry", "🤬": "symbols mouth angry", "😈": "smiling devil", "👿": "angry devil", "💀": "skull",
  "💩": "poop", "👎": "thumbs down", "👍": "thumbs up", "❤️": "heart love",
  // Flags (Keywords added for search)
  "🏳️": "white flag", "🏴": "black flag", "🏁": "checkered flag racing", "🏳️‍🌈": "rainbow pride flag",
  "🇩🇿": "algeria flag", "🇦🇷": "argentina flag", "🇦🇺": "australia flag", "🇦🇹": "austria flag",
  "🇧🇪": "belgium flag", "🇧🇷": "brazil flag", "🇨🇦": "canada flag", "🇨🇱": "chile flag", "🇨🇳": "china flag",
  "🇪🇬": "egypt flag", "🇫🇷": "france flag french", "🇩🇪": "germany flag german", "🇮🇳": "india flag",
  "🇮🇩": "indonesia flag", "🇮🇹": "italy flag italian", "🇯🇵": "japan flag japanese", "🇲🇽": "mexico flag",
  "🇳🇱": "netherlands flag", "🇳🇿": "new zealand flag", "🇵🇰": "pakistan flag", "🇵🇭": "philippines flag",
  "🇷🇺": "russia flag russian", "🇸🇦": "saudi arabia flag", "🇿🇦": "south africa flag", "🇪🇸": "spain flag spanish",
  "🇹🇷": "turkey flag", "🇦🇪": "uae emirates flag", "🇬🇧": "uk united kingdom flag", "🇺🇸": "us usa united states flag"
};

const SEARCH_INDEX = [];

// Build flat search index on first use
function buildSearchIndex() {
  if (SEARCH_INDEX.length > 0) return;
  EMOJI_CATEGORIES.forEach(cat => {
    if (cat.id === "recent") return;
    cat.emojis.forEach(emoji => {
      const keywords = EMOJI_KEYWORDS[emoji] || "";
      SEARCH_INDEX.push({ emoji, category: cat.id, label: cat.label, keywords: keywords.toLowerCase() });
    });
  });
}

function getRecentEmojis() {
  try {
    return JSON.parse(localStorage.getItem("cc_recent_emojis") || "[]").slice(0, 24);
  } catch { return []; }
}

function saveRecentEmoji(emoji) {
  try {
    let recent = getRecentEmojis().filter(e => e !== emoji);
    recent.unshift(emoji);
    localStorage.setItem("cc_recent_emojis", JSON.stringify(recent.slice(0, 24)));
  } catch { /* ignore */ }
}

// ── Main EmojiPicker class ─────────────────────────────────────────────────────
export default class EmojiPicker {
  /**
   * @param {object} opts
   *   anchor       - jQuery element that triggered the picker
   *   mode         - "input" | "reaction"
   *   on_select    - callback(emoji) when an emoji is chosen
   *   chat_space   - ChatSpace instance (for profile / room data)
   *   message_name - (reaction mode) the message being reacted to
   */
  constructor(opts) {
    this.anchor = opts.anchor;
    this.mode = opts.mode || "input";
    this.on_select = opts.on_select || (() => {});
    this.on_customize_save = opts.on_customize_save || null;
    this.chat_space = opts.chat_space;
    this.message_name = opts.message_name || null;
    this.active_category = "recent";
    this.skin_tone = "";
    this.search_debounce = null;
    this.$panel = null;
    this._close_handler = null;

    buildSearchIndex();
    this._render();
    this._position();
    this._bind_events();
  }

  // ── Build DOM ───────────────────────────────────────────────────────────────
  _render() {
    // Remove any existing pickers
    $(".cc-emoji-picker").remove();

    const panel = $(`
      <div class="cc-emoji-picker" role="dialog" aria-label="Emoji Picker">
        <div class="cc-ep-search-wrap">
          <div class="cc-ep-search-pill">
            <span class="cc-ep-search-icon">🔍</span>
            <input class="cc-ep-search" type="text" placeholder="Search emoji" autocomplete="off" />
          </div>
        </div>
        <div class="cc-ep-body">
          <div class="cc-ep-content"></div>
        </div>
        <div class="cc-ep-nav"></div>
        <div class="cc-ep-arrow"></div>
      </div>
    `);

    this.$panel = panel;

    // Build category nav
    const $nav = panel.find(".cc-ep-nav");
    EMOJI_CATEGORIES.forEach(cat => {
      const $btn = $(`<button class="cc-ep-nav-btn${cat.id === this.active_category ? " active" : ""}"
        data-cat="${cat.id}" title="${cat.label}">${cat.icon}</button>`);
      $nav.append($btn);
    });

    $("body").append(panel);
    this._render_all();

    // Animate in
    requestAnimationFrame(() => panel.addClass("cc-ep-open"));
  }

  _render_all() {
    const $content = this.$panel.find(".cc-ep-content");
    $content.empty();

    EMOJI_CATEGORIES.forEach(cat => {
      let emojis;
      if (cat.id === "recent") {
        emojis = getRecentEmojis();
        if (emojis.length === 0) return; // Hide recent if empty
      } else {
        emojis = cat.emojis;
      }

      if (cat.id === "recent") {
        $content.append(`
          <div class="cc-ep-category-section" data-cat="recent">
            <div class="cc-ep-category-header">
              <span class="cc-ep-category-label">Your reactions</span>
              <span class="cc-ep-customize">Customize</span>
            </div>
            <div class="cc-ep-grid recent-grid"></div>
          </div>
        `);
      } else {
        $content.append(`
          <div class="cc-ep-category-section" data-cat="${cat.id}">
            <div class="cc-ep-category-label">${cat.label}</div>
            <div class="cc-ep-grid"></div>
          </div>
        `);
      }

      const $grid = $content.find(`[data-cat="${cat.id}"] .cc-ep-grid`);
      this._render_emojis(emojis, $grid);
    });
  }

  _render_emojis(emojis, $container) {
    const me = this;
    emojis.forEach(emoji => {
      const $cell = $(`<button class="cc-ep-cell" title="${emoji}">${renderEmoji(emoji)}</button>`);
      let pressTimer = null;

      // Long press → skin tone picker (desktop + mobile)
      $cell.on("mousedown touchstart", function(e) {
        if (SKIN_TONE_SUPPORT.has(emoji)) {
          pressTimer = setTimeout(() => {
            me._show_skin_picker(emoji, $cell);
          }, 600);
        }
      });
      $cell.on("mouseup mouseleave touchend", () => {
        if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
      });

      $cell.on("click", function(e) {
        if ($(this).hasClass("cc-ep-skin-shown")) return; // handled by skin picker
        me._select_emoji(emoji + me.skin_tone);
        // bounce animation
        $(this).addClass("cc-ep-bounce");
        setTimeout(() => $(this).removeClass("cc-ep-bounce"), 400);
      });

      $container.append($cell);
    });
  }

  _show_skin_picker(baseEmoji, $anchor) {
    $(".cc-ep-skin-popup").remove();
    const $popup = $(`<div class="cc-ep-skin-popup"></div>`);
    SKIN_TONES.forEach(tone => {
      const displayEmoji = tone.modifier
        ? (baseEmoji + tone.modifier)
        : baseEmoji;
      const $btn = $(`<button class="cc-ep-cell cc-ep-skin-btn" title="${tone.label}">${renderEmoji(displayEmoji)}</button>`);
      $btn.on("click", () => {
        this._select_emoji(displayEmoji);
        $popup.remove();
      });
      $popup.append($btn);
    });
    $anchor.addClass("cc-ep-skin-shown").after($popup);
    // Auto-remove popup when clicking elsewhere
    $(document).one("click.skin_popup", e => {
      if (!$(e.target).closest(".cc-ep-skin-popup").length) {
        $popup.remove();
        $anchor.removeClass("cc-ep-skin-shown");
      }
    });
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  _search(query) {
    const $content = this.$panel.find(".cc-ep-content");
    $content.empty();

    if (!query.trim()) {
      this._render_all();
      return;
    }

    const q = query.toLowerCase();
    // Match against keywords, emoji char itself, or category label
    const results = SEARCH_INDEX.filter(item =>
      item.keywords.includes(q) ||
      item.emoji.includes(q) ||
      item.label.toLowerCase().includes(q)
    ).slice(0, 80);

    if (results.length === 0) {
      $content.html(`<div class="cc-ep-empty">No emojis found for "${query}"</div>`);
      return;
    }

    $content.append(`<div class="cc-ep-category-label">🔍 Search results</div>`);
    const $grid = $(`<div class="cc-ep-grid"></div>`);
    this._render_emojis(results.map(r => r.emoji), $grid);
    $content.append($grid);
  }

  // ── Select emoji ─────────────────────────────────────────────────────────────
  _select_emoji(emoji) {
    saveRecentEmoji(emoji);

    if (this.mode === "reaction") {
      if (this.message_name && this.chat_space) {
        const profile = this.chat_space.profile;
        const room = profile.room_type === "Contributor"
          ? profile.parent_channel
          : profile.room;
        frappe.call({
          method: "clefincode_chat.api.api_1_2_1.api.toggle_message_reaction",
          args: {
            message_name: this.message_name,
            emoji: emoji,
            user_email: profile.user_email,
            room: room
          }
        });
      }
    }

    this.on_select(emoji);
    this.close();
  }

  // ── Position panel ───────────────────────────────────────────────────────────
  _position() {
    if (!this.anchor || !this.anchor.length) return;

    const anchorRect = this.anchor[0].getBoundingClientRect();
    const panelH = this.$panel.outerHeight() || 320;
    const panelW = this.$panel.outerWidth() || 280;
    const windowH = $(window).height();
    const windowW = $(window).width();

    // Prefer showing ABOVE
    let top = anchorRect.top - panelH - 10;
    let left = anchorRect.left + (anchorRect.width / 2) - (panelW / 2);
    let arrowAtTop = false;

    // Flip down ONLY if no room at top and enough room below
    if (top < 10 && (anchorRect.bottom + panelH + 10 < windowH)) {
      top = anchorRect.bottom + 10;
      arrowAtTop = true;
    } else if (top < 10) {
      // Force it to stay at the top edge if both sides are tight
      top = 10;
    }

    // Clamp horizontally
    if (left + panelW > windowW - 10) left = windowW - panelW - 10;
    if (left < 10) left = 10;

    this.$panel.css({ 
      top: `${top}px`, 
      left: `${left}px` 
    });
    
    // Exact arrow positioning
    const anchorCenterViewportX = anchorRect.left + (anchorRect.width / 2);
    const arrowLeft = anchorCenterViewportX - left - 8;
    
    const $arrow = this.$panel.find(".cc-ep-arrow");
    $arrow.css({
      left: `${arrowLeft}px`,
      top: arrowAtTop ? "-8px" : "auto",
      bottom: arrowAtTop ? "auto" : "-8px",
      transform: arrowAtTop ? "rotate(-135deg)" : "rotate(45deg)",
      display: (arrowLeft < 10 || arrowLeft > panelW - 10) ? "none" : "block"
    });
  }

  // ── Event bindings ───────────────────────────────────────────────────────────
  _bind_events() {
    const me = this;

    // Category nav - scroll to section
    this.$panel.on("click", ".cc-ep-nav-btn", function() {
      const catId = $(this).data("cat");
      const $section = me.$panel.find(`.cc-ep-category-section[data-cat="${catId}"]`);
      if ($section.length) {
        me.$panel.find(".cc-ep-body").animate({
          scrollTop: $section.position().top + me.$panel.find(".cc-ep-body").scrollTop() - 10
        }, 300);
      }
    });

    // Update active nav on scroll
    this.$panel.find(".cc-ep-body").on("scroll", function() {
      const bodyTop = $(this).offset().top;
      let activeCat = "smileys";
      
      me.$panel.find(".cc-ep-category-section").each(function() {
        if ($(this).offset().top - bodyTop < 50) {
          activeCat = $(this).data("cat");
        }
      });
      
      me.$panel.find(".cc-ep-nav-btn").removeClass("active");
      me.$panel.find(`.cc-ep-nav-btn[data-cat="${activeCat}"]`).addClass("active");
    });

    // Search input
    this.$panel.on("input", ".cc-ep-search", function() {
      const val = $(this).val();
      clearTimeout(me.search_debounce);
      me.search_debounce = setTimeout(() => me._search(val), 200);
    });

    // Customize Reactions click
    this.$panel.on("click", ".cc-ep-customize", (e) => {
      e.stopPropagation();
      this._show_customize_dialog();
    });

    // Close on outside click
    this._close_handler = (e) => {
      if (!$(e.target).closest(".cc-emoji-picker, .cc-ep-trigger, .open-full-emoji-picker, .cc-customize-dialog").length) {
        me.close();
      }
    };
    setTimeout(() => $(document).on("click.emoji_picker", this._close_handler), 100);

    // Close on Escape
    $(document).on("keydown.emoji_picker", (e) => {
      if (e.key === "Escape") {
        me.close();
        $(".cc-customize-dialog").remove();
      }
    });
  }

  _show_customize_dialog() {
    const me = this;
    const current = JSON.parse(localStorage.getItem("cc_quick_reactions") || '["👍","❤️","😂","😮","😢","😡"]');
    let selectedIdx = 0;

    const $dialog = $(`
      <div class="cc-customize-dialog" role="dialog">
        <div class="cc-cd-header">
          <span>Customize Reactions</span>
          <button class="cc-cd-close">&times;</button>
        </div>
        <div class="cc-cd-body">
          <div class="cc-cd-current-row">
            ${current.map((emoji, i) => `<div class="cc-cd-slot ${i === 0 ? "active" : ""}" data-idx="${i}">${renderEmoji(emoji)}</div>`).join("")}
          </div>
          <p class="cc-cd-hint">Tap a reaction, then choose an emoji to replace it.</p>
          <div class="cc-cd-picker-area">
             <!-- Simplified picker inside dialog -->
             <div class="cc-cd-grid"></div>
          </div>
        </div>
        <div class="cc-cd-footer">
          <button class="btn btn-secondary cc-cd-reset">Reset</button>
          <button class="btn btn-primary cc-cd-save">Save</button>
        </div>
      </div>
    `);

    // Populate simplified grid (first few categories)
    const $grid = $dialog.find(".cc-cd-grid");
    EMOJI_CATEGORIES.forEach(cat => {
      if (cat.id === "recent") return;
      cat.emojis.slice(0, 48).forEach(emoji => {
        const $cell = $(`<button class="cc-ep-cell">${renderEmoji(emoji)}</button>`);
        $cell.on("click", () => {
          current[selectedIdx] = emoji;
          $dialog.find(`.cc-cd-slot[data-idx="${selectedIdx}"]`).html(renderEmoji(emoji));
        });
        $grid.append($cell);
      });
    });

    $dialog.find(".cc-cd-slot").on("click", function() {
      $dialog.find(".cc-cd-slot").removeClass("active");
      $(this).addClass("active");
      selectedIdx = $(this).data("idx");
    });

    $dialog.find(".cc-cd-reset").on("click", () => {
      const defaults = ["👍","❤️","😂","😮","😢","😡"];
      defaults.forEach((emoji, i) => {
        current[i] = emoji;
        $dialog.find(`.cc-cd-slot[data-idx="${i}"]`).html(renderEmoji(emoji));
      });
    });
    $dialog.find(".cc-cd-save").on("click", () => {
      localStorage.setItem("cc_quick_reactions", JSON.stringify(current));
      $dialog.remove();
      me.close();
      frappe.show_alert({ message: "Reactions updated!", indicator: "green" });
      if (me.on_customize_save) me.on_customize_save();
    });

    $dialog.find(".cc-cd-close").on("click", () => $dialog.remove());

    $("body").append($dialog);
  }

  close() {
    if (this.$panel) {
      this.$panel.removeClass("cc-ep-open");
      setTimeout(() => this.$panel && this.$panel.remove(), 200);
      this.$panel = null;
    }
    $(document).off("click.emoji_picker keydown.emoji_picker");
  }
}

