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

const SEARCH_INDEX = [];

// Build flat search index on first use
function buildSearchIndex() {
  if (SEARCH_INDEX.length > 0) return;
  EMOJI_CATEGORIES.forEach(cat => {
    if (cat.id === "recent") return;
    cat.emojis.forEach(emoji => {
      SEARCH_INDEX.push({ emoji, category: cat.id, label: cat.label });
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
          <span class="cc-ep-search-icon">🔍</span>
          <input class="cc-ep-search" type="text" placeholder="Search emoji…" autocomplete="off" />
        </div>
        <div class="cc-ep-body">
          <div class="cc-ep-content"></div>
        </div>
        <div class="cc-ep-nav"></div>
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
    this._show_category(this.active_category);

    // Animate in
    requestAnimationFrame(() => panel.addClass("cc-ep-open"));
  }

  // ── Render a category ────────────────────────────────────────────────────────
  _show_category(categoryId) {
    this.active_category = categoryId;
    this.$panel.find(".cc-ep-nav-btn").removeClass("active");
    this.$panel.find(`.cc-ep-nav-btn[data-cat="${categoryId}"]`).addClass("active");

    const $content = this.$panel.find(".cc-ep-content");
    $content.empty();

    let emojis;
    if (categoryId === "recent") {
      emojis = getRecentEmojis();
      if (emojis.length === 0) {
        $content.html(`<div class="cc-ep-empty">No recently used emojis yet.</div>`);
        return;
      }
    } else {
      const cat = EMOJI_CATEGORIES.find(c => c.id === categoryId);
      emojis = cat ? cat.emojis : [];
    }

    const cat = EMOJI_CATEGORIES.find(c => c.id === categoryId);
    if (cat) {
      $content.append(`<div class="cc-ep-category-label">${cat.icon} ${cat.label}</div>`);
    }

    const $grid = $(`<div class="cc-ep-grid"></div>`);
    this._render_emojis(emojis, $grid);
    $content.append($grid);
  }

  _render_emojis(emojis, $container) {
    const me = this;
    emojis.forEach(emoji => {
      const $cell = $(`<button class="cc-ep-cell" title="${emoji}">${emoji}</button>`);
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
      const $btn = $(`<button class="cc-ep-cell cc-ep-skin-btn" title="${tone.label}">${displayEmoji}</button>`);
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
      this._show_category(this.active_category);
      return;
    }

    const q = query.toLowerCase();
    // Match emojis whose category label contains the query, plus partial ID match
    const results = SEARCH_INDEX.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.emoji.includes(q) ||
      item.category.includes(q)
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

    if (this.mode === "input") {
      // Insert into Quill editor
      if (this.chat_space && this.chat_space.type_message_input) {
        const quill = this.chat_space.type_message_input.quill;
        if (quill) {
          const range = quill.getSelection(true);
          quill.insertText(range ? range.index : quill.getLength(), emoji);
          quill.setSelection((range ? range.index : quill.getLength()) + emoji.length);
        } else {
          // Fallback: append to .ql-editor
          const $editor = this.chat_space.$chat_actions.find(".ql-editor");
          const $p = $editor.find("p").last();
          $p.append(emoji);
        }
        this.chat_space.toggle_voice_clip_icon && this.chat_space.toggle_voice_clip_icon();
      }
    } else if (this.mode === "reaction") {
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

    const anchorOffset = this.anchor.offset();
    const anchorH = this.anchor.outerHeight();
    const panelH = 380; // approximate picker height
    const panelW = 320;
    const windowH = $(window).height();
    const windowW = $(window).width();

    let top = anchorOffset.top - panelH - 8;
    let left = anchorOffset.left;

    // Flip down if not enough room above
    if (top < 8) top = anchorOffset.top + anchorH + 8;
    // Clamp right edge
    if (left + panelW > windowW - 8) left = windowW - panelW - 8;
    if (left < 8) left = 8;

    this.$panel.css({ top, left });
  }

  // ── Event bindings ───────────────────────────────────────────────────────────
  _bind_events() {
    const me = this;

    // Category nav
    this.$panel.on("click", ".cc-ep-nav-btn", function() {
      const catId = $(this).data("cat");
      me._show_category(catId);
    });

    // Search input
    this.$panel.on("input", ".cc-ep-search", function() {
      const val = $(this).val();
      clearTimeout(me.search_debounce);
      me.search_debounce = setTimeout(() => me._search(val), 200);
    });

    // Close on outside click
    this._close_handler = (e) => {
      if (!$(e.target).closest(".cc-emoji-picker, .cc-ep-trigger, .open-full-emoji-picker").length) {
        me.close();
      }
    };
    setTimeout(() => $(document).on("click.emoji_picker", this._close_handler), 100);

    // Close on Escape
    $(document).on("keydown.emoji_picker", (e) => {
      if (e.key === "Escape") me.close();
    });
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
